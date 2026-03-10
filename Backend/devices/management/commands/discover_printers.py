import asyncio
from django.core.management.base import BaseCommand
from pysnmp.hlapi.v3arch.asyncio import *
from devices.models import Printer

# --- CONFIGURATION ---
# Base prefix for discovery. The command will scan the entire 192.168.x.x space
# so that printers on other VLANs/subnets (e.g. 192.168.1.x, 192.168.30.x, etc.)
# are also discovered, not just a single /24.
SUBNET_PREFIX = "192.168"     # Base prefix (will scan 192.168.0.0/16)
SCAN_TIMEOUT = 0.5            # Fast timeout for discovery
CONCURRENT_LIMIT = 50         # Scan more IPs in parallel

# --- OIDs ---
OID_SYS_DESCR   = "1.3.6.1.2.1.1.1.0"           # Model Info
OID_SYS_NAME    = "1.3.6.1.2.1.1.5.0"           # Hostname
OID_PAGE_COUNT  = "1.3.6.1.2.1.43.10.2.1.4.1.1" # Confirms it is a printer

class Command(BaseCommand):
    help = 'Scans the subnet for new printers and adds them to the database'

    def handle(self, *args, **kwargs):
        self.stdout.write(f"Starting discovery on {SUBNET_PREFIX}.0.0/16 ...")
        asyncio.run(self.run_discovery())

    async def run_discovery(self):
        snmp_engine = SnmpEngine()
        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
        
        tasks = []
        # Scan 192.168.0.1 – 192.168.255.254
        for third in range(0, 256):
            for host in range(1, 255):
                ip = f"{SUBNET_PREFIX}.{third}.{host}"
                tasks.append(self.check_host(semaphore, snmp_engine, ip))

        await asyncio.gather(*tasks)
        snmp_engine.close_dispatcher()
        self.stdout.write(self.style.SUCCESS("\nDiscovery Complete."))

    async def get_snmp_value(self, snmp_engine, ip, oid):
        """Helper to fetch a single value quickly"""
        try:
            target = await UdpTransportTarget.create((ip, 161), timeout=SCAN_TIMEOUT, retries=0)
            errorIndication, errorStatus, _, varBinds = await get_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                target,
                ContextData(),
                ObjectType(ObjectIdentity(oid))
            )
            if not errorIndication and not errorStatus:
                return str(varBinds[0][1])
        except Exception:
            pass
        return None

    async def check_host(self, semaphore, snmp_engine, ip):
        async with semaphore:
            # 1. Quick Check: Does it have a System Description?
            # We use a very short timeout here to skip empty IPs fast
            model_desc = await self.get_snmp_value(snmp_engine, ip, OID_SYS_DESCR)
            
            if model_desc:
                # 2. Validation: Is it a printer? (Does it have a page count?)
                # Some routers allow SNMP but don't have page counts. We skip them.
                page_check = await self.get_snmp_value(snmp_engine, ip, OID_PAGE_COUNT)
                
                if page_check:
                    # It's a printer! Get its name.
                    sys_name = await self.get_snmp_value(snmp_engine, ip, OID_SYS_NAME) or f"Printer {ip}"
                    
                    # Clean up the model name (sometimes it's very long)
                    clean_model = model_desc.split(',')[0][:50] 

                    # 3. Add to Database
                    # get_or_create prevents duplicates if you run this multiple times
                    printer_obj, created = await Printer.objects.aget_or_create(
                        ip_address=ip,
                        defaults={
                            'name': sys_name,
                            'model_name': clean_model,
                            'location': 'Auto-Discovered',
                            'active': True
                        }
                    )

                    if created:
                        self.stdout.write(self.style.SUCCESS(f"[+] Added: {ip} ({clean_model})"))
                    else:
                        self.stdout.write(f"[*] Exists: {ip}")