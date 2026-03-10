"""
Celery tasks for device discovery and SNMP polling.

This module implements enterprise-grade network printer monitoring with:
- Asynchronous SNMP polling using asyncio for high concurrency
- Robust error handling with timeouts and retries
- SRE best practices: latency measurement, saturation monitoring, actionable alerting
- Comprehensive logging for troubleshooting
- Database updates with atomic transactions

Author: Network Operations Team
Last Updated: 2026-02-27
"""
import asyncio
import logging
import os
import time
from decimal import Decimal
from typing import Optional, Dict, List, Tuple

from celery import shared_task
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.utils import timezone
from django.db import transaction
from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd,
    walk_cmd,
)

from .models import Printer, PrinterLog, PrinterDailyStat, SupplyLevel, Consumable

logger = logging.getLogger(__name__)

# ============================================================================
# SNMP OID DEFINITIONS (Standard Printer MIB)
# ============================================================================

class PrinterOIDs:
    """
    Standard SNMP OIDs for printer monitoring.
    Reference: RFC 3805 (Printer MIB v2), RFC 2790 (Host Resources MIB)
    """
    
    # Device Status & Health
    PRINTER_STATUS = "1.3.6.1.2.1.25.3.5.1.1.1.1"      # hrPrinterStatus
    DEVICE_STATUS = "1.3.6.1.2.1.25.3.2.1.5.1"         # hrDeviceStatus
    CONSOLE_DISPLAY = "1.3.6.1.2.1.43.16.5.1.2.1.1"    # prtConsoleDisplayBufferText
    
    # Page Counters
    PAGE_COUNT = "1.3.6.1.2.1.43.10.2.1.4.1.1"         # prtMarkerLifeCount
    
    # Supply Levels (Toner, Drum, etc.)
    SUPPLY_DESCRIPTION = "1.3.6.1.2.1.43.11.1.1.6"     # prtMarkerSuppliesDescription
    SUPPLY_MAX_CAPACITY = "1.3.6.1.2.1.43.11.1.1.8"    # prtMarkerSuppliesMaxCapacity
    SUPPLY_CURRENT_LEVEL = "1.3.6.1.2.1.43.11.1.1.9"   # prtMarkerSuppliesLevel
    SUPPLY_TYPE = "1.3.6.1.2.1.43.11.1.1.4"            # prtMarkerSuppliesType
    SUPPLY_CLASS = "1.3.6.1.2.1.43.11.1.1.3"           # prtMarkerSuppliesClass
    
    # System Information
    SYS_UPTIME = "1.3.6.1.2.1.1.3.0"                   # sysUpTime (hundredths of seconds)
    SYS_DESCR = "1.3.6.1.2.1.1.1.0"                    # sysDescr (model description)
    SYS_NAME = "1.3.6.1.2.1.1.5.0"                     # sysName (hostname)
    SYS_LOCATION = "1.3.6.1.2.1.1.6.0"                 # sysLocation
    
    # Paper Jams & Errors
    INPUT_JAMS = "1.3.6.1.2.1.43.8.2.1.12.1.1"         # prtInputHrJams
    OUTPUT_JAMS = "1.3.6.1.2.1.43.9.2.1.8.1.1"         # prtOutputHrJams
    
    # Alert Table (for error messages)
    ALERT_DESCRIPTION = "1.3.6.1.2.1.43.18.1.1.8"      # prtAlertDescription
    ALERT_CODE = "1.3.6.1.2.1.43.18.1.1.5"             # prtAlertCode
    
    # Paper Trays
    INPUT_NAME = "1.3.6.1.2.1.43.8.2.1.13"             # prtInputName
    INPUT_CAPACITY = "1.3.6.1.2.1.43.8.2.1.9"          # prtInputMaxCapacity
    INPUT_CURRENT = "1.3.6.1.2.1.43.8.2.1.10"          # prtInputCurrentLevel
    INPUT_STATUS = "1.3.6.1.2.1.43.8.2.1.11"           # prtInputStatus

    # Status Code Mappings
    PRINTER_STATUS_MAP = {
        1: "Other",
        3: "Idle",
        4: "Printing",
        5: "Warming Up",
    }
    
    DEVICE_HEALTH_MAP = {
        1: "Unknown",
        2: "Running",
        3: "Warning",
        4: "Testing",
        5: "Down",
    }


# ============================================================================
# CONFIGURATION
# ============================================================================

SUBNET_PREFIX = os.environ.get("SUBNET_PREFIX", "192.168")
SNMP_COMMUNITY = os.environ.get("SNMP_COMMUNITY", "public")
SNMP_TIMEOUT = float(os.environ.get("SNMP_TIMEOUT", "3.0"))  # 3 seconds
SNMP_RETRIES = int(os.environ.get("SNMP_RETRIES", "1"))
SCAN_TIMEOUT = 0.5  # Fast timeout for discovery
CONCURRENT_LIMIT = 50  # Max concurrent SNMP requests (polling uses POLL_CONCURRENT_LIMIT)
COOL_OFF_SECONDS = 60  # SRE actionable alerting: suppress Down alerts for 60s

# Discovery: limit scope and concurrency to reduce resource use
# DISCOVERY_RANGES: comma-separated /24 prefixes, e.g. "192.168.10,192.168.11" (only those subnets)
# If unset, scans full SUBNET_PREFIX.0.0/16 (e.g. 192.168.x.x)
DISCOVERY_RANGES_RAW = os.environ.get("DISCOVERY_RANGES", "").strip()
DISCOVERY_CONCURRENT_LIMIT = int(os.environ.get("DISCOVERY_CONCURRENT_LIMIT", "20"))

# Polling: reduce DB and SNMP load
POLL_CONCURRENT_LIMIT = int(os.environ.get("POLL_CONCURRENT_LIMIT", "10"))
LOG_MIN_INTERVAL_SECONDS = int(os.environ.get("LOG_MIN_INTERVAL_SECONDS", "900"))  # 15 min min between logs when no change
SUPPLY_POLL_INTERVAL_SECONDS = int(os.environ.get("SUPPLY_POLL_INTERVAL_SECONDS", "1800"))  # 30 min between full supply walks


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _supply_category(name: str) -> str:
    """
    Map supply description to category for better organization.
    
    Args:
        name: Supply description from SNMP (e.g., "Black Toner Cartridge")
    
    Returns:
        Category string: "Toner", "Drum Unit", "Maintenance", "Waste Bin"
    """
    description = (name or "").lower()
    
    if any(keyword in description for keyword in ["waste", "collection", "bin"]):
        return "Waste Bin"
    
    if any(keyword in description for keyword in ["fuser", "belt", "transfer", "roller", "kit"]):
        return "Maintenance"
    
    if "drum" in description:
        return "Drum Unit"
    
    return "Toner"


async def _get_snmp_value(
    snmp_engine: SnmpEngine,
    ip: str,
    oid: str,
    timeout: Optional[float] = None,
    retries: Optional[int] = None
) -> Optional[str]:
    """
    Fetch a single SNMP value asynchronously.
    
    Args:
        snmp_engine: PySNMP engine instance
        ip: Target IP address
        oid: SNMP OID to query
        timeout: Request timeout in seconds (default: SNMP_TIMEOUT)
        retries: Number of retries (default: SNMP_RETRIES)
    
    Returns:
        String value from SNMP response, or None if failed
    """
    timeout = timeout if timeout is not None else SNMP_TIMEOUT
    retries = retries if retries is not None else SNMP_RETRIES
    
    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=timeout, retries=retries)
        error_indication, error_status, _, var_binds = await get_cmd(
            snmp_engine,
            CommunityData(SNMP_COMMUNITY, mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )
        
        if error_indication:
            logger.debug(f"SNMP error for {ip} OID {oid}: {error_indication}")
            return None
        
        if error_status:
            logger.debug(f"SNMP error status for {ip} OID {oid}: {error_status}")
            return None
        
        if var_binds:
            return str(var_binds[0][1])
        
    except asyncio.TimeoutError:
        logger.warning(f"SNMP timeout for {ip} OID {oid} after {timeout}s")
    except Exception as e:
        logger.debug(f"SNMP exception for {ip} OID {oid}: {e}")
    
    return None


async def _walk_snmp_table(
    snmp_engine: SnmpEngine,
    ip: str,
    oid: str,
    timeout: Optional[float] = None
) -> List[Tuple[str, str]]:
    """
    Walk an SNMP table and return all OID/value pairs.
    
    Args:
        snmp_engine: PySNMP engine instance
        ip: Target IP address
        oid: Base OID to walk
        timeout: Request timeout in seconds
    
    Returns:
        List of (oid, value) tuples
    """
    timeout = timeout if timeout is not None else SNMP_TIMEOUT
    results = []
    
    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=timeout, retries=1)
        iterator = walk_cmd(
            snmp_engine,
            CommunityData(SNMP_COMMUNITY, mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
            lexicographicMode=False,
        )
        
        async for error_indication, error_status, _, var_binds in iterator:
            if error_indication or error_status:
                break
            
            for var_bind in var_binds:
                oid_str = str(var_bind[0])
                value = str(var_bind[1])
                results.append((oid_str, value))
        
    except Exception as e:
        logger.debug(f"SNMP walk failed for {ip} OID {oid}: {e}")
    
    return results


# ============================================================================
# DISCOVERY TASK
# ============================================================================

async def _check_host(semaphore, snmp_engine: SnmpEngine, ip: str) -> None:
    """
    Check if IP is a printer and add to database if new.
    
    Args:
        semaphore: Asyncio semaphore for concurrency control
        snmp_engine: PySNMP engine instance
        ip: IP address to check
    """
    async with semaphore:
        # Quick check: Does device respond to SNMP?
        model_desc = await _get_snmp_value(
            snmp_engine, ip, PrinterOIDs.SYS_DESCR, timeout=SCAN_TIMEOUT, retries=0
        )
        if not model_desc:
            return
        
        # Verify it's a printer (has page count OID)
        page_check = await _get_snmp_value(
            snmp_engine, ip, PrinterOIDs.PAGE_COUNT, timeout=SCAN_TIMEOUT, retries=0
        )
        if not page_check:
            return
        
        # Get additional info
        sys_name = await _get_snmp_value(
            snmp_engine, ip, PrinterOIDs.SYS_NAME, timeout=SCAN_TIMEOUT, retries=0
        ) or f"Printer {ip}"
        
        sys_location = await _get_snmp_value(
            snmp_engine, ip, PrinterOIDs.SYS_LOCATION, timeout=SCAN_TIMEOUT, retries=0
        ) or "Auto-Discovered"
        
        # Clean up model description
        clean_model = model_desc.split(",")[0][:50]
        
        # Create or get printer record
        printer, created = await sync_to_async(Printer.objects.get_or_create)(
            ip_address=ip,
            defaults={
                "name": sys_name[:100],
                "model_name": clean_model,
                "location": sys_location[:255],
                "sys_name": sys_name[:255],
                "active": True,
            },
        )
        
        if created:
            logger.info(f"✓ Discovered new printer: {ip} ({clean_model})")
        else:
            logger.debug(f"Printer already exists: {ip}")


def _discovery_ip_list() -> List[str]:
    """Build list of IPs to scan from DISCOVERY_RANGES or SUBNET_PREFIX."""
    if DISCOVERY_RANGES_RAW:
        # e.g. "192.168.10,192.168.11" -> scan 192.168.10.1-254, 192.168.11.1-254
        ips = []
        for part in DISCOVERY_RANGES_RAW.split(","):
            prefix = part.strip()
            if not prefix:
                continue
            for fourth in range(1, 255):
                ips.append(f"{prefix}.{fourth}")
        return ips
    # Full /16: SUBNET_PREFIX.0.0 - 255.255
    return [
        f"{SUBNET_PREFIX}.{t}.{f}"
        for t in range(0, 256)
        for f in range(1, 255)
    ]


async def _run_discovery() -> int:
    """
    Run subnet discovery to find new printers.
    Uses DISCOVERY_RANGES (optional) and DISCOVERY_CONCURRENT_LIMIT for resource control.
    Returns:
        Number of IPs scanned
    """
    ip_list = _discovery_ip_list()
    logger.info(f"Starting discovery: {len(ip_list)} IPs (concurrency={DISCOVERY_CONCURRENT_LIMIT})")
    snmp_engine = SnmpEngine()
    semaphore = asyncio.Semaphore(DISCOVERY_CONCURRENT_LIMIT)
    tasks = [_check_host(semaphore, snmp_engine, ip) for ip in ip_list]
    await asyncio.gather(*tasks, return_exceptions=True)
    snmp_engine.close_dispatcher()
    logger.info(f"Discovery scan complete. Scanned {len(tasks)} IPs.")
    return len(tasks)


@shared_task(name="devices.discover_printers", bind=True, max_retries=3)
def discover_printers(self) -> str:
    """
    Celery task: Scan the subnet for SNMP-enabled printers.
    
    This task:
    1. Scans the configured SUBNET_PREFIX (e.g., 192.168.x.x)
    2. Checks each IP for SNMP printer responses
    3. Creates new Printer records for discovered devices
    4. Chains poll_all_active_printers to get immediate status
    
    Scheduled: Daily at 2 AM (see CELERY_BEAT_SCHEDULE in settings.py)
    
    Returns:
        Success message with scan statistics
    """
    logger.info("=" * 80)
    logger.info("TASK: discover_printers - Starting printer discovery")
    logger.info("=" * 80)
    
    try:
        start_time = time.time()
        ip_count = asyncio.run(_run_discovery())
        elapsed = time.time() - start_time
        
        # Chain polling task to get status of new printers
        poll_all_active_printers.delay()
        
        message = f"Discovery complete. Scanned {ip_count} IPs in {elapsed:.1f}s."
        logger.info(message)
        return message
        
    except Exception as e:
        logger.exception(f"Discovery task failed: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


# ============================================================================
# POLLING TASK
# ============================================================================

async def _poll_single_printer(snmp_engine: SnmpEngine, printer: Printer) -> Dict:
    """
    Poll a single printer via SNMP and update database.
    
    This function implements comprehensive printer monitoring:
    - Measures SNMP response latency (SRE: Latency signal)
    - Checks device status and health
    - Monitors supply levels (SRE: Saturation signal)
    - Implements 60s cool-off for Down alerts (SRE: Actionable alerting)
    - Updates Printer model, creates PrinterLog, updates DailyStat
    - Broadcasts status changes via WebSocket (optional)
    
    Args:
        snmp_engine: PySNMP engine instance
        printer: Printer model instance
    
    Returns:
        Dictionary with polling results and statistics
    """
    ip = printer.ip_address
    now = timezone.now()
    result = {
        "ip": ip,
        "success": False,
        "latency_ms": 0,
        "status": "unknown",
        "error": None,
    }
    
    logger.debug(f"Polling printer: {ip} ({printer.name})")
    
    # ========================================================================
    # STEP 1: Measure Latency & Fetch Core OIDs
    # ========================================================================
    
    t0 = time.perf_counter()
    
    try:
        # Fetch all core OIDs concurrently
        status_val, page_val, health_val, toner_val, uptime_val, console_val = await asyncio.gather(
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.PRINTER_STATUS),
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.PAGE_COUNT),
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.DEVICE_STATUS),
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.SUPPLY_CURRENT_LEVEL),
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.SYS_UPTIME),
            _get_snmp_value(snmp_engine, ip, PrinterOIDs.CONSOLE_DISPLAY),
            return_exceptions=True
        )
        
        latency_ms = int((time.perf_counter() - t0) * 1000)
        result["latency_ms"] = latency_ms
        
        # Check if printer is offline (no response to any OID)
        if all(v is None or isinstance(v, Exception) for v in [status_val, page_val, health_val]):
            logger.warning(f"Printer {ip} is OFFLINE (no SNMP response)")
            result["status"] = "offline"
            result["error"] = "No SNMP response"
            
            # Update printer as offline
            await sync_to_async(printer.save)(update_fields=["last_polled_at"])
            printer.last_polled_at = now
            
            # Create OFFLINE log entry
            await sync_to_async(PrinterLog.objects.create)(
                printer=printer,
                status="Offline",
                event_type=PrinterLog.EventType.OFFLINE,
                console_display="Device not responding to SNMP",
            )
            
            return result
        
    except asyncio.TimeoutError:
        logger.warning(f"Printer {ip} timed out after {SNMP_TIMEOUT}s")
        result["status"] = "timeout"
        result["error"] = f"Timeout after {SNMP_TIMEOUT}s"
        
        # Create OFFLINE log entry
        await sync_to_async(PrinterLog.objects.create)(
            printer=printer,
            status="Offline",
            event_type=PrinterLog.EventType.OFFLINE,
            console_display=f"SNMP timeout after {SNMP_TIMEOUT}s",
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Unexpected error polling {ip}: {e}")
        result["status"] = "error"
        result["error"] = str(e)
        return result
    
    # ========================================================================
    # STEP 2: Parse SNMP Values
    # ========================================================================
    
    current_status = None
    if status_val and not isinstance(status_val, Exception):
        try:
            val = int(status_val)
            if val in PrinterOIDs.PRINTER_STATUS_MAP:
                current_status = val
        except (ValueError, TypeError):
            pass
    
    total_page_count = None
    if page_val and not isinstance(page_val, Exception):
        try:
            total_page_count = int(page_val)
        except (ValueError, TypeError):
            pass
    
    device_health = None
    if health_val and not isinstance(health_val, Exception):
        try:
            val = int(health_val)
            if val in PrinterOIDs.DEVICE_HEALTH_MAP:
                device_health = val
        except (ValueError, TypeError):
            pass
    
    min_supply = None
    if toner_val and not isinstance(toner_val, Exception):
        try:
            val = int(toner_val)
            if 0 <= val <= 100:
                min_supply = val
                if val < 10:
                    logger.warning(f"[Saturation] Printer {ip}: toner {val}% (low)")
        except (ValueError, TypeError):
            pass
    
    system_uptime_sec = None
    uptime_minutes = None
    if uptime_val and not isinstance(uptime_val, Exception):
        try:
            centiseconds = int(uptime_val)
            system_uptime_sec = centiseconds // 100
            uptime_minutes = centiseconds // 6000
        except (ValueError, TypeError):
            pass
    
    console_display = None
    if console_val and not isinstance(console_val, Exception):
        console_display = str(console_val)[:255]
    
    # ========================================================================
    # STEP 3: Update Printer Model
    # ========================================================================
    
    update_fields = ["last_polled_at", "last_latency_ms"]
    old_status = printer.current_status
    old_health = printer.device_health
    old_pages = printer.total_page_count
    
    printer.last_polled_at = now
    printer.last_latency_ms = latency_ms
    
    if current_status is not None:
        printer.current_status = current_status
        update_fields.append("current_status")
    
    if total_page_count is not None:
        printer.total_page_count = total_page_count
        update_fields.append("total_page_count")
    
    if device_health is not None:
        printer.device_health = device_health
        update_fields.append("device_health")
    
    if min_supply is not None:
        printer.min_supply_percent = min_supply
        update_fields.append("min_supply_percent")
    
    # Check if any real-time field changed
    status_changed = (
        (current_status is not None and current_status != old_status)
        or (device_health is not None and device_health != old_health)
        or (total_page_count is not None and total_page_count != old_pages)
    )
    
    # ========================================================================
    # STEP 4: SRE Actionable Alerting (60s Cool-off for Down)
    # ========================================================================
    
    should_send_critical_down = False
    
    if device_health == 5:  # Down
        if printer.alert_triggered_at is None:
            # First time seeing Down status - start cool-off timer
            printer.alert_triggered_at = now
            update_fields.append("alert_triggered_at")
            logger.info(f"Printer {ip} is Down - starting 60s cool-off")
        else:
            # Check if cool-off period has elapsed
            elapsed = (now - printer.alert_triggered_at).total_seconds()
            if elapsed >= COOL_OFF_SECONDS and not printer.is_in_alert_state:
                # Cool-off complete - send critical alert
                printer.is_in_alert_state = True
                update_fields.append("is_in_alert_state")
                should_send_critical_down = True
                logger.critical(f"CRITICAL: Printer {ip} has been Down for {elapsed:.0f}s")
    else:
        # Printer recovered before cool-off - suppress false alarm
        if printer.alert_triggered_at or printer.is_in_alert_state:
            printer.alert_triggered_at = None
            printer.is_in_alert_state = False
            update_fields.extend(["alert_triggered_at", "is_in_alert_state"])
            logger.info(f"Printer {ip} recovered (false alarm suppressed)")
    
    # Maintenance kit saturation check
    if (
        printer.maintenance_kit_capacity
        and total_page_count is not None
        and printer.maintenance_kit_capacity > 0
    ):
        pct = (total_page_count / printer.maintenance_kit_capacity) * 100
        if pct >= 90:
            logger.warning(f"[Saturation] Printer {ip}: maintenance kit {pct:.0f}% capacity")
    
    await sync_to_async(printer.save)(update_fields=update_fields)
    
    # ========================================================================
    # STEP 5: Update PrinterDailyStat
    # ========================================================================
    
    today = timezone.now().date()
    
    def _update_daily_stat():
        stat, created = PrinterDailyStat.objects.get_or_create(
            printer=printer,
            date=today,
            defaults={
                "total_pages_printed": 0,
                "pages_printed_today": 0,
                "avg_latency_ms": 0,
                "jam_count": 0,
                "jams_today": 0,
            },
        )
        
        stat_update_fields = ["avg_latency_ms"]
        
        # Update page count delta
        if total_page_count is not None and old_pages is not None and total_page_count > old_pages:
            delta = total_page_count - old_pages
            stat.total_pages_printed += delta
            stat.pages_printed_today += delta
            stat_update_fields.extend(["total_pages_printed", "pages_printed_today"])
        
        # Update uptime
        if uptime_minutes is not None:
            stat.uptime_minutes = uptime_minutes
            stat_update_fields.append("uptime_minutes")
        
        # Update average latency (rolling average)
        stat.avg_latency_ms = (stat.avg_latency_ms + latency_ms) // 2
        
        stat.save(update_fields=list(dict.fromkeys(stat_update_fields)))
    
    await sync_to_async(_update_daily_stat)()
    
    # ========================================================================
    # STEP 6: Create PrinterLog Entry (only when status changed or cadence)
    # ========================================================================
    
    last_log = await sync_to_async(lambda: printer.logs.first())()
    log_interval_ok = (
        last_log is None
        or (now - last_log.timestamp).total_seconds() >= LOG_MIN_INTERVAL_SECONDS
    )
    should_create_log = status_changed or log_interval_ok
    
    log = None
    if should_create_log:
        status_str = "Online"
        event_type = PrinterLog.EventType.STATUS_CHECK
        if device_health == 5:
            status_str = "Offline"
            event_type = PrinterLog.EventType.OFFLINE
        elif device_health == 3:
            status_str = "Warning"
            event_type = PrinterLog.EventType.PAPER_JAM
        log = await sync_to_async(PrinterLog.objects.create)(
            printer=printer,
            total_pages=total_page_count,
            status=status_str,
            event_type=event_type,
            system_uptime_seconds=system_uptime_sec,
            console_display=console_display,
        )
    
    # ========================================================================
    # STEP 7: Fetch Supply Levels only when we have a log and not recently
    # ========================================================================
    
    do_supply_walk = False
    if log is not None:
        def _should_do_supply_walk():
            recent = timezone.now() - timezone.timedelta(seconds=SUPPLY_POLL_INTERVAL_SECONDS)
            has_recent = PrinterLog.objects.filter(
                printer=printer
            ).exclude(pk=log.id).filter(
                supplies__isnull=False
            ).filter(timestamp__gte=recent).exists()
            return not has_recent
        do_supply_walk = await sync_to_async(_should_do_supply_walk)()
    
    if do_supply_walk and log is not None:
        try:
            supply_rows = await _walk_snmp_table(
                snmp_engine, ip, PrinterOIDs.SUPPLY_DESCRIPTION, timeout=SNMP_TIMEOUT
            )
        
            for desc_oid, name in supply_rows:
                row_index = desc_oid.replace(PrinterOIDs.SUPPLY_DESCRIPTION, "").strip(".")
                if not row_index:
                    continue
                max_val = await _get_snmp_value(
                    snmp_engine, ip, f"{PrinterOIDs.SUPPLY_MAX_CAPACITY}.{row_index}", timeout=SNMP_TIMEOUT
                )
                cur_val = await _get_snmp_value(
                    snmp_engine, ip, f"{PrinterOIDs.SUPPLY_CURRENT_LEVEL}.{row_index}", timeout=SNMP_TIMEOUT
                )
                if max_val is not None and cur_val is not None:
                    try:
                        max_capacity = int(max_val)
                        current_level = int(cur_val)
                        if max_capacity > 0 and current_level >= 0:
                            level_percent = int((current_level / max_capacity) * 100)
                        elif current_level == -3:
                            level_percent = 100
                        else:
                            level_percent = 0
                        level_percent = min(100, max(0, level_percent))
                        category = _supply_category(name)
                        await sync_to_async(SupplyLevel.objects.create)(
                            log=log,
                            name=name[:100],
                            category=category,
                            level_percent=level_percent,
                            max_capacity=max_capacity,
                            current_level=current_level,
                        )
                        logger.debug(f"Supply: {name} = {level_percent}%")
                    except (ValueError, TypeError) as e:
                        logger.debug(f"Failed to parse supply data for {ip}: {e}")
        except Exception as e:
            logger.debug(f"Supply fetch for {ip} failed: {e}")
    
    # ========================================================================
    # STEP 8: WebSocket Broadcast (Optional - requires Channels)
    # ========================================================================
    
    channel_layer = get_channel_layer()
    if channel_layer:
        if should_send_critical_down:
            # Send critical Down alert after cool-off
            await channel_layer.group_send(
                "printers_status",
                {
                    "type": "printer_status_update",
                    "printer_id": printer.id,
                    "printer_name": printer.name or ip,
                    "ip_address": ip,
                    "current_status": printer.current_status,
                    "device_health": printer.device_health,
                    "min_supply_percent": printer.min_supply_percent,
                    "total_page_count": printer.total_page_count,
                    "last_polled_at": now.isoformat() if now else None,
                    "event": "critical_down",
                    "event_label": "CRITICAL: Printer Down",
                },
            )
        elif status_changed and printer.device_health != 5:
            # Send normal status change (excluding Down - Down uses cool-off)
            event_type_ws, event_label = "status_change", "Status changed"
            
            if printer.device_health == 3:
                event_type_ws, event_label = "paper_jam", "Attention Needed"
            elif printer.current_status == 4:
                event_type_ws, event_label = "printing", "Printing"
            elif printer.current_status == 5:
                event_type_ws, event_label = "warming_up", "Warming Up"
            elif printer.device_health == 2:
                event_type_ws, event_label = "running", "Running"
            
            await channel_layer.group_send(
                "printers_status",
                {
                    "type": "printer_status_update",
                    "printer_id": printer.id,
                    "printer_name": printer.name or ip,
                    "ip_address": ip,
                    "current_status": printer.current_status,
                    "device_health": printer.device_health,
                    "min_supply_percent": printer.min_supply_percent,
                    "total_page_count": printer.total_page_count,
                    "last_polled_at": now.isoformat() if now else None,
                    "event": event_type_ws,
                    "event_label": event_label,
                },
            )
    
    # ========================================================================
    # STEP 9: Return Success
    # ========================================================================
    
    result["success"] = True
    result["status"] = PrinterOIDs.DEVICE_HEALTH_MAP.get(device_health, "Unknown")
    
    logger.debug(f"✓ Polled {ip}: {result['status']} ({latency_ms}ms)")
    
    return result


async def _run_poll_active() -> Dict:
    """
    Poll all active printers concurrently.
    
    Returns:
        Dictionary with polling statistics
    """
    # Fetch all active printers
    printers = await sync_to_async(list)(Printer.objects.filter(active=True))
    
    if not printers:
        logger.warning("No active printers to poll")
        return {"total": 0, "success": 0, "failed": 0, "offline": 0}
    
    logger.info(f"Polling {len(printers)} active printers (concurrency={POLL_CONCURRENT_LIMIT})...")
    
    snmp_engine = SnmpEngine()
    semaphore = asyncio.Semaphore(POLL_CONCURRENT_LIMIT)
    
    async def poll_one(printer: Printer):
        async with semaphore:
            try:
                return await _poll_single_printer(snmp_engine, printer)
            except Exception as e:
                logger.error(f"Failed to poll {printer.ip_address}: {e}")
                return {
                    "ip": printer.ip_address,
                    "success": False,
                    "status": "error",
                    "error": str(e),
                }
    
    # Poll all printers concurrently
    results = await asyncio.gather(*[poll_one(p) for p in printers], return_exceptions=True)
    snmp_engine.close_dispatcher()
    
    # Calculate statistics
    stats = {
        "total": len(results),
        "success": sum(1 for r in results if isinstance(r, dict) and r.get("success")),
        "failed": sum(1 for r in results if isinstance(r, dict) and not r.get("success")),
        "offline": sum(1 for r in results if isinstance(r, dict) and r.get("status") == "offline"),
    }
    
    logger.info(
        f"Poll complete: {stats['success']}/{stats['total']} successful, "
        f"{stats['offline']} offline, {stats['failed']} failed"
    )
    
    return stats


@shared_task(name="devices.poll_active_printers", bind=True, max_retries=3)
def poll_all_active_printers(self) -> str:
    """
    Celery task: Poll all active printers for status updates.
    
    This task:
    1. Fetches all Printer objects with active=True
    2. Polls each printer via SNMP for:
       - Current status (Idle/Printing/Warming Up)
       - Total page count
       - Device health (Running/Warning/Down)
       - Toner/supply levels
       - System uptime
    3. Updates Printer model with latest data
    4. Creates PrinterLog entry for historical tracking
    5. Updates PrinterDailyStat for analytics
    6. Broadcasts status changes via WebSocket (if Channels enabled)
    
    Scheduled: Every 5 minutes (see CELERY_BEAT_SCHEDULE in settings.py)
    
    Returns:
        Success message with polling statistics
    """
    logger.info("=" * 80)
    logger.info("TASK: poll_all_active_printers - Starting printer poll")
    logger.info("=" * 80)
    
    try:
        start_time = time.time()
        stats = asyncio.run(_run_poll_active())
        elapsed = time.time() - start_time
        
        message = (
            f"Polled {stats['total']} printers in {elapsed:.1f}s: "
            f"{stats['success']} success, {stats['offline']} offline, {stats['failed']} failed"
        )
        logger.info(message)
        return message
        
    except Exception as e:
        logger.exception(f"Polling task failed: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


# ============================================================================
# ADDITIONAL UTILITY TASKS
# ============================================================================

@shared_task(name="devices.poll_single_printer_by_ip")
def poll_single_printer_by_ip(ip_address: str) -> str:
    """
    Celery task: Poll a single printer by IP address (on-demand).
    
    Useful for:
    - Manual refresh from admin panel
    - Testing new printers
    - Troubleshooting specific devices
    
    Args:
        ip_address: IP address of printer to poll
    
    Returns:
        Success message with poll result
    """
    logger.info(f"On-demand poll requested for {ip_address}")
    
    try:
        printer = Printer.objects.get(ip_address=ip_address)
    except Printer.DoesNotExist:
        message = f"Printer with IP {ip_address} not found in database"
        logger.error(message)
        return message
    
    try:
        snmp_engine = SnmpEngine()
        result = asyncio.run(_poll_single_printer(snmp_engine, printer))
        snmp_engine.close_dispatcher()
        
        if result["success"]:
            message = f"Successfully polled {ip_address}: {result['status']} ({result['latency_ms']}ms)"
        else:
            message = f"Failed to poll {ip_address}: {result.get('error', 'Unknown error')}"
        
        logger.info(message)
        return message
        
    except Exception as e:
        message = f"Error polling {ip_address}: {e}"
        logger.exception(message)
        return message


@shared_task(name="devices.cleanup_old_logs")
def cleanup_old_logs(days: int = 90) -> str:
    """
    Celery task: Delete old PrinterLog entries to manage database size.
    
    Args:
        days: Delete logs older than this many days (default: 90)
    
    Returns:
        Success message with deletion count
    """
    logger.info(f"Cleaning up logs older than {days} days...")
    
    cutoff_date = timezone.now() - timezone.timedelta(days=days)
    deleted_count, _ = PrinterLog.objects.filter(timestamp__lt=cutoff_date).delete()
    
    message = f"Deleted {deleted_count} log entries older than {days} days"
    logger.info(message)
    return message
