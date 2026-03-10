# Celery Task Flow Diagrams

## Task Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Celery Beat (Scheduler)                   │
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │  discover_printers   │        │ poll_all_active_     │       │
│  │  (Daily at 2 AM)     │        │ printers             │       │
│  │                      │        │ (Every 5 minutes)    │       │
│  └──────────┬───────────┘        └──────────┬───────────┘       │
└─────────────┼──────────────────────────────┼───────────────────┘
              │                               │
              │ Publish to Redis Queue        │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Redis (Broker)                          │
│                                                                   │
│  Task Queue:                                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ [discover_printers] [poll_all_active_printers] [...]   │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
              │
              │ Celery Worker fetches tasks
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Celery Worker (Process)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Execute Task                                             │   │
│  │ ┌──────────────────────────────────────────────────┐     │   │
│  │ │ 1. Fetch data from PostgreSQL                    │     │   │
│  │ │ 2. Execute SNMP requests (asyncio)               │     │   │
│  │ │ 3. Update database (Printer, PrinterLog, etc.)   │     │   │
│  │ │ 4. Broadcast WebSocket events (optional)         │     │   │
│  │ │ 5. Return result to Redis                        │     │   │
│  │ └──────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │
              │ Task result
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis (Result Backend)                        │
│                                                                   │
│  Task Results:                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ task_id_123: "Polled 50 printers in 25.3s"            │     │
│  │ task_id_456: "Discovery complete. Scanned 65536 IPs"  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Discovery Task Flow

```
discover_printers()
    │
    ├─→ _run_discovery()
    │       │
    │       ├─→ Create SnmpEngine
    │       │
    │       ├─→ For each IP in 192.168.x.x:
    │       │       │
    │       │       └─→ _check_host(ip)
    │       │               │
    │       │               ├─→ SNMP GET: sysDescr
    │       │               │   (timeout: 0.5s)
    │       │               │
    │       │               ├─→ SNMP GET: prtMarkerLifeCount
    │       │               │   (verify it's a printer)
    │       │               │
    │       │               ├─→ SNMP GET: sysName
    │       │               │
    │       │               ├─→ SNMP GET: sysLocation
    │       │               │
    │       │               └─→ Printer.objects.get_or_create()
    │       │                   (if new, log "Discovered")
    │       │
    │       └─→ Close SnmpEngine
    │
    └─→ Chain: poll_all_active_printers.delay()
        (get immediate status of new printers)
```

## Polling Task Flow

```
poll_all_active_printers()
    │
    ├─→ _run_poll_active()
    │       │
    │       ├─→ Fetch: Printer.objects.filter(active=True)
    │       │
    │       ├─→ Create SnmpEngine
    │       │
    │       ├─→ For each printer (concurrency: 10):
    │       │       │
    │       │       └─→ _poll_single_printer(printer)
    │       │               │
    │       │               ├─→ STEP 1: Measure Latency
    │       │               │   ├─→ SNMP GET: hrPrinterStatus
    │       │               │   ├─→ SNMP GET: prtMarkerLifeCount
    │       │               │   ├─→ SNMP GET: hrDeviceStatus
    │       │               │   ├─→ SNMP GET: prtMarkerSuppliesLevel
    │       │               │   ├─→ SNMP GET: sysUpTime
    │       │               │   └─→ SNMP GET: prtConsoleDisplayBufferText
    │       │               │   (all concurrent, timeout: 3s)
    │       │               │
    │       │               ├─→ STEP 2: Parse SNMP Values
    │       │               │   └─→ Convert to Python types
    │       │               │
    │       │               ├─→ STEP 3: Update Printer Model
    │       │               │   └─→ printer.save(update_fields=[...])
    │       │               │
    │       │               ├─→ STEP 4: SRE Alerting (60s Cool-off)
    │       │               │   └─→ Check if Down > 60s
    │       │               │
    │       │               ├─→ STEP 5: Update PrinterDailyStat
    │       │               │   └─→ get_or_create(date=today)
    │       │               │
    │       │               ├─→ STEP 6: Create PrinterLog
    │       │               │   └─→ PrinterLog.objects.create(...)
    │       │               │
    │       │               ├─→ STEP 7: Fetch Supply Levels
    │       │               │   ├─→ SNMP WALK: prtMarkerSuppliesDescription
    │       │               │   └─→ For each supply:
    │       │               │       ├─→ SNMP GET: prtMarkerSuppliesMaxCapacity
    │       │               │       ├─→ SNMP GET: prtMarkerSuppliesLevel
    │       │               │       └─→ SupplyLevel.objects.create(...)
    │       │               │
    │       │               ├─→ STEP 8: WebSocket Broadcast
    │       │               │   └─→ channel_layer.group_send(...)
    │       │               │
    │       │               └─→ Return: {success, latency_ms, status}
    │       │
    │       └─→ Close SnmpEngine
    │
    └─→ Return: "Polled X printers in Y seconds"
```

## Error Handling Flow

```
_poll_single_printer(printer)
    │
    ├─→ Try: SNMP requests
    │       │
    │       ├─→ Success?
    │       │   └─→ Continue to database updates
    │       │
    │       ├─→ Timeout (3s)?
    │       │   ├─→ Log: "Printer {ip} timed out"
    │       │   ├─→ Create PrinterLog(event_type=OFFLINE)
    │       │   └─→ Return: {success: False, status: "timeout"}
    │       │
    │       ├─→ No SNMP response?
    │       │   ├─→ Log: "Printer {ip} is OFFLINE"
    │       │   ├─→ Create PrinterLog(event_type=OFFLINE)
    │       │   └─→ Return: {success: False, status: "offline"}
    │       │
    │       └─→ Exception?
    │           ├─→ Log: "Unexpected error: {e}"
    │           └─→ Return: {success: False, status: "error"}
    │
    └─→ If task fails completely:
        └─→ Celery retry with exponential backoff
            (60s, 120s, 240s)
```

## SRE Alerting Flow (60s Cool-off)

```
Device Health Check
    │
    ├─→ device_health == 5 (Down)?
    │   │
    │   ├─→ First time seeing Down?
    │   │   ├─→ printer.alert_triggered_at = now
    │   │   ├─→ Log: "Printer {ip} is Down - starting 60s cool-off"
    │   │   └─→ DO NOT send alert yet
    │   │
    │   └─→ Already in cool-off?
    │       ├─→ elapsed < 60s?
    │       │   └─→ DO NOT send alert (still in cool-off)
    │       │
    │       └─→ elapsed >= 60s AND not in_alert_state?
    │           ├─→ printer.is_in_alert_state = True
    │           ├─→ Log: "CRITICAL: Printer {ip} Down for 60s"
    │           └─→ Send critical alert (WebSocket/Email/Slack)
    │
    └─→ device_health != 5 (Recovered)?
        ├─→ printer.alert_triggered_at = None
        ├─→ printer.is_in_alert_state = False
        └─→ Log: "Printer {ip} recovered (false alarm suppressed)"
```

## Concurrency Model

```
poll_all_active_printers()
    │
    └─→ Fetch 100 active printers
        │
        ├─→ Create asyncio.Semaphore(10)
        │   (limit to 10 concurrent polls)
        │
        └─→ asyncio.gather(*[poll_one(p) for p in printers])
            │
            ├─→ poll_one(printer_1)  ─┐
            ├─→ poll_one(printer_2)   │
            ├─→ poll_one(printer_3)   │
            ├─→ poll_one(printer_4)   ├─ Max 10 concurrent
            ├─→ poll_one(printer_5)   │
            ├─→ poll_one(printer_6)   │
            ├─→ poll_one(printer_7)   │
            ├─→ poll_one(printer_8)   │
            ├─→ poll_one(printer_9)   │
            ├─→ poll_one(printer_10) ─┘
            │
            └─→ When one completes, start next
                ├─→ poll_one(printer_11)
                ├─→ poll_one(printer_12)
                └─→ ... until all 100 complete
```

## Database Update Flow

```
_poll_single_printer(printer)
    │
    └─→ Database Updates (in order):
        │
        ├─→ 1. Update Printer Model
        │   └─→ printer.save(update_fields=[
        │           'last_polled_at',
        │           'last_latency_ms',
        │           'current_status',
        │           'total_page_count',
        │           'device_health',
        │           'min_supply_percent',
        │       ])
        │
        ├─→ 2. Update/Create PrinterDailyStat
        │   └─→ stat, created = PrinterDailyStat.objects.get_or_create(
        │           printer=printer,
        │           date=today,
        │       )
        │       stat.pages_printed_today += delta
        │       stat.avg_latency_ms = (old + new) // 2
        │       stat.save(update_fields=[...])
        │
        ├─→ 3. Create PrinterLog
        │   └─→ log = PrinterLog.objects.create(
        │           printer=printer,
        │           total_pages=total_page_count,
        │           status=status_str,
        │           event_type=event_type,
        │           system_uptime_seconds=uptime,
        │           console_display=console_text,
        │       )
        │
        └─→ 4. Create SupplyLevel Records
            └─→ For each supply (toner, drum, waste):
                └─→ SupplyLevel.objects.create(
                        log=log,
                        name=supply_name,
                        category=category,
                        level_percent=percent,
                        max_capacity=max_cap,
                        current_level=cur_level,
                    )
```

## WebSocket Broadcasting Flow

```
_poll_single_printer(printer)
    │
    └─→ Status changed?
        │
        ├─→ Critical Down (after 60s cool-off)?
        │   └─→ channel_layer.group_send("printers_status", {
        │           "type": "printer_status_update",
        │           "event": "critical_down",
        │           "event_label": "CRITICAL: Printer Down",
        │           ...printer data...
        │       })
        │       │
        │       └─→ WebSocket Consumer
        │           └─→ Broadcast to all connected browsers
        │               └─→ HTMX updates UI (red badge, alert)
        │
        └─→ Normal status change?
            └─→ channel_layer.group_send("printers_status", {
                    "type": "printer_status_update",
                    "event": "status_change",
                    "event_label": "Status changed",
                    ...printer data...
                })
                │
                └─→ WebSocket Consumer
                    └─→ Broadcast to all connected browsers
                        └─→ HTMX updates UI (status badge)
```

## Task Retry Flow

```
@shared_task(bind=True, max_retries=3)
def poll_all_active_printers(self):
    │
    ├─→ Try: Execute polling
    │   └─→ Success: Return result
    │
    └─→ Exception raised?
        │
        ├─→ Retry attempt 1
        │   ├─→ Wait: 60 seconds
        │   └─→ Try again
        │
        ├─→ Retry attempt 2
        │   ├─→ Wait: 120 seconds (2^1 * 60)
        │   └─→ Try again
        │
        ├─→ Retry attempt 3
        │   ├─→ Wait: 240 seconds (2^2 * 60)
        │   └─→ Try again
        │
        └─→ Max retries exceeded
            └─→ Task fails permanently
                └─→ Log error to Sentry/logs
```

## Performance Timeline

```
poll_all_active_printers() - 100 printers
│
├─→ t=0s:    Start task
│
├─→ t=0.1s:  Fetch 100 printers from database
│
├─→ t=0.2s:  Create SnmpEngine
│
├─→ t=0.3s:  Start polling (10 concurrent)
│   │
│   ├─→ Batch 1 (printers 1-10):   3s
│   ├─→ Batch 2 (printers 11-20):  3s
│   ├─→ Batch 3 (printers 21-30):  3s
│   ├─→ Batch 4 (printers 31-40):  3s
│   ├─→ Batch 5 (printers 41-50):  3s
│   ├─→ Batch 6 (printers 51-60):  3s
│   ├─→ Batch 7 (printers 61-70):  3s
│   ├─→ Batch 8 (printers 71-80):  3s
│   ├─→ Batch 9 (printers 81-90):  3s
│   └─→ Batch 10 (printers 91-100): 3s
│
├─→ t=30s:   All printers polled
│
├─→ t=30.5s: Close SnmpEngine
│
└─→ t=31s:   Return result
    └─→ "Polled 100 printers in 31.0s: 95 success, 3 offline, 2 failed"
```

## Summary

- **Celery Beat** schedules tasks at defined intervals
- **Redis** queues tasks and stores results
- **Celery Worker** executes tasks asynchronously
- **Asyncio** enables concurrent SNMP requests (10 at a time)
- **PostgreSQL** stores all printer data and logs
- **WebSocket** broadcasts real-time updates to browsers
- **Error Handling** ensures resilience with timeouts and retries
- **SRE Alerting** prevents false alarms with 60s cool-off
