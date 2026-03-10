# Quick Start Guide - Celery Tasks

## Starting the Stack

```bash
# Build and start all services
docker-compose up --build

# Or start in background
docker-compose up -d

# View logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat
```

## Manual Task Execution

### Django Shell

```bash
# Open Django shell
docker-compose exec backend python manage.py shell
```

### Discover Printers (Subnet Scan)

```python
from devices.tasks import discover_printers

# Trigger discovery task
result = discover_printers.delay()

# Wait for completion (may take 30-60 minutes for full /16 subnet)
print(result.get(timeout=3600))
```

### Poll All Active Printers

```python
from devices.tasks import poll_all_active_printers

# Trigger polling task
result = poll_all_active_printers.delay()

# Wait for completion (usually 10-30 seconds)
print(result.get(timeout=60))
```

### Poll Single Printer

```python
from devices.tasks import poll_single_printer_by_ip

# Poll specific printer
result = poll_single_printer_by_ip.delay("192.168.1.100")
print(result.get())
```

### Cleanup Old Logs

```python
from devices.tasks import cleanup_old_logs

# Delete logs older than 90 days
result = cleanup_old_logs.delay(days=90)
print(result.get())
```

## Checking Task Status

### View Active Tasks

```bash
# Django shell
docker-compose exec backend python manage.py shell
```

```python
from celery import current_app

# Get active tasks
active = current_app.control.inspect().active()
print(active)

# Get scheduled tasks
scheduled = current_app.control.inspect().scheduled()
print(scheduled)

# Get registered tasks
registered = current_app.control.inspect().registered()
print(registered)
```

### View Task Results

```python
from celery.result import AsyncResult

# Get task result by ID
task_id = "abc123..."
result = AsyncResult(task_id)

print(f"State: {result.state}")
print(f"Result: {result.result}")
print(f"Traceback: {result.traceback}")
```

## Monitoring

### Celery Worker Logs

```bash
# Follow worker logs
docker-compose logs -f celery_worker

# Last 100 lines
docker-compose logs --tail=100 celery_worker

# Search for errors
docker-compose logs celery_worker | grep ERROR
```

### Celery Beat Logs

```bash
# Follow beat logs
docker-compose logs -f celery_beat

# Check scheduled tasks
docker-compose logs celery_beat | grep "Scheduler"
```

### Database Queries

```bash
# Django shell
docker-compose exec backend python manage.py shell
```

```python
from devices.models import Printer, PrinterLog, PrinterDailyStat

# Count active printers
print(f"Active printers: {Printer.objects.filter(active=True).count()}")

# Recently polled printers
from django.utils import timezone
from datetime import timedelta

recent = timezone.now() - timedelta(minutes=10)
recent_polls = Printer.objects.filter(last_polled_at__gte=recent)
print(f"Polled in last 10 min: {recent_polls.count()}")

# Offline printers
offline = Printer.objects.filter(device_health=5)
print(f"Offline printers: {offline.count()}")
for p in offline:
    print(f"  - {p.name} ({p.ip_address})")

# Recent logs
recent_logs = PrinterLog.objects.order_by('-timestamp')[:10]
for log in recent_logs:
    print(f"{log.timestamp}: {log.printer.name} - {log.status}")

# Today's stats
today = timezone.now().date()
stats = PrinterDailyStat.objects.filter(date=today)
total_pages = sum(s.pages_printed_today for s in stats)
print(f"Pages printed today: {total_pages}")
```

## Configuration

### Environment Variables

Edit `docker-compose.yml`:

```yaml
environment:
  # Subnet to scan (192.168 = 192.168.0.0/16)
  - SUBNET_PREFIX=192.168
  
  # SNMP settings
  - SNMP_COMMUNITY=public
  - SNMP_TIMEOUT=3.0
  - SNMP_RETRIES=1
```

### Celery Beat Schedule

Edit `Backend/printer/settings.py`:

```python
CELERY_BEAT_SCHEDULE = {
    "discover-printers-daily": {
        "task": "devices.discover_printers",
        "schedule": crontab(hour=2, minute=0),  # 2 AM daily
    },
    "poll-active-printers-every-5min": {
        "task": "devices.poll_active_printers",
        "schedule": 300.0,  # 5 minutes (in seconds)
    },
}
```

### Worker Concurrency

Edit `docker-compose.yml`:

```yaml
celery_worker:
  command: celery -A printer.celery worker -l info --concurrency=8
```

## Troubleshooting

### No Printers Discovered

```bash
# Check if SNMP is working
docker-compose exec backend python manage.py shell
```

```python
from devices.tasks import _get_snmp_value
from pysnmp.hlapi.v3arch.asyncio import SnmpEngine
import asyncio

engine = SnmpEngine()

# Test SNMP on known printer
ip = "192.168.1.100"
result = asyncio.run(_get_snmp_value(engine, ip, "1.3.6.1.2.1.1.1.0", timeout=5.0))

if result:
    print(f"SUCCESS: {result}")
else:
    print("FAILED: No SNMP response")

engine.close_dispatcher()
```

### Polling Timeouts

```bash
# Increase timeout in docker-compose.yml
environment:
  - SNMP_TIMEOUT=5.0

# Restart services
docker-compose restart celery_worker celery_beat
```

### High CPU Usage

```bash
# Reduce concurrent polls
# Edit Backend/devices/tasks.py:
# semaphore = asyncio.Semaphore(5)  # Reduce from 10 to 5

# Or scale workers
docker-compose up -d --scale celery_worker=2
```

### Task Stuck/Hanging

```bash
# Restart Celery worker
docker-compose restart celery_worker

# Or kill specific task
docker-compose exec backend python manage.py shell
```

```python
from celery import current_app

# Revoke task
current_app.control.revoke('task-id-here', terminate=True)

# Purge all pending tasks
current_app.control.purge()
```

## Testing SNMP Manually

### Using snmpwalk (if installed)

```bash
# Install snmp tools
apt-get install snmp snmp-mibs-downloader

# Walk printer MIB
snmpwalk -v2c -c public 192.168.1.100 1.3.6.1.2.1.43

# Get specific OID (page count)
snmpget -v2c -c public 192.168.1.100 1.3.6.1.2.1.43.10.2.1.4.1.1
```

### Using Python

```python
from pysnmp.hlapi.v3arch.asyncio import *
import asyncio

async def test_snmp(ip):
    engine = SnmpEngine()
    target = await UdpTransportTarget.create((ip, 161), timeout=3.0, retries=1)
    
    error_indication, error_status, _, var_binds = await get_cmd(
        engine,
        CommunityData('public', mpModel=0),
        target,
        ContextData(),
        ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0'))  # sysDescr
    )
    
    if error_indication:
        print(f"Error: {error_indication}")
    elif error_status:
        print(f"Error Status: {error_status}")
    else:
        print(f"Success: {var_binds[0][1]}")
    
    engine.close_dispatcher()

# Run test
asyncio.run(test_snmp("192.168.1.100"))
```

## Performance Tips

1. **Reduce subnet size**: Instead of scanning entire /16 (65,536 IPs), scan specific /24 subnets
2. **Increase concurrency**: For fast networks, increase `CONCURRENT_LIMIT` in tasks.py
3. **Adjust polling interval**: Change from 5 minutes to 10 minutes if not needed frequently
4. **Scale workers**: Add more Celery workers for large printer fleets (100+ devices)
5. **Database indexing**: Ensure `ip_address`, `active`, and `last_polled_at` are indexed

## Common Operations

### Add Printer Manually

```python
from devices.models import Printer

printer = Printer.objects.create(
    name="Finance Printer",
    ip_address="192.168.1.100",
    model_name="HP LaserJet Pro M404dn",
    location="Finance Department - 3rd Floor",
    active=True
)

# Poll immediately
from devices.tasks import poll_single_printer_by_ip
poll_single_printer_by_ip.delay("192.168.1.100")
```

### Disable Polling for Printer

```python
from devices.models import Printer

printer = Printer.objects.get(ip_address="192.168.1.100")
printer.active = False
printer.save()
```

### View Supply Levels

```python
from devices.models import Printer, SupplyLevel

printer = Printer.objects.get(ip_address="192.168.1.100")
latest_log = printer.logs.first()

if latest_log:
    supplies = latest_log.supplies.all()
    for supply in supplies:
        print(f"{supply.name}: {supply.level_percent}%")
```

### Generate Daily Report

```python
from devices.models import PrinterDailyStat
from django.utils import timezone

today = timezone.now().date()
stats = PrinterDailyStat.objects.filter(date=today)

print(f"Daily Report for {today}")
print("=" * 50)
print(f"Total printers: {stats.count()}")
print(f"Total pages: {sum(s.pages_printed_today for s in stats)}")
print(f"Total jams: {sum(s.jams_today for s in stats)}")
print(f"Avg latency: {sum(s.avg_latency_ms for s in stats) / stats.count():.0f}ms")
```

## Next Steps

1. **Configure subnet**: Set `SUBNET_PREFIX` in docker-compose.yml
2. **Run discovery**: Trigger `discover_printers` task
3. **Verify polling**: Check Celery worker logs
4. **Access dashboard**: http://localhost:8000/
5. **Monitor logs**: Use Django admin or database queries

For detailed documentation, see:
- `SNMP_IMPLEMENTATION.md` - Complete SNMP reference
- `ARCHITECTURE.md` - System architecture overview
- `README.md` - Project documentation
