import asyncio
from pysnmp.hlapi.v3arch.asyncio import *

# --- CONFIGURATION ---
SUBNET_PREFIX = "192.168.30"
CONCURRENT_LIMIT = 2     # Low concurrency to be "stealthy"
SCAN_DELAY = 0.1          # Delay between pings (seconds)

# --- THRESHOLDS (Customize these for your policy) ---
ALERT_LOW = 20        # Warning level (%)
ALERT_CRITICAL = 5    # Critical level (%)

# --- OIDs ---
OID_SYS_DESCR   = "1.3.6.1.2.1.1.1.0"
OID_SYS_NAME    = "1.3.6.1.2.1.1.5.0"
OID_PAGE_COUNT  = "1.3.6.1.2.1.43.10.2.1.4.1.1" 
OID_SUPPLY_DESC = "1.3.6.1.2.1.43.11.1.1.6"
OID_SUPPLY_MAX  = "1.3.6.1.2.1.43.11.1.1.8"
OID_SUPPLY_CUR  = "1.3.6.1.2.1.43.11.1.1.9"

# --- ANSI COLORS for Terminal Output ---
RED = "\033[91m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
RESET = "\033[0m"
BOLD = "\033[1m"

async def get_snmp_value(snmp_engine, ip, oid):
    """Fetch a single value with short timeout."""
    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=1.0, retries=0)
        errorIndication, errorStatus, _, varBinds = await get_cmd(
            snmp_engine,
            CommunityData("public", mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        if not errorIndication and not errorStatus:
            return str(varBinds[0][1])
    except:
        pass
    return None

def determine_category(description):
    """Categorize the supply item based on its name."""
    d = description.lower()
    if any(x in d for x in ["waste", "collection"]):
        return "Waste Bin"
    elif any(x in d for x in ["fuser", "belt", "transfer", "roller", "kit"]):
        return "Maintenance"
    elif "drum" in d:
        return "Drum Unit"
    else:
        return "Toner"

async def analyze_supplies(snmp_engine, ip):
    """Fetches supplies and generates actionable insights."""
    supplies = []
    actions = []

    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
        iterator = walk_cmd(
            snmp_engine,
            CommunityData("public", mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(OID_SUPPLY_DESC)),
            lexicographicMode=False
        )

        async for errorIndication, _, _, varBinds in iterator:
            if errorIndication: continue
            
            # 1. Get Description & Index
            desc_oid = str(varBinds[0][0])
            name = str(varBinds[0][1])
            row_index = desc_oid.replace(OID_SUPPLY_DESC, "").strip(".")
            
            # 2. Get Levels
            max_val = await get_snmp_value(snmp_engine, ip, f"{OID_SUPPLY_MAX}.{row_index}")
            cur_val = await get_snmp_value(snmp_engine, ip, f"{OID_SUPPLY_CUR}.{row_index}")

            if max_val and cur_val:
                m = int(max_val)
                c = int(cur_val)
                pct = 0
                status_str = "Unknown"
                
                # Logic to handle Printer specific codes (-3 = OK, -2 = Unknown)
                if m > 0 and c >= 0:
                    pct = int((c / m) * 100)
                    if pct <= ALERT_CRITICAL:
                        status_str = f"{RED}CRITICAL ({pct}%){RESET}"
                        actions.append(f"{RED}REPLACE {name}{RESET}")
                    elif pct <= ALERT_LOW:
                        status_str = f"{YELLOW}LOW ({pct}%){RESET}"
                        actions.append(f"{YELLOW}ORDER {name}{RESET}")
                    else:
                        status_str = f"{GREEN}OK ({pct}%){RESET}"
                elif c == -3:
                    status_str = f"{GREEN}OK{RESET}"
                
                cat = determine_category(name)
                supplies.append({"category": cat, "name": name, "status": status_str, "raw": f"{c}/{m}"})

    except Exception:
        pass
    
    return supplies, actions

async def scan_printer(semaphore, snmp_engine, ip):
    async with semaphore:
        # Quick check for printer
        model = await get_snmp_value(snmp_engine, ip, OID_SYS_DESCR)
        if not model: return

        # If it answers, dig deeper
        name = await get_snmp_value(snmp_engine, ip, OID_SYS_NAME) or ip
        pages = await get_snmp_value(snmp_engine, ip, OID_PAGE_COUNT)
        
        if pages:
            supplies, actions = await analyze_supplies(snmp_engine, ip)
            
            # --- PRINT REPORT BLOCK ---
            print(f"{'-'*60}")
            print(f" {BOLD}{name}{RESET} ({ip})")
            print(f"    Model: {model[:40]}...") # Truncate long model names
            print(f"    Total Pages: {BOLD}{pages}{RESET}")
            
            if actions:
                print(f"\n    {BOLD}  ACTION REQUIRED:{RESET}")
                for act in actions:
                    print(f"     • {act}")
            else:
                print(f"\n     System Healthy - No immediate actions.")

            if supplies:
                print(f"\n    {BOLD}Detailed Status:{RESET}")
                # Format: Name ...... Status
                for s in supplies:
                    print(f"     • {s['name']:<30} {s['status']}")
            print(f"{'-'*60}\n")

async def run():
    snmpEngine = SnmpEngine()
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
    tasks = []
    
    print(f"--- Starting IT Support Audit on {SUBNET_PREFIX}.x ---")
    print(f"--- Thresholds: Low < {ALERT_LOW}%, Critical < {ALERT_CRITICAL}% ---\n")

    for i in range(1, 255):
        ip = f"{SUBNET_PREFIX}.{i}"
        tasks.append(scan_printer(semaphore, snmpEngine, ip))
        await asyncio.sleep(SCAN_DELAY)

    await asyncio.gather(*tasks)
    print("--- Audit Complete ---")
    snmpEngine.close_dispatcher()

if __name__ == "__main__":
    asyncio.run(run())