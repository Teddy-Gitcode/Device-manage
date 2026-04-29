"""
WebSocket consumers for real-time printer status updates.
Supports token authentication via ?token=<key> query string.
"""
import json
import logging
import uuid
from datetime import datetime, timezone as dt_timezone
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class PrinterStatusConsumer(AsyncWebsocketConsumer):
    """Consumes messages from the printers_status group and forwards to WebSocket."""

    async def connect(self):
        # Authenticate via query string token: ws://host/ws/printers/?token=xxx
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_key = params.get('token', [None])[0]

        if token_key:
            user = await self._get_user_from_token(token_key)
            if user is None:
                logger.warning("WebSocket rejected: invalid token")
                await self.close(code=4001)
                return
            self.scope['user'] = user
        else:
            logger.warning("WebSocket rejected: no token provided")
            await self.close(code=4001)
            return

        self.group_name = "printers_status"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("WebSocket connected to printers_status group (user: %s)", self.scope['user'])

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.debug("WebSocket disconnected from printers_status group")

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def printer_status_update(self, event):
        """Transform backend event dict into the PrinterEvent shape the frontend expects."""
        _TYPE_MAP = {
            "paper_jam":     "jam",
            "cover_open":    "cover_open",
            "running":       "online",
            "printing":      "info",
            "warming_up":    "info",
            "status_change": "info",
            "critical_down": "offline",
        }
        _LEVEL_MAP = {
            "paper_jam":     "critical",
            "cover_open":    "warning",
            "running":       "ok",
            "printing":      "info",
            "warming_up":    "info",
            "status_change": "info",
            "critical_down": "critical",
        }

        backend_event   = event.get("event", "status_change")
        alert_messages  = event.get("alert_messages", [])
        event_label     = event.get("event_label", "Status updated")
        message         = alert_messages[0] if alert_messages else event_label
        timestamp       = event.get("last_polled_at") or datetime.now(dt_timezone.utc).isoformat()

        payload = {
            "id":             str(uuid.uuid4()),
            "deviceId":       str(event.get("printer_id", "")),
            "deviceName":     event.get("printer_name", "Unknown"),
            "type":           _TYPE_MAP.get(backend_event, "info"),
            "level":          _LEVEL_MAP.get(backend_event, "info"),
            "message":        message,
            "timestamp":      timestamp,
            "alert_messages": alert_messages,
        }
        await self.send(text_data=json.dumps(payload))

    @database_sync_to_async
    def _get_user_from_token(self, token_key: str):
        from rest_framework.authtoken.models import Token
        try:
            token = Token.objects.select_related('user').get(key=token_key)
            return token.user
        except Token.DoesNotExist:
            return None
