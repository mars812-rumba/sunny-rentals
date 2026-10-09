"""Opt-in shared park bot. No webhook registration or polling on import."""

import hmac
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer
from pydantic import BaseModel, constr
from platform_core.pydantic_compat import pattern_string

from platform_core.admin_auth import PlatformAdminAuth
from platform_core.partner_bot import (
    PartnerBotConfig, PartnerBotError, PartnerBotService,
    PartnerDeliveryError, TelegramPartnerTransport,
)
from platform_core.telegram_identity import TelegramIdentityError
from platform_core.park_bookings import ParkBookingService, ParkQuoteRequest, ParkBookingRequest, BookingConflict, ParkStatusRequest, ParkOwnerStatusRequest


class InvitationRequest(BaseModel):
    expected_user_id: pattern_string(r'^[1-9][0-9]{0,19}$') = None


class PartnerIdentityRequest(BaseModel):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)


def create_platform_partner_router(service: PartnerBotService, admin_auth: PlatformAdminAuth):
    def private_response(response: Response):
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['Referrer-Policy'] = 'no-referrer'
    router = APIRouter(prefix='/api/partners', tags=['park-bot'], dependencies=[Depends(private_response)])
    bearer = HTTPBearer(auto_error=False)
    bookings = ParkBookingService(service)

    def require_admin(credentials=Depends(bearer)):
        try:
            if credentials is None or credentials.scheme.lower() != 'bearer':
                raise PermissionError()
            return admin_auth.verify(credentials.credentials)
        except (PermissionError, ValueError):
            raise HTTPException(401, 'Platform admin authorization required') from None

    @router.get('/parks/{tenant_id}/bot-link')
    def bot_link(tenant_id: str):
        try:
            return {'url': service.client_link(tenant_id)}
        except (PartnerBotError, ValueError):
            raise HTTPException(404, 'Park unavailable') from None

    def booking_result(call):
        try:
            return call()
        except (PartnerBotError, TelegramIdentityError, PermissionError):
            raise HTTPException(403, 'Park Telegram authorization required') from None
        except BookingConflict as error:
            raise HTTPException(409, str(error)) from None
        except ValueError as error:
            raise HTTPException(422, str(error)) from None

    @router.post('/bookings/quote')
    def quote(request: ParkQuoteRequest):
        return booking_result(lambda: bookings.quote(request))

    @router.post('/bookings', status_code=201)
    def create_booking(request: ParkBookingRequest):
        return {'booking': booking_result(lambda: bookings.create(request))}

    @router.post('/calendar')
    def owner_calendar(request: PartnerIdentityRequest):
        return {'bookings': booking_result(lambda: bookings.calendar(request.tenant_id, request.init_data))}

    @router.get('/parks/{tenant_id}/calendar')
    def admin_calendar(tenant_id: str, context=Depends(require_admin)):
        return {'bookings': booking_result(lambda: bookings.calendar(tenant_id, admin=context))}

    @router.post('/bookings/status')
    def owner_booking_status(request: ParkOwnerStatusRequest):
        return {'booking': booking_result(lambda: bookings.change_status(request.tenant_id, request.booking_id, request, init_data=request.init_data))}

    @router.patch('/parks/{tenant_id}/bookings/{booking_id}/status')
    def admin_booking_status(tenant_id: str, booking_id: str, request: ParkStatusRequest, context=Depends(require_admin)):
        return {'booking': booking_result(lambda: bookings.change_status(tenant_id, booking_id, request, admin=context))}

    @router.post('/parks/{tenant_id}/owner-invitations')
    def invite(tenant_id: str, request: InvitationRequest, context=Depends(require_admin)):
        try:
            return service.invite(context, tenant_id, request.expected_user_id)
        except (PartnerBotError, ValueError):
            raise HTTPException(404, 'Park unavailable') from None
        except PartnerDeliveryError:
            raise HTTPException(503, 'Onboarding temporarily unavailable') from None

    @router.post('/identity')
    def identity(request: PartnerIdentityRequest):
        try:
            linked, context = service.resolve_identity(request.tenant_id, request.init_data)
            # Client cannot choose roles, supply chat_id, or see another user.
            return {'tenant_id': context.tenant_id, 'actor_id': context.actor_id,
                    'user_id': linked.user_id, 'telegram_linked': True,
                    'role': 'owner' if 'owner' in context.roles else 'customer'}
        except (PartnerBotError, TelegramIdentityError, ValueError):
            raise HTTPException(403, 'Open this park in Telegram with a valid account') from None

    @router.delete('/parks/{tenant_id}/owner-invitations/{invitation_id}')
    def revoke_invitation(tenant_id: str, invitation_id: str, context=Depends(require_admin)):
        try:
            service.revoke_invite(context, tenant_id, invitation_id)
            return {'revoked': True}
        except (PartnerBotError, ValueError):
            raise HTTPException(404, 'Invitation unavailable') from None

    @router.delete('/parks/{tenant_id}/owners/{user_id}')
    def revoke_owner(tenant_id: str, user_id: str, context=Depends(require_admin)):
        try:
            service.revoke_owner(context, tenant_id, user_id)
            return {'revoked': True}
        except (PartnerBotError, ValueError):
            raise HTTPException(404, 'Owner unavailable') from None

    @router.post('/webhook')
    async def webhook(request: Request):
        received = request.headers.get('x-telegram-bot-api-secret-token', '')
        if not hmac.compare_digest(received.encode(), service.config.webhook_secret.encode()):
            raise HTTPException(403, 'Invalid webhook authorization')
        # Bound the streamed body too, not only the untrusted Content-Length.
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 65536:
                raise HTTPException(413, 'Update too large')
        try:
            update = json.loads(body)
            if not isinstance(update, dict):
                raise ValueError()
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(400, 'Invalid update') from None
        from starlette.concurrency import run_in_threadpool
        try:
            return await run_in_threadpool(service.handle_update, update)
        except ValueError:
            raise HTTPException(400, 'Invalid update') from None
        except PartnerDeliveryError:
            # Telegram retries; reply remains pending. Do not expose secret URLs.
            raise HTTPException(503, 'Telegram delivery temporarily unavailable') from None

    return router


def mount_platform_partner_api(app, storage_root: Path, environ=None):
    values = os.environ if environ is None else environ
    if values.get('PLATFORM_PARTNERS_BOT_ENABLED', 'false').strip().lower() != 'true':
        return False
    config = PartnerBotConfig.from_env(values)
    # Explicit opt-in fails closed if credentials or admin authorization are missing.
    service = PartnerBotService(storage_root, config, TelegramPartnerTransport(config))
    app.include_router(create_platform_partner_router(service, PlatformAdminAuth.from_env(values)))
    return True
