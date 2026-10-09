"""Explicit, admin-only setup for the shared bot; no network calls on import."""

import requests


class WebhookSetupError(RuntimeError):
    pass


class WebhookConflict(RuntimeError):
    pass


class PartnerWebhookManager:
    def __init__(self, config, post=None):
        self.config = config
        self.post = post or requests.post
        self.target = config.public_origin.rstrip('/') + '/api/partners/webhook'

    def call(self, method, payload=None):
        try:
            response = self.post(
                'https://api.telegram.org/bot' + self.config.token + '/' + method,
                json=payload or {}, timeout=(3, 7), allow_redirects=False,
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict) or data.get('ok') is not True:
                raise ValueError()
            return data['result']
        except (requests.RequestException, ValueError, KeyError, TypeError):
            # Never expose Telegram URLs, token, secret or raw upstream errors.
            raise WebhookSetupError('Telegram недоступен или отклонил запрос. Проверьте токен и повторите проверку.') from None

    def verify_bot(self):
        bot = self.call('getMe')
        if (not isinstance(bot, dict) or bot.get('is_bot') is not True
                or str(bot.get('id')) != self.config.bot_id
                or str(bot.get('username', '')).lower() != self.config.username.lower()):
            raise WebhookSetupError('Токен и имя бота в настройках не совпадают.')

    def status(self):
        self.verify_bot()
        info = self.call('getWebhookInfo')
        if not isinstance(info, dict) or not isinstance(info.get('url'), str):
            raise WebhookSetupError('Telegram вернул некорректный статус. Повторите проверку.')
        url = info['url']
        pending = info.get('pending_update_count', 0)
        error_date = info.get('last_error_date')
        return {
            'username': self.config.username,
            'state': 'not_set' if not url else 'configured' if url == self.target else 'other',
            'expected_url': self.target,
            'pending_updates': pending if type(pending) is int and pending >= 0 else 0,
            'delivery_error': bool(info.get('last_error_message')),
            'last_error_at': error_date if type(error_date) is int else None,
        }

    def connect(self):
        before = self.status()
        if before['state'] == 'other':
            raise WebhookConflict('У бота установлен другой webhook. Автоматическая замена запрещена.')
        # Reapply our secret even if the URL matches; do not discard pending updates.
        if self.call('setWebhook', {
            'url': self.target, 'secret_token': self.config.webhook_secret,
            'allowed_updates': ['message'], 'drop_pending_updates': False,
        }) is not True:
            raise WebhookSetupError('Telegram не подтвердил подключение. Повторите проверку.')
        after = self.status()
        if after['state'] != 'configured':
            raise WebhookSetupError('Подключение не подтверждено. Повторите проверку.')
        return after
