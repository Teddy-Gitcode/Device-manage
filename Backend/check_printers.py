import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'printer.settings')
django.setup()

from devices.models import Printer

print("\n=== SNMP Configuration ===")
print(f"SNMP Community: {os.environ.get('SNMP_COMMUNITY', 'public')}")
print(f"SNMP Timeout: {os.environ.get('SNMP_TIMEOUT', '3.0')}s")
print(f"Subnet Prefix: {os.environ.get('SUBNET_PREFIX', '192.168')}")

print("\n=== Printer Count ===")
total = Printer.objects.count()
active = Printer.objects.filter(active=True).count()
print(f"Total printers in DB: {total}")
print(f"Active printers: {active}")

print("\n=== Sample Printers (first 10) ===")
for p in Printer.objects.all()[:10]:
    health_str = {2: 'Running', 3: 'Warning', 5: 'Down'}.get(p.device_health, 'Unknown')
    print(f"  {p.ip_address} - {p.name} - Active: {p.active} - Health: {health_str}")

print("\n=== Health Summary ===")
running = Printer.objects.filter(device_health=2).count()
warning = Printer.objects.filter(device_health=3).count()
down = Printer.objects.filter(device_health=5).count()
unknown = Printer.objects.filter(device_health__isnull=True).count()
print(f"Running (2): {running}")
print(f"Warning (3): {warning}")
print(f"Down (5): {down}")
print(f"Unknown: {unknown}")
