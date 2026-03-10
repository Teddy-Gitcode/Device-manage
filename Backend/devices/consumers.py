"""
WebSocket consumers for real-time printer status updates.
Supports token authentication via ?token=<key> query string.
"""
import json
import logging
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
        """Receive message from group and send to WebSocket as JSON."""
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def _get_user_from_token(self, token_key: str):
        from rest_framework.authtoken.models import Token
        try:
            token = Token.objects.select_related('user').get(key=token_key)
            return token.user
        except Token.DoesNotExist:
            return None
