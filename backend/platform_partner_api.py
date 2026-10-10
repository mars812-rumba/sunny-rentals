"""Opt-in shared park bot. No webhook registration or polling on import."""

import hmac
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from fastapi.security import HTTPBearer
from pydantic import BaseModel, constr
from platform_core.pydantic_compat import pattern_string

from platform_core.admin_auth import PlatformAdminAuth
from platform_core.partner_bot import (
    PartnerBotConfig, PartnerBotError, PartnerBotService,
    PartnerDeliveryError, TelegramPartnerTransport,
)
from platform_core.telegram_identity import TelegramIdentityError
from platform_core.asset_admin import AssetInput, TenantAssetAdmin, MAX_IMAGE_BYTES
from platform_core.provisioning import TenantNotFoundError
from platform_core.partner_webhook import PartnerWebhookManager, WebhookSetupError, WebhookConflict
from platform_core.park_bookings import ParkBookingService, ParkQuoteRequest, ParkBookingRequest, BookingConflict, ParkStatusRequest, ParkOwnerStatusRequest, ParkAvailabilityRequest


class InvitationRequest(BaseModel):
    expected_user_id: pattern_string(r'^[1-9][0-9]{0,19}$') = None


class PartnerIdentityRequest(BaseModel):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)

    class Config:
        extra = 'forbid'


class OwnerAssetRequest(PartnerIdentityRequest):
    asset_id: pattern_string(r'^[a-f0-9]{32}$') = None
    data: AssetInput


class OwnerAssetTarget(PartnerIdentityRequest):
    asset_id: pattern_string(r'^[a-f0-9]{32}$')


class OwnerMediaRequest(PartnerIdentityRequest):
    reference: constr(min_length=1, max_length=200)


def create_platform_partner_router(service: PartnerBotService, admin_auth: PlatformAdminAuth, webhook_manager=None):
    def private_response(response: Response):
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['Referrer-Policy'] = 'no-referrer'
    router = APIRouter(prefix='/api/partners', tags=['park-bot'], dependencies=[Depends(private_response)])
    bearer = HTTPBearer(auto_error=False)
    bookings = ParkBookingService(service)
    webhooks = webhook_manager or PartnerWebhookManager(service.config)

    def require_admin(credentials=Depends(bearer)):
        try:
            if credentials is None or credentials.scheme.lower() != 'bearer':
                raise PermissionError()
            return admin_auth.verify(credentials.credentials)
        except (PermissionError, ValueError):
            raise HTTPException(401, 'Platform admin authorization required') from None

    def webhook_result(action):
        try:
            return action()
        except WebhookConflict as error:
            raise HTTPException(409, str(error)) from None
        except WebhookSetupError as error:
            raise HTTPException(503, str(error)) from None

    @router.get('/admin/webhook')
    def webhook_status(context=Depends(require_admin)):
        return webhook_result(webhooks.status)

    @router.post('/admin/webhook/connect')
    def webhook_connect(context=Depends(require_admin)):
        return webhook_result(webhooks.connect)

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

    @router.post('/parks/{tenant_id}/availability')
    def availability(tenant_id: str, request: ParkAvailabilityRequest):
        try:
            return bookings.availability(tenant_id, request)
        except PartnerBotError:
            raise HTTPException(404, 'Park unavailable') from None
        except ValueError:
            raise HTTPException(422, 'Choose valid dates for this park') from None

    def owner_asset_call(request, action):
        try:
            return action(TenantAssetAdmin.for_owner(service, request.tenant_id, request.init_data))
        except (PartnerBotError, TelegramIdentityError, PermissionError):
            raise HTTPException(403, 'Park owner authorization required') from None
        except TenantNotFoundError:
            raise HTTPException(404, 'Vehicle or media not found') from None
        except ValueError:
            raise HTTPException(422, 'Check vehicle fields or image') from None
        except FileNotFoundError:
            raise HTTPException(503, 'Image processing unavailable') from None

    @router.post('/fleet/list')
    def owner_fleet(request: PartnerIdentityRequest):
        return owner_asset_call(request, lambda assets: {'tenant': assets.tenant, 'assets': assets.list()})

    @router.post('/fleet/save')
    def owner_save_asset(request: OwnerAssetRequest):
        return owner_asset_call(request, lambda assets: {'asset': assets.save(request.data, request.asset_id)})

    @router.post('/fleet/archive')
    def owner_archive_asset(request: OwnerAssetTarget):
        def archive(assets):
            assets.archive(request.asset_id)
            return {'archived': True}
        return owner_asset_call(request, archive)

    @router.post('/fleet/media')
    def owner_media(request: OwnerMediaRequest):
        return owner_asset_call(request, lambda assets: FileResponse(assets.media_path(request.reference),
            media_type='image/webp', headers={'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}))

    @router.post('/fleet/photo')
    async def owner_photo(tenant_id: str = Form(..., max_length=63), init_data: str = Form(..., max_length=8192),
                          asset_id: str = Form(..., max_length=32), file: UploadFile = File(...)):
        request = PartnerIdentityRequest(tenant_id=tenant_id, init_data=init_data)
        try:
            owner_asset_call(request, lambda assets: True)
            content = await file.read(MAX_IMAGE_BYTES + 1)
        finally:
            await file.close()
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(413, 'Image exceeds 8 MB')
        return await run_in_threadpool(owner_asset_call, request,
            lambda assets: {'asset': assets.upload_photo(asset_id, content)})

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
