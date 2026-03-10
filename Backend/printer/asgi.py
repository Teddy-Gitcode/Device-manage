"""
ASGI config for printer project.
"""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

from devices.routing import websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "printer.settings")

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # No AllowedHostsOriginValidator — token auth is handled in the consumer itself
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
