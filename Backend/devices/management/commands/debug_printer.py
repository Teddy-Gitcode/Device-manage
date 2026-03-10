import asyncio
from django.core.management.base import BaseCommand
from pysnmp.hlapi.v3arch.asyncio import *

class Command(BaseCommand):
    help = 'Detailed diagnostics for a single printer IP'

    def add_arguments(self, parser):
        parser.add_argument('ip', type=str, help='The IP address to debug')

    def handle(self, *args, **kwargs):
        ip = kwargs['ip']
        self.stdout.write(f"🔍 Starting diagnostics for {ip}...\n")
        asyncio.run(self.run_diagnostics(ip))

    async def run_diagnostics(self, ip):
        snmp_engine = SnmpEngine()
        
        # TEST 1: NETWORK REACHABILITY (Basic SNMP Ping)
        self.stdout.write("Test 1: Connecting to SNMP (public@161)... ", ending="")
        try:
            # We fetch sysDescr (1.3.6.1.2.1.1.1.0) as a "Are you there?" check
            target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
            errorIndication, errorStatus, _, varBinds = await get_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                target,
                ContextData(),
                ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0"))
            )
            
            if errorIndication:
                self.stdout.write(self.style.ERROR(f"FAILED\n   ❌ Connection Error: {errorIndication}"))
                self.stdout.write("   -> Check VPN, Firewall, or if printer IP changed.")
                return
            elif errorStatus:
                self.stdout.write(self.style.ERROR(f"FAILED\n   ❌ Device refused SNMP: {errorStatus.prettyPrint()}"))
                return
            else:
                self.stdout.write(self.style.SUCCESS("PASS"))
                self.stdout.write(f"   ℹ️  Device: {varBinds[0][1]}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"CRASH: {e}"))
            return

        # TEST 2: PRINTER CHECK (Page Count)
        self.stdout.write("\nTest 2: Verifying it is a Printer... ", ending="")
        try:
            # Page Count OID
            errorIndication, _, _, varBinds = await get_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                target,
                ContextData(),
                ObjectType(ObjectIdentity("1.3.6.1.2.1.43.10.2.1.4.1.1"))
            )
            if varBinds:
                self.stdout.write(self.style.SUCCESS(f"PASS (Pages: {varBinds[0][1]})"))
            else:
                self.stdout.write(self.style.WARNING("FAIL"))
                self.stdout.write("   ⚠️  Device is online but has no Page Count. Is it a Router or Switch?")
        except:
            self.stdout.write("FAIL")

        snmp_engine.close_dispatcher()
        self.stdout.write("\n✅ Diagnostics Complete.")