import asyncio
from decimal import Decimal

from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from pysnmp.hlapi.v3arch.asyncio import *

from devices.models import Printer, PrinterLog, PrinterDailyStat, SupplyLevel

# --- OIDs ---
OID_SYS_DESCR       = "1.3.6.1.2.1.1.1.0"
OID_PAGE_COUNT      = "1.3.6.1.2.1.43.10.2.1.4.1.1"
OID_SUPPLY_DESC     = "1.3.6.1.2.1.43.11.1.1.6"
OID_SUPPLY_MAX      = "1.3.6.1.2.1.43.11.1.1.8"
OID_SUPPLY_CUR      = "1.3.6.1.2.1.43.11.1.1.9"
OID_MAC_ADDRESS     = "1.3.6.1.2.1.2.2.1.6.1"       # Interface 1 MAC (usually eth0)
OID_ALERT_TABLE     = "1.3.6.1.2.1.43.18.1.1.8"     # prtAlertDescription
OID_SYS_UPTIME      = "1.3.6.1.2.1.1.3.0"           # sysUpTime (hundredths of second)
# Identity (sysName, sysLocation)
OID_SYS_NAME        = "1.3.6.1.2.1.1.5.0"           # sysName (Hostname)
OID_SYS_LOCATION    = "1.3.6.1.2.1.1.6.0"           # sysLocation
# Deep-scan OIDs
OID_CONSOLE_DISPLAY = "1.3.6.1.2.1.43.16.5.1.2.1.1" # prtConsoleDisplayBufferText
OID_INPUT_DESC      = "1.3.6.1.2.1.43.8.2.1.18"     # prtInputDescription
OID_INPUT_MEDIA     = "1.3.6.1.2.1.43.8.2.1.12"     # prtInputMediaName (size/type)
OID_INPUT_MAX_CAP   = "1.3.6.1.2.1.43.8.2.1.8"     # prtInputMaxCapacity
OID_INPUT_CUR_LEVEL = "1.3.6.1.2.1.43.8.2.1.9"     # prtInputCurrentLevel
OID_INPUT_STATUS    = "1.3.6.1.2.1.43.8.2.1.10"    # prtInputStatus
OID_SERIAL_NUMBER   = "1.3.6.1.2.1.43.5.1.1.17.1"   # prtGeneralSerialNumber

# prtInputStatus (RFC 3805): other(1), unknown(2), available(3), low(4), empty(5), full(6), offLine(7), jammed(8)
# Some vendors use 0 for ready, 12 for jam; map both standards and common variants.
PRT_INPUT_STATUS_MAP = {
    0: "Ready",
    1: "Other",
    2: "Unknown",
    3: "Available",
    4: "Empty/No Paper",
    5: "Empty",
    6: "Full",
    7: "Offline",
    8: "Jam",
    12: "Jam",
}

class Command(BaseCommand):
    help = 'Scans all active printers and updates the database'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting printer scan...")
        asyncio.run(self.run_scan())
        self.stdout.write(self.style.SUCCESS("Scan complete."))

    async def run_scan(self):
        # 1. Fetch only ACTIVE printers from DB
        printers = []
        # We need to wrap DB access in sync_to_async or just grab IDs first
        # For simplicity in this script, we'll iterate the QuerySet synchronously before the async loop
        async for p in Printer.objects.filter(active=True):
            printers.append(p)

        if not printers:
            self.stdout.write(self.style.WARNING("No active printers found in database."))
            return

        snmp_engine = SnmpEngine()
        semaphore = asyncio.Semaphore(10) # Limit concurrent scans

        tasks = [self.scan_single_printer(semaphore, snmp_engine, p) for p in printers]
        await asyncio.gather(*tasks)
        
        snmp_engine.close_dispatcher()

    async def get_snmp_value(self, snmp_engine, ip, oid):
        try:
            target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
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

    async def get_snmp_raw_value(self, snmp_engine, ip, oid):
        """Get raw SNMP value (for binary data like MAC addresses)."""
        try:
            target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
            errorIndication, errorStatus, _, varBinds = await get_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                target,
                ContextData(),
                ObjectType(ObjectIdentity(oid))
            )
            if not errorIndication and not errorStatus:
                return varBinds[0][1]
        except Exception:
            pass
        return None

    async def _deep_scan_console_display(self, snmp_engine, ip):
        """Fetch prtConsoleDisplayBufferText (screen text). Returns None on failure."""
        raw = await self.get_snmp_value(snmp_engine, ip, OID_CONSOLE_DISPLAY)
        if not raw:
            return None
        s = str(raw).strip()
        return s[:255] if len(s) > 255 else s or None

    async def _deep_scan_active_alerts(self, snmp_engine, ip):
        """Walk prtAlertDescription and return list of alert description strings."""
        alerts = []
        try:
            target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
            iterator = walk_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                target,
                ContextData(),
                ObjectType(ObjectIdentity(OID_ALERT_TABLE)),
                lexicographicMode=False,
            )
            async for errorIndication, _, _, varBinds in iterator:
                if not errorIndication and varBinds:
                    msg = str(varBinds[0][1]).strip()
                    if msg and not all(c in " ," for c in msg):
                        alerts.append(msg)
        except Exception:
            pass
        return alerts

    async def _deep_scan_tray_status(self, snmp_engine, ip):
        """Walk Input Table (1.3.6.1.2.1.43.8.2.1): source, size, capacity, current, status.
        Returns list of dicts for PrinterLog.tray_status (Kyocera web UI style).
        """
        # Index -> value for each column (index = OID suffix e.g. "1.1")
        descriptions = {}   # prtInputDescription -> source name
        media_names = {}    # prtInputMediaName -> size/type
        max_caps = {}       # prtInputMaxCapacity
        cur_levels = {}     # prtInputCurrentLevel
        status_codes = {}   # prtInputStatus

        async def walk_oid(oid, storage, value_fn):
            try:
                target = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=1)
                it = walk_cmd(
                    snmp_engine,
                    CommunityData("public", mpModel=0),
                    target,
                    ContextData(),
                    ObjectType(ObjectIdentity(oid)),
                    lexicographicMode=False,
                )
                async for errorIndication, _, _, varBinds in it:
                    if not errorIndication and varBinds:
                        oid_str = str(varBinds[0][0])
                        idx = oid_str.replace(oid, "").strip(".")
                        if idx:
                            storage[idx] = value_fn(varBinds[0][1])
            except Exception:
                pass

        def str_val(v):
            return str(v).strip() if v is not None else ""

        def int_val(v):
            try:
                return int(v)
            except (TypeError, ValueError):
                return None

        await walk_oid(OID_INPUT_DESC, descriptions, str_val)
        await walk_oid(OID_INPUT_MEDIA, media_names, str_val)
        await walk_oid(OID_INPUT_MAX_CAP, max_caps, int_val)
        await walk_oid(OID_INPUT_CUR_LEVEL, cur_levels, int_val)
        await walk_oid(OID_INPUT_STATUS, status_codes, int_val)

        # Build list of dicts keyed by description index (preserve order from descriptions)
        result = []
        for idx in sorted(descriptions.keys(), key=lambda x: tuple(int(p) for p in x.split(".") if p.isdigit())):
            source = descriptions.get(idx) or "Unknown"
            size = media_names.get(idx) or ""
            capacity = max_caps.get(idx)
            current = cur_levels.get(idx)
            code = status_codes.get(idx, 2)
            code_human = PRT_INPUT_STATUS_MAP.get(code, f"Unknown({code})")
            # Derived status: -3 often means "Some Paper Available"; > 0 = paper count
            if current is not None and (current > 0 or current == -3):
                status = "Paper Loaded"
            else:
                status = "No Paper"
            result.append({
                "source": source,
                "size": size,
                "capacity": capacity,
                "current": current if current is not None else 0,
                "status": status,
            })
        return result

    def determine_category(self, description):
        d = description.lower()
        if any(x in d for x in ["waste", "collection"]):
            return "Waste Bin"
        elif any(x in d for x in ["fuser", "belt", "transfer", "roller", "kit"]):
            return "Maintenance"
        elif "drum" in d:
            return "Drum Unit"
        else:
            return "Toner"

    def _update_daily_stat(self, printer, today, *, jam_delta=0, pages_delta=0,
                           working_minutes=0, idle_minutes=0, downtime_minutes=0,
                           error_delta=0):
        """Get-or-create today's PrinterDailyStat and apply deltas."""
        stat, _ = PrinterDailyStat.objects.get_or_create(
            printer=printer, date=today,
            defaults={
                "total_pages_printed": 0,
                "jam_count": 0,
                "error_count": 0,
                "uptime_minutes": 0,
                "idle_minutes": 0,
                "downtime_minutes": 0,
            }
        )
        PrinterDailyStat.objects.filter(pk=stat.pk).update(
            total_pages_printed=F("total_pages_printed") + pages_delta,
            jam_count=F("jam_count") + jam_delta,
            error_count=F("error_count") + error_delta,
            uptime_minutes=F("uptime_minutes") + working_minutes,
            idle_minutes=F("idle_minutes") + idle_minutes,
            downtime_minutes=F("downtime_minutes") + downtime_minutes,
        )
        if printer.energy_consumption_rate_watts:
            stat.refresh_from_db()
            uptime_hours = (stat.uptime_minutes + stat.idle_minutes) / 60
            stat.energy_usage_kwh = Decimal(
                str((uptime_hours * printer.energy_consumption_rate_watts) / 1000)
            )
            stat.save(update_fields=["energy_usage_kwh"])

    async def scan_single_printer(self, semaphore, snmp_engine, printer):
        async with semaphore:
            self.stdout.write(f"Scanning {printer.ip_address}...")
            now = timezone.now()
            today = now.date()

            # Get last log for time/page deltas
            last_log = await printer.logs.order_by("-timestamp").afirst()
            last_pages = last_log.total_pages if last_log else None
            last_ts = last_log.timestamp if last_log else None

            interval_minutes = 0
            if last_ts:
                delta = now - last_ts
                interval_minutes = max(0, int(delta.total_seconds() / 60))

            # 1. Check Connectivity (Page Count)
            pages = await self.get_snmp_value(snmp_engine, printer.ip_address, OID_PAGE_COUNT)

            if not pages:
                # DEVICE IS OFFLINE - log and record downtime + error for reliability analysis
                await PrinterLog.objects.acreate(
                    printer=printer,
                    status="Offline",
                    event_type=PrinterLog.EventType.OFFLINE,
                )
                if interval_minutes > 0:
                    await sync_to_async(self._update_daily_stat)(
                        printer,
                        today,
                        downtime_minutes=interval_minutes,
                        error_delta=1,
                    )
                return

            pages_int = int(pages)

            # DEVICE IS ONLINE - Perform Deep Scan
            current_status = "Online"
            event_type = PrinterLog.EventType.STATUS_CHECK

            # 1. Identity & asset data: sysName, sysLocation, serial number
            hostname_raw = await self.get_snmp_value(snmp_engine, printer.ip_address, OID_SYS_NAME)
            location_raw = await self.get_snmp_value(snmp_engine, printer.ip_address, OID_SYS_LOCATION)
            serial_raw = await self.get_snmp_value(snmp_engine, printer.ip_address, OID_SERIAL_NUMBER)
            update_fields = []
            if hostname_raw:
                hostname_clean = str(hostname_raw).strip()[:255]
                if hostname_clean and printer.sys_name != hostname_clean:
                    printer.sys_name = hostname_clean
                    update_fields.append("sys_name")
            if location_raw is not None:
                location_clean = str(location_raw).strip()[:255]
                if printer.location != location_clean:
                    printer.location = location_clean
                    update_fields.append("location")
            if serial_raw:
                serial_clean = str(serial_raw).strip()[:100]
                if serial_clean and printer.serial_number != serial_clean:
                    printer.serial_number = serial_clean
                    update_fields.append("serial_number")
            if update_fields:
                await printer.asave(update_fields=update_fields)

            # 2. Security Check: IP Conflict / MAC Validation
            raw_mac = await self.get_snmp_raw_value(snmp_engine, printer.ip_address, OID_MAC_ADDRESS)

            if raw_mac:
                try:
                    if isinstance(raw_mac, bytes):
                        clean_mac = ":".join("{:02x}".format(b) for b in raw_mac)
                    elif isinstance(raw_mac, str):
                        clean_mac = ":".join("{:02x}".format(ord(c)) for c in raw_mac)
                    elif hasattr(raw_mac, "prettyPrint"):
                        s = raw_mac.prettyPrint().replace("0x", "").replace(" ", "")
                        clean_mac = ":".join(s[i:i+2] for i in range(0, len(s), 2)) if s else str(raw_mac)
                    else:
                        clean_mac = str(raw_mac)
                except Exception:
                    clean_mac = str(raw_mac)

                if printer.mac_address and printer.mac_address.upper() != clean_mac.upper():
                    current_status = "⚠️ IP Conflict (MAC Changed)"

                if not printer.mac_address:
                    printer.mac_address = clean_mac
                    await printer.asave()

            # 3. Active Alerts: walk prtAlertDescription, collect list for active_alerts + status/jam
            alerts = await self._deep_scan_active_alerts(snmp_engine, printer.ip_address)
            jam_detected = any("jam" in msg.lower() for msg in alerts)
            if alerts:
                current_status = ", ".join(alerts)
                if jam_detected:
                    event_type = PrinterLog.EventType.PAPER_JAM

            # 4. Time classification & daily stat (from printer page delta)
            working_min = idle_min = 0
            if interval_minutes > 0 and last_pages is not None:
                if pages_int > last_pages:
                    working_min = interval_minutes
                elif pages_int == last_pages:
                    idle_min = interval_minutes

            pages_delta = (pages_int - last_pages) if last_pages is not None else 0
            pages_delta = max(0, pages_delta)

            await sync_to_async(self._update_daily_stat)(
                printer,
                today,
                jam_delta=1 if jam_detected else 0,
                pages_delta=pages_delta,
                working_minutes=working_min,
                idle_minutes=idle_min,
            )

            # 5. Fetch printer-reported system uptime (sysUpTime)
            sys_uptime_raw = await self.get_snmp_value(snmp_engine, printer.ip_address, OID_SYS_UPTIME)
            system_uptime_seconds = None
            if sys_uptime_raw:
                try:
                    # sysUpTime returns hundredths of second
                    system_uptime_seconds = int(float(sys_uptime_raw) / 100)
                except (ValueError, TypeError):
                    pass

            # 6. Deep-scan: console display text + input tray status (parallel)
            console_display, tray_status = await asyncio.gather(
                self._deep_scan_console_display(snmp_engine, printer.ip_address),
                self._deep_scan_tray_status(snmp_engine, printer.ip_address),
            )

            # 7. Save Log (with deep-dive fields)
            log = await PrinterLog.objects.acreate(
                printer=printer,
                total_pages=pages_int,
                status=current_status,
                event_type=event_type,
                system_uptime_seconds=system_uptime_seconds,
                console_display=console_display,
                tray_status=tray_status or [],
                active_alerts=alerts,
            )

            # 8. Fetch Supplies (Toner)
            has_low_toner = False
            try:
                target = await UdpTransportTarget.create((printer.ip_address, 161), timeout=2.0, retries=1)
                iterator = walk_cmd(
                    snmp_engine,
                    CommunityData("public", mpModel=0),
                    target,
                    ContextData(),
                    ObjectType(ObjectIdentity(OID_SUPPLY_DESC)),
                    lexicographicMode=False
                )

                async for errorIndication, _, _, varBinds in iterator:
                    if errorIndication:
                        continue
                    desc_oid = str(varBinds[0][0])
                    name = str(varBinds[0][1])
                    row_index = desc_oid.replace(OID_SUPPLY_DESC, "").strip(".")

                    max_val = await self.get_snmp_value(snmp_engine, printer.ip_address, f"{OID_SUPPLY_MAX}.{row_index}")
                    cur_val = await self.get_snmp_value(snmp_engine, printer.ip_address, f"{OID_SUPPLY_CUR}.{row_index}")

                    if max_val and cur_val:
                        m = int(max_val)
                        c = int(cur_val)
                        pct = 0
                        if m > 0 and c >= 0:
                            pct = int((c / m) * 100)
                        elif c == -3:
                            pct = 100

                        await SupplyLevel.objects.acreate(
                            log=log,
                            name=name,
                            category=self.determine_category(name),
                            level_percent=pct,
                            max_capacity=m,
                            current_level=c
                        )
                        if pct < 20 and pct >= 0 and self.determine_category(name) == "Toner":
                            has_low_toner = True

                if has_low_toner and event_type == PrinterLog.EventType.STATUS_CHECK:
                    # Tag the log as low-toner and increment error counter for prediction/analytics
                    log.event_type = PrinterLog.EventType.LOW_TONER
                    await log.asave(update_fields=["event_type"])
                    await sync_to_async(self._update_daily_stat)(
                        printer,
                        today,
                        error_delta=1,
                    )
            except Exception:
                pass