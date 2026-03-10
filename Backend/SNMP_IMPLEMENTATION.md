# SNMP Implementation Guide

## Overview

This document describes the SNMP polling implementation for the NOC Device Monitor. The system uses **PySNMP v7** with **asyncio** for high-performance concurrent polling of network printers.

## Architecture

```
Celery Beat (Scheduler)
    ↓
    ├─→ discover_printers (Daily at 2 AM)
    │   └─→ Scans 192.168.x.x subnet
    │       └─→ Creates Printer records
    │
    └─→ poll_all_active_printers (Every 5 minutes)
        └─→ Polls all active printers
            ├─→ Updates Printer model
            ├─→ Creates PrinterLog entries
            ├─→ Updates PrinterDailyStat
            └─→ Broadcasts WebSocket events
```

## SNMP OIDs Reference

### Device Status & Health

| OID | Name | Description | Values |
|-----|------|-------------|--------|
| `1.3.6.1.2.1.25.3.5.1.1.1.1` | hrPrinterStatus | Current printer state | 3=Idle, 4=Printing, 5=Warming Up |
| `1.3.6.1.2.1.25.3.2.1.5.1` | hrDeviceStatus | Device health | 2=Running, 3=Warning, 5=Down |
| `1.3.6.1.2.1.43.16.5.1.2.1.1` | prtConsoleDisplayBufferText | Console display text | String (e.g., "Ready") |

### Page Counters

| OID | Name | Description |
|-----|------|-------------|
| `1.3.6.1.2.1.43.10.2.1.4.1.1` | prtMarkerLifeCount | Total pages printed (lifetime) |

### Supply Levels (Toner, Drum, etc.)

| OID | Name | Description |
|-----|------|-------------|
| `1.3.6.1.2.1.43.11.1.1.6` | prtMarkerSuppliesDescription | Supply name (e.g., "Black Toner") |
| `1.3.6.1.2.1.43.11.1.1.8` | prtMarkerSuppliesMaxCapacity | Maximum capacity |
| `1.3.6.1.2.1.43.11.1.1.9` | prtMarkerSuppliesLevel | Current level |

**Special Values for Supply Level:**
- `-3`: OK (treat as 100%)
- `-2`: Unknown (treat as 0%)
- `-1`: Not available (treat as 0%)
- `0-max`: Actual level (calculate percentage)

### System Information

| OID | Name | Description |
|-----|------|-------------|
| `1.3.6.1.2.1.1.3.0` | sysUpTime | System uptime (hundredths of seconds) |
| `1.3.6.1.2.1.1.1.0` | sysDescr | Device model description |
| `1.3.6.1.2.1.1.5.0` | sysName | Device hostname |
| `1.3.6.1.2.1.1.6.0` | sysLocation | Device location |

### Paper Jams & Errors

| OID | Name | Description |
|-----|------|-------------|
| `1.3.6.1.2.1.43.8.2.1.12.1.1` | prtInputHrJams | Input tray jam count |
| `1.3.6.1.2.1.43.9.2.1.8.1.1` | prtOutputHrJams | Output tray jam count |

## Task Descriptions

### 1. `discover_printers`

**Purpose**: Scan subnet for new SNMP-enabled printers

**Schedule**: Daily at 2 AM

**Process**:
1. Scans all IPs in `SUBNET_PREFIX.x.x` (default: `192.168.x.x`)
2. Sends SNMP GET to `sysDescr` OID (0.5s timeout)
3. Verifies printer by checking `prtMarkerLifeCount` OID
4. Creates new `Printer` records for discovered devices
5. Chains `poll_all_active_printers` for immediate status

**Concurrency**: 50 concurrent SNMP requests (configurable)

**Example**:
```python
# Manual trigger
from devices.tasks import discover_printers
discover_printers.delay()
```

### 2. `poll_all_active_printers`

**Purpose**: Poll all active printers for status updates

**Schedule**: Every 5 minutes

**Process**:
1. Fetches all `Printer` objects with `active=True`
2. Polls each printer concurrently (10 at a time)
3. For each printer:
   - Measures SNMP response latency
   - Fetches status, health, page count, toner levels, uptime
   - Updates `Printer` model fields
   - Creates `PrinterLog` entry
   - Updates `PrinterDailyStat` for today
   - Fetches supply levels (toner, drum, waste bin)
   - Creates `SupplyLevel` records
   - Broadcasts WebSocket event (if status changed)

**Error Handling**:
- 3-second timeout per printer
- 1 retry on failure
- Creates `OFFLINE` log entry if unreachable
- Implements 60-second cool-off for Down alerts (prevents false alarms)

**Example**:
```python
# Manual trigger
from devices.tasks import poll_all_active_printers
poll_all_active_printers.delay()
```

### 3. `poll_single_printer_by_ip`

**Purpose**: On-demand polling of a specific printer

**Schedule**: Manual (not scheduled)

**Usage**:
```python
from devices.tasks import poll_single_printer_by_ip
poll_single_printer_by_ip.delay("192.168.1.100")
```

### 4. `cleanup_old_logs`

**Purpose**: Delete old `PrinterLog` entries to manage database size

**Schedule**: Manual (recommended: weekly)

**Usage**:
```python
from devices.tasks import cleanup_old_logs
cleanup_old_logs.delay(days=90)  # Delete logs older than 90 days
```

## Configuration

### Environment Variables

Set these in `docker-compose.yml` or `.env`:

```bash
# Subnet to scan (e.g., 192.168 scans 192.168.0.0/16)
SUBNET_PREFIX=192.168

# SNMP community string (default: public)
SNMP_COMMUNITY=public

# SNMP timeout in seconds (default: 3.0)
SNMP_TIMEOUT=3.0

# SNMP retries (default: 1)
SNMP_RETRIES=1
```

### Celery Beat Schedule

Configure in `Backend/printer/settings.py`:

```python
CELERY_BEAT_SCHEDULE = {
    "discover-printers-daily": {
        "task": "devices.discover_printers",
        "schedule": crontab(hour=2, minute=0),  # 2 AM daily
    },
    "poll-active-printers-every-5min": {
        "task": "devices.poll_active_printers",
        "schedule": 300.0,  # 5 minutes
    },
}
```

## SRE Best Practices

### 1. Latency Measurement

Every poll measures SNMP response time:

```python
t0 = time.perf_counter()
# ... SNMP requests ...
latency_ms = int((time.perf_counter() - t0) * 1000)
printer.last_latency_ms = latency_ms
```

**Use Case**: Identify slow/congested network segments

### 2. Saturation Monitoring

Tracks resource utilization:

- **Toner levels**: Alert when < 10%
- **Maintenance kit**: Alert when > 90% capacity
- **Paper trays**: Monitor current vs. max capacity

```python
if toner_level < 10:
    logger.warning(f"[Saturation] Printer {ip}: toner {toner_level}% (low)")
```

### 3. Actionable Alerting (60s Cool-off)

Prevents false alarms from transient failures:

```python
if device_health == 5:  # Down
    if printer.alert_triggered_at is None:
        # Start 60s cool-off timer
        printer.alert_triggered_at = now
    else:
        elapsed = (now - printer.alert_triggered_at).total_seconds()
        if elapsed >= 60 and not printer.is_in_alert_state:
            # Send critical alert after cool-off
            printer.is_in_alert_state = True
            send_critical_alert()
```

**Result**: Only alert if printer is Down for 60+ seconds

## Error Handling

### Timeout Handling

```python
try:
    result = await _get_snmp_value(snmp_engine, ip, oid, timeout=3.0)
except asyncio.TimeoutError:
    logger.warning(f"Printer {ip} timed out")
    # Create OFFLINE log entry
    PrinterLog.objects.create(
        printer=printer,
        status="Offline",
        event_type=PrinterLog.EventType.OFFLINE,
    )
```

### Offline Detection

A printer is considered offline if:
1. No response to SNMP GET requests (timeout)
2. All core OIDs return `None`

### Retry Logic

Celery tasks automatically retry on failure:

```python
@shared_task(bind=True, max_retries=3)
def poll_all_active_printers(self):
    try:
        # ... polling logic ...
    except Exception as e:
        # Exponential backoff: 60s, 120s, 240s
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
```

## Performance Optimization

### Concurrent Polling

Uses asyncio semaphore to limit concurrent requests:

```python
semaphore = asyncio.Semaphore(10)  # Max 10 concurrent polls

async def poll_one(printer):
    async with semaphore:
        await _poll_single_printer(snmp_engine, printer)

await asyncio.gather(*[poll_one(p) for p in printers])
```

**Result**: Poll 100 printers in ~30 seconds (vs. 5+ minutes sequential)

### SNMP Engine Reuse

Single `SnmpEngine` instance per task:

```python
snmp_engine = SnmpEngine()
# ... use for all printers ...
snmp_engine.close_dispatcher()
```

**Result**: Reduces memory overhead and connection setup time

### Database Optimization

- Uses `update_fields` to only update changed fields
- Batches supply level inserts
- Uses `get_or_create` to avoid duplicate queries

## Troubleshooting

### No Printers Discovered

**Symptoms**: Discovery task completes but no printers added

**Causes**:
1. Wrong subnet prefix (check `SUBNET_PREFIX`)
2. SNMP disabled on printers
3. Firewall blocking UDP port 161
4. Wrong SNMP community string

**Solution**:
```bash
# Test SNMP manually
docker-compose exec backend python manage.py shell
>>> from devices.tasks import _get_snmp_value
>>> from pysnmp.hlapi.v3arch.asyncio import SnmpEngine
>>> import asyncio
>>> engine = SnmpEngine()
>>> result = asyncio.run(_get_snmp_value(engine, "192.168.1.100", "1.3.6.1.2.1.1.1.0"))
>>> print(result)
```

### Polling Timeouts

**Symptoms**: Many printers showing as offline

**Causes**:
1. Network congestion
2. Timeout too short
3. Printers actually offline

**Solution**:
```bash
# Increase timeout
export SNMP_TIMEOUT=5.0

# Reduce concurrent polls
# Edit tasks.py: semaphore = asyncio.Semaphore(5)
```

### High Celery Worker CPU

**Symptoms**: Worker using 100% CPU

**Causes**:
1. Too many concurrent polls
2. Subnet scan too large

**Solution**:
```bash
# Reduce concurrency
docker-compose exec backend python manage.py shell
>>> from devices.tasks import CONCURRENT_LIMIT
>>> # Edit tasks.py to reduce CONCURRENT_LIMIT

# Or scale workers
docker-compose up -d --scale celery_worker=2
```

## Testing

### Manual Task Execution

```bash
# Django shell
docker-compose exec backend python manage.py shell

# Trigger discovery
>>> from devices.tasks import discover_printers
>>> result = discover_printers.delay()
>>> result.get(timeout=300)  # Wait up to 5 minutes

# Trigger polling
>>> from devices.tasks import poll_all_active_printers
>>> result = poll_all_active_printers.delay()
>>> result.get(timeout=60)

# Poll single printer
>>> from devices.tasks import poll_single_printer_by_ip
>>> result = poll_single_printer_by_ip.delay("192.168.1.100")
>>> result.get()
```

### Monitor Task Execution

```bash
# Watch Celery worker logs
docker-compose logs -f celery_worker

# Watch Celery beat logs
docker-compose logs -f celery_beat

# Check task status in Django admin
http://localhost:8000/admin/
```

## References

- **RFC 3805**: Printer MIB v2 (https://www.rfc-editor.org/rfc/rfc3805)
- **RFC 2790**: Host Resources MIB (https://www.rfc-editor.org/rfc/rfc2790)
- **PySNMP Documentation**: https://pysnmp.readthedocs.io/
- **Celery Documentation**: https://docs.celeryproject.org/

## Support

For issues with SNMP polling:
1. Check printer SNMP configuration (community string, enabled)
2. Verify network connectivity (ping, UDP port 161)
3. Review Celery worker logs for errors
4. Test SNMP manually using `snmpwalk` or Python shell
