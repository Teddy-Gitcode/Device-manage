from django.apps import AppConfig


class DevicesConfig(AppConfig):
    name = 'devices'
    
    def ready(self):
        """Import signals when the app is ready."""
        import devices.signals
