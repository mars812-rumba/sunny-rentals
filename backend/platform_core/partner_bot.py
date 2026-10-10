"""Tenant-scoped onboarding for one shared bot, independent of the Sunny bot.

Invites, memberships and processed updates commit in one control-plane write.
Delivery is at-least-once: an ambiguous Telegram timeout can duplicate a reply,
but never a membership. No calendar/CRM/AI operation is performed here.
"""

import hashlib
import re
import secrets
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping
from urllib.parse import urlsplit

import requests

from .context import TenantContext, validate_tenant_id
from .models import Membership, MembershipRole, TenantStatus
from .partner_contracts import PartnerIdentity, PartnerInvitation, PartnerReply
from .provisioning import TenantProvisioner
from .telegram_identity import TelegramInitDataVerifier


class PartnerBotError(PermissionError):
    pass


class PartnerDeliveryError(RuntimeError):
    pass


@dataclass(frozen=True, repr=False)
class PartnerBotConfig:
    token: str
    username: str
    webhook_secret: str
    public_origin: str

    def __post_init__(self):
        if not re.fullmatch(r'[1-9][0-9]*:[A-Za-z0-9_-]{20,}', self.token):
            raise ValueError('PLATFORM_PARTNERS_BOT_TOKEN is missing or invalid')
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{4,31}', self.username):
            raise ValueError('PLATFORM_BOT_NAME must be the bot username, not its display name')
        if not re.fullmatch(r'[A-Za-z0-9_-]{32,256}', self.webhook_secret):
            raise ValueError('PLATFORM_PARTNERS_WEBHOOK_SECRET must be a random value of 32..256 characters')
        origin = urlsplit(self.public_origin)
        if origin.scheme != 'https' or not origin.hostname or origin.username or origin.password or origin.path not in ('', '/') or origin.query or origin.fragment:
            raise ValueError('PLATFORM_PARTNERS_PUBLIC_ORIGIN must be an HTTPS origin')

    @property
    def bot_id(self):
        return self.token.split(':', 1)[0]

    @classmethod
    def from_env(cls, values: Mapping[str, str]):
        return cls(
            values.get('PLATFORM_PARTNERS_BOT_TOKEN', '').strip(),
            values.get('PLATFORM_BOT_NAME', '').strip().lstrip('@'),
            values.get('PLATFORM_PARTNERS_WEBHOOK_SECRET', '').strip(),
            values.get('PLATFORM_PARTNERS_PUBLIC_ORIGIN', 'https://sunny-rentals.online').rstrip('/'),
        )


class TelegramPartnerTransport:
    def __init__(self, config: PartnerBotConfig):
        self.config = config

    def send(self, payload):
        # Do not propagate request exceptions: they may include the secret URL.
        try:
            response = requests.post(
                f'https://api.telegram.org/bot{self.config.token}/sendMessage',
                json=payload, timeout=(3, 7),
            )
            if response.status_code != 200 or response.json().get('ok') is not True:
                raise PartnerDeliveryError('Telegram delivery failed')
        except (requests.RequestException, ValueError):
            raise PartnerDeliveryError('Telegram delivery failed') from None


class PartnerBotService:
    INVITATION_TTL = 24 * 60 * 60

    def __init__(self, root: Path, config: PartnerBotConfig, transport, clock: Callable = time.time):
        self.provisioner = TenantProvisioner(root)
        self.config = config
        self.transport = transport
        self.clock = clock
        self.verifier = TelegramInitDataVerifier(config.token, clock=clock)

    def actor_id(self, user_id):
        return f'telegram:{self.config.bot_id}:{user_id}'

    def identity_key(self, tenant_id, user_id):
        return f'{self.config.bot_id}:{tenant_id}:{user_id}'

    @staticmethod
    def tenant(state, tenant_id, public=False):
        tenant_id = validate_tenant_id(tenant_id)
        tenant = next((t for t in state.tenants if t.tenant_id == tenant_id and t.archived_at is None), None)
        allowed = (TenantStatus.TRIAL, TenantStatus.ACTIVE) if public else (TenantStatus.DRAFT, TenantStatus.TRIAL, TenantStatus.ACTIVE)
        if tenant is None or tenant.status not in allowed:
            raise PartnerBotError('Park is unavailable')
        return tenant

    def client_link(self, tenant_id):
        state = self.provisioner._load_state()
        self.tenant(state, tenant_id, public=True)
        # p + a maximum 63-character tenant ID fits Telegram's 64-char limit.
        return f'https://t.me/{self.config.username}?start=p{tenant_id}'

    def invite(self, context, tenant_id, expected_user_id=None):
        context.require_platform_admin()
        if expected_user_id is not None and not re.fullmatch(r'[1-9][0-9]{0,19}', expected_user_id):
            raise ValueError('Invalid expected Telegram user ID')
        code = 'i_' + secrets.token_urlsafe(32)
        digest = hashlib.sha256(code.encode()).hexdigest()
        with self.provisioner._locked():
            state = self.provisioner._load_state()
            self.tenant(state, tenant_id)
            self._prune(state)
            state.partner_bot.invitations[digest] = PartnerInvitation(
                bot_id=self.config.bot_id, tenant_id=tenant_id,
                expires_at=int(self.clock()) + self.INVITATION_TTL, created_by=context.actor_id,
                expected_user_id=expected_user_id,
            )
            self.provisioner._save_state(state)
        return {'invitation_id': digest, 'url': f'https://t.me/{self.config.username}?start={code}', 'expires_in': self.INVITATION_TTL}

    def revoke_invite(self, context, tenant_id, invitation_id):
        context.require_platform_admin()
        with self.provisioner._locked():
            state = self.provisioner._load_state()
            self.tenant(state, tenant_id)
            invite = state.partner_bot.invitations.get(invitation_id)
            if invite is None or invite.bot_id != self.config.bot_id or invite.tenant_id != tenant_id:
                raise PartnerBotError('Invitation not found')
            del state.partner_bot.invitations[invitation_id]
            self.provisioner._save_state(state)

    def revoke_owner(self, context, tenant_id, user_id):
        context.require_platform_admin()
        with self.provisioner._locked():
            state = self.provisioner._load_state()
            self.tenant(state, tenant_id)
            member = next((m for m in state.memberships if m.tenant_id == tenant_id and m.user_id == self.actor_id(user_id) and m.role == MembershipRole.OWNER), None)
            if member is None:
                raise PartnerBotError('Owner not found')
            member.active = False
            self.provisioner._save_state(state)

    def _prune(self, state):
        now = int(self.clock())
        # A consumed invite is only a shortcut for its existing, active owner.
        # Retain it after activation expiry; it can never issue rights again.
        state.partner_bot.invitations = {k: v for k, v in state.partner_bot.invitations.items()
            if v.expires_at > now or (v.bot_id == self.config.bot_id and v.used_by is not None
                and self._active_owner(state, v.tenant_id, v.used_by))}
        state.partner_bot.replies = {k: v for k, v in state.partner_bot.replies.items() if not v.sent or v.created_at > now - 172800}
        if len(state.partner_bot.replies) >= 10000 or len(state.partner_bot.invitations) >= 1000:
            raise PartnerDeliveryError('Onboarding backlog limit reached')

    def _active_owner(self, state, tenant_id, user_id):
        return any(m.tenant_id == tenant_id and m.user_id == self.actor_id(user_id)
            and m.active and m.archived_at is None and m.role == MembershipRole.OWNER
            for m in state.memberships)

    def resolve_identity(self, tenant_id, init_data, require_owner=False):
        user = self.verifier.verify(init_data)
        user_id = str(user['id'])
        state = self.provisioner._load_state()
        self.tenant(state, tenant_id)
        identity = state.partner_bot.identities.get(self.identity_key(tenant_id, user_id))
        if (identity is None or identity.bot_id != self.config.bot_id
                or identity.tenant_id != tenant_id or identity.user_id != user_id
                or identity.chat_id != user_id):
            raise PartnerBotError('Open this park in the bot first')
        actor = self.actor_id(user_id)
        owner = any(m.tenant_id == tenant_id and m.user_id == actor and m.active and m.archived_at is None and m.role == MembershipRole.OWNER for m in state.memberships)
        if require_owner and not owner:
            raise PartnerBotError('Park owner access required')
        if not owner:
            self.tenant(state, tenant_id, public=True)
        return identity, TenantContext(tenant_id=tenant_id, actor_id=actor, roles=frozenset({'owner'} if owner else {'customer'}))

    def _reply(self, state, message):
        chat, user = message.get('chat', {}), message.get('from', {})
        if not isinstance(chat, dict) or not isinstance(user, dict):
            return {}
        # Never pair memberships from forwarded messages, groups or bots.
        if chat.get('type') != 'private' or user.get('is_bot') is not False:
            return {}
        if (type(user.get('id')) is not int or user['id'] <= 0
                or type(chat.get('id')) is not int or chat['id'] != user['id']):
            return {}
        user_id = str(user['id'])
        words = str(message.get('text', '')).split()
        if not words or words[0] not in ('/start', '/help', f'/start@{self.config.username}'):
            return {'chat_id': chat['id'], 'text': 'Диалоги с менеджером пока не подключены. Откройте витрину через /start.'}
        parameter = words[1] if len(words) == 2 else ''
        payload = {'chat_id': chat['id'], 'text': 'Откройте ссылку нужного парка. Если вы владелец — используйте личное приглашение администратора.'}
        if not parameter or len(parameter) > 64:
            return payload
        owner_invite = None
        returning_owner = False
        if parameter.startswith('i_'):
            owner_invite = state.partner_bot.invitations.get(hashlib.sha256(parameter.encode()).hexdigest())
            if owner_invite is not None and owner_invite.used_by == user_id:
                returning_owner = self._active_owner(state, owner_invite.tenant_id, user_id)
            if (owner_invite is None or owner_invite.bot_id != self.config.bot_id
                    or owner_invite.expected_user_id not in (None, user_id)
                    or (owner_invite.used_by is not None and not returning_owner)
                    or (owner_invite.used_by is None and owner_invite.expires_at <= int(self.clock()))):
                payload['text'] = 'Приглашение недействительно, истекло или уже использовано. Запросите новое у администратора.'
                return payload
            tenant_id = owner_invite.tenant_id
        elif parameter.startswith('p'):
            tenant_id = parameter[1:]
        else:
            return payload
        try:
            tenant = self.tenant(state, tenant_id, public=owner_invite is None)
        except (PartnerBotError, ValueError):
            payload['text'] = 'Парк сейчас недоступен. Уточните ссылку у проката.'
            return payload
        if owner_invite is not None and not returning_owner:
            owner_invite.used_by = user_id
            actor = self.actor_id(user_id)
            member = next((m for m in state.memberships if m.tenant_id == tenant_id and m.user_id == actor and m.role == MembershipRole.OWNER), None)
            if member:
                member.active = True
                member.archived_at = None
            else:
                state.memberships.append(Membership(tenant_id=tenant_id, user_id=actor, role=MembershipRole.OWNER))
        identity = PartnerIdentity(
            bot_id=self.config.bot_id, tenant_id=tenant_id, user_id=user_id, chat_id=str(chat['id']),
            username=str(user.get('username', ''))[:64] or None,
            first_name=str(user.get('first_name', ''))[:120] or None,
        )
        state.partner_bot.identities[self.identity_key(tenant_id, user_id)] = identity
        payload['text'] = (f'Доступ владельца к парку «{tenant.name}» подключён. Откройте витрину: после проверки Telegram там доступен календарный список заявок.' if owner_invite else f'Добро пожаловать в «{tenant.name}»! Посмотрите доступный транспорт на витрине.')
        payload['reply_markup'] = {'inline_keyboard': [[{'text': 'Открыть витрину', 'web_app': {'url': f'{self.config.public_origin}/p/{tenant_id}'}}]]}
        if tenant.status == TenantStatus.DRAFT:
            # Drafts require a superadmin preview; no invalid public link.
            payload.pop('reply_markup')
        return payload

    def handle_update(self, update):
        update_id = update.get('update_id')
        if type(update_id) is not int or update_id < 0:
            raise ValueError('Invalid update ID')
        key = f'{self.config.bot_id}:{update_id}'
        with self.provisioner._locked():
            state = self.provisioner._load_state()
            reply = state.partner_bot.replies.get(key)
            if reply is None:
                self._prune(state)
                message = update.get('message')
                payload = self._reply(state, message) if isinstance(message, dict) else {}
                reply = PartnerReply(created_at=int(self.clock()), payload=payload, sent=not bool(payload))
                state.partner_bot.replies[key] = reply
                self.provisioner._save_state(state)
            if not reply.sent:
                # Serialized delivery prevents concurrent duplicate sends. On a
                # timeout webhook retries the same persisted reply, not the invite.
                self.transport.send(reply.payload)
                reply.sent = True
                self.provisioner._save_state(state)
        return {'ok': True}
