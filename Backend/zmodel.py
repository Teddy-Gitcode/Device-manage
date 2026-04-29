import asyncio
from pysnmp.hlapi.v3arch.asyncio import *

# --- CONFIGURATION ---
SUBNET_PREFIX = "192.168."   # Change to your subnet (e.g. "10.0.0")
CONCURRENT_LIMIT = 10          # Increase for faster scans on trusted networks
SCAN_DELAY = 0.0               # Set to 0.05 if you want to throttle

# --- OIDs for Printer Identification ---
OID_SYS_DESCR       = "1.3.6.1.2.1.1.1.0"   # General system description
OID_SYS_NAME        = "1.3.6.1.2.1.1.5.0"   # Hostname / sysName
OID_SYS_CONTACT     = "1.3.6.1.2.1.1.4.0"   # Admin contact
OID_SYS_LOCATION    = "1.3.6.1.2.1.1.6.0"   # Physical location
OID_HR_DEVICE_DESCR = "1.3.6.1.2.1.25.3.2.1.3.1"  # hrDeviceDescr (detailed model)
OID_PRINTER_MODEL   = "1.3.6.1.2.1.43.5.1.1.16.1" # prtGeneralPrinterName (RFC 3805)
OID_SERIAL_NUMBER   = "1.3.6.1.2.1.43.5.1.1.17.1" # prtGeneralSerialNumber
OID_FIRMWARE        = "1.3.6.1.4.1.11.2.3.9.1.1.3" # HP firmware (HP-specific, may not apply)

# --- ANSI COLORS ---
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
BOLD    = "\033[1m"
DIM     = "\033[2m"
RESET   = "\033[0m"

PRINTER_KEYWORDS = [
    "printer", "laserjet", "officejet", "deskjet", "pagewide",
    "laserwriter", "colorjet", "imagerunner", "imageclass", "bizhub",
    "workcentre", "phaser", "versalink", "altalink", "aficio",
    "docuprint", "docucentre", "ecosys", "taskalfa", "lexmark",
    "optra", "colorqube", "printer", "mfp", "mfc", "dcp",
    "brother", "xerox", "ricoh", "konica", "kyocera", "sharp",
    "toshiba", "samsung", "dell", "oki", "okidata", "epson",
    "canon", "pixma", "maxify", "lbp", "mf ", "ir ", "clj",
    "hp ", "hewlett"
]

def looks_like_printer(text: str) -> bool:
    """Check if the sysDescr text suggests a printer."""
    t = text.lower()
    return any(kw in t for kw in PRINTER_KEYWORDS)

async def get_snmp_value(snmp_engine, ip: str, oid: str, community: str = "public") -> str | None:
    """Fetch a single OID value. Returns string or None."""
    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=1.5, retries=0)
        errorIndication, errorStatus, _, varBinds = await get_cmd(
            snmp_engine,
            CommunityData(community, mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        if not errorIndication and not errorStatus:
            val = str(varBinds[0][1])
            # Filter out SNMP "no such" responses
            if val and "NoSuch" not in val and val != "":
                return val.strip()
    except Exception:
        pass
    return None

async def identify_printer(semaphore, snmp_engine, ip: str):
    """Probe a single IP and print a report if it's a printer."""
    async with semaphore:
        # Step 1: Quick probe — is anything listening on SNMP UDP 161?
        sys_descr = await get_snmp_value(snmp_engine, ip, OID_SYS_DESCR)
        if not sys_descr:
            return  # No SNMP response — skip

        # Step 2: Is it likely a printer?
        if not looks_like_printer(sys_descr):
            # Still try the printer-specific OID as a fallback confirmation
            printer_model = await get_snmp_value(snmp_engine, ip, OID_PRINTER_MODEL)
            if not printer_model:
                return  # Responds to SNMP but not a printer

        # Step 3: Gather all identification fields in parallel
        sys_name, sys_contact, sys_location, hr_device, printer_model, serial = await asyncio.gather(
            get_snmp_value(snmp_engine, ip, OID_SYS_NAME),
            get_snmp_value(snmp_engine, ip, OID_SYS_CONTACT),
            get_snmp_value(snmp_engine, ip, OID_SYS_LOCATION),
            get_snmp_value(snmp_engine, ip, OID_HR_DEVICE_DESCR),
            get_snmp_value(snmp_engine, ip, OID_PRINTER_MODEL),
            get_snmp_value(snmp_engine, ip, OID_SERIAL_NUMBER),
        )

        # Step 4: Determine best "model name" — prefer specific OIDs over generic sysDescr
        model_name = printer_model or hr_device or sys_descr or "Unknown"

        # Step 5: Print a clean report block
        print(f"\n{'='*62}")
        print(f"  {BOLD}{CYAN}PRINTER FOUND{RESET}  {BOLD}{ip}{RESET}")
        print(f"{'='*62}")
        print(f"  {BOLD}Hostname   :{RESET} {sys_name or DIM+'(not set)'+RESET}")
        print(f"  {BOLD}Model      :{RESET} {GREEN}{model_name}{RESET}")
        print(f"  {BOLD}sysDescr   :{RESET} {sys_descr[:70]}{'...' if len(sys_descr) > 70 else ''}")
        if serial:
            print(f"  {BOLD}Serial No  :{RESET} {YELLOW}{serial}{RESET}")
        if sys_location:
            print(f"  {BOLD}Location   :{RESET} {sys_location}")
        if sys_contact:
            print(f"  {BOLD}Contact    :{RESET} {sys_contact}")
        print(f"{'='*62}")

async def run():
    snmp_engine = SnmpEngine()
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
    tasks = []

    print(f"\n{BOLD}{'='*62}{RESET}")
    print(f"  {BOLD}PRINTER MODEL IDENTIFICATION SCAN{RESET}")
    print(f"  Subnet : {SUBNET_PREFIX}.1 — {SUBNET_PREFIX}.254")
    print(f"  SNMP   : community=public, port=161, SNMPv1")
    print(f"{BOLD}{'='*62}{RESET}\n")

    for i in range(1, 255):
        ip = f"{SUBNET_PREFIX}.{i}"
        tasks.append(identify_printer(semaphore, snmp_engine, ip))
        if SCAN_DELAY > 0:
            await asyncio.sleep(SCAN_DELAY)

    await asyncio.gather(*tasks)

    print(f"\n{BOLD}Scan complete.{RESET}\n")
    snmp_engine.close_dispatcher()

if __name__ == "__main__":
    asyncio.run(run())