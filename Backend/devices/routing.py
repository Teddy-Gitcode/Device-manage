"""
WebSocket URL routing for the devices app.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/printers/$", consumers.PrinterStatusConsumer.as_asgi()),
]
