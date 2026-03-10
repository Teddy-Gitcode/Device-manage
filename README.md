# NOC Device Monitor

A **monolithic Django application** for real-time monitoring of network printers in a Network Operations Center (NOC) environment. Built with **Django Templates + HTMX** for dynamic UI updates and **Celery** for asynchronous SNMP polling.

## Architecture Overview

```
┌─────────────────┐
│     Browser     │
│ (HTMX + HTML)   │
└────────┬────────┘
         │ HTTP (hx-get, hx-post)
         ▼
┌─────────────────┐      ┌──────────────┐
│  Django (Views  │◄─────┤  PostgreSQL  │
│  & Templates)   │      │   Database   │
└────────┬────────┘      └──────────────┘
         │
         │ Task Queue / Result Backend
         ▼
┌─────────────────┐
│      Redis      │
│    (Broker)     │
└────────┬────────┘
         │
         │ Task Queue
         ▼
┌─────────────────┐      ┌──────────────┐
│  Celery Worker  │      │ Celery Beat  │
│  (Processes)    │◄─────┤ (Scheduler)  │
└─────────────────┘      └──────────────┘
         │
         │ SNMP Polling
         ▼
┌─────────────────┐
│     Network     │
│    Printers     │
└─────────────────┘
```

## Key Features

- **Server-Side Rendering**: Django Templates generate HTML on the server
- **HTMX Interactivity**: Dynamic partial updates without writing JavaScript
- **Asynchronous Polling**: Celery workers handle SNMP requests in the background
- **Real-Time Updates**: HTMX auto-refresh keeps data current without page reloads
- **SNMP v2c Support**: Automatic printer discovery and status monitoring
- **Historical Analytics**: Track page counts, toner levels, and uptime over time
- **SRE Best Practices**: Latency measurement, saturation monitoring, actionable alerting

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | Django 4.2+ | Monolithic application (views, templates, ORM) |
| **Database** | PostgreSQL 15 | Persistent storage for devices and logs |
| **Task Queue** | Celery 5.3+ | Background SNMP polling |
| **Message Broker** | Redis | Task queue and result backend |
| **ASGI Server** | Daphne | HTTP server (WebSocket-ready) |
| **Frontend** | HTMX + HTML5 | Dynamic UI without JavaScript frameworks |
| **SNMP Library** | PySNMP 7.1+ | Network device polling |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd Device-manage

# 2. Build and start all services
docker-compose up --build

# 3. Run database migrations
docker-compose exec backend python manage.py migrate

# 4. Create a superuser account
docker-compose exec backend python manage.py createsuperuser

# 5. Access the application
# Django App: http://localhost:8000
# Django Admin: http://localhost:8000/admin
```

### Environment Variables

Configure these in `docker-compose.yml` or `.env`:

```bash
# Database
DATABASE_URL=postgres://admin:corporate_password@db:5432/devicemonitor

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# Network Scanning
SUBNET_PREFIX=192.168  # Fallback when DISCOVERY_RANGES not set
DISCOVERY_RANGES=192.168.10,192.168.11  # Optional: comma-separated /24 prefixes (reduces scan scope)
DISCOVERY_CONCURRENT_LIMIT=20  # Max concurrent SNMP requests during discovery (default 20)
DISCOVERY_ENABLED=true  # Set to false to disable daily discovery in Celery Beat (run manually if needed)

# Polling (resource tuning)
POLL_CONCURRENT_LIMIT=10  # Concurrent printers per poll cycle (default 10)
LOG_MIN_INTERVAL_SECONDS=900  # Min seconds between PrinterLog rows when status unchanged (default 15 min)
SUPPLY_POLL_INTERVAL_SECONDS=1800  # Min seconds between full supply (toner) SNMP walks per printer (default 30 min)

# Django
DJANGO_SETTINGS_MODULE=printer.settings
SECRET_KEY=<your-secret-key>
DEBUG=True
```

## Project Structure

```
Device-manage/
├── Backend/
│   ├── printer/                 # Django project config
│   │   ├── settings.py          # Application settings
│   │   ├── urls.py              # URL routing
│   │   ├── celery.py            # Celery configuration
│   │   ├── asgi.py              # ASGI application
│   │   └── __init__.py          # Celery app initialization
│   ├── devices/                 # Main Django app
│   │   ├── models.py            # Printer, PrinterLog, PrinterDailyStat
│   │   ├── views.py             # HTTP request handlers
│   │   ├── tasks.py             # Celery tasks (SNMP polling)
│   │   ├── urls.py              # App-level URL routing
│   │   ├── admin.py             # Django admin configuration
│   │   ├── templates/           # HTML templates
│   │   │   ├── devices/
│   │   │   │   ├── printer_list.html
│   │   │   │   └── partials/    # HTMX partial templates
│   │   └── management/commands/ # Custom Django commands
│   ├── requirements-docker.txt  # Python dependencies
│   ├── Dockerfile               # Backend container image
│   └── manage.py                # Django management script
├── docker-compose.yml           # Multi-container orchestration
├── ARCHITECTURE.md              # Detailed architecture documentation
└── README.md                    # This file
```

## Docker Services

| Service | Description | Port |
|---------|-------------|------|
| `db` | PostgreSQL 15 database | 5432 (internal) |
| `redis` | Redis message broker | 6379 (internal) |
| `backend` | Django application (Daphne) | 8000 |
| `celery_worker` | Background task processor | - |
| `celery_beat` | Periodic task scheduler | - |

## Usage

### Accessing the Application

```bash
# Main dashboard
http://localhost:8000/

# Django admin panel
http://localhost:8000/admin/
```

### Monitoring Celery Tasks

```bash
# View Celery worker logs
docker-compose logs -f celery_worker

# View Celery beat (scheduler) logs
docker-compose logs -f celery_beat

# View all logs
docker-compose logs -f
```

### Manual Task Execution

```bash
# Open Django shell
docker-compose exec backend python manage.py shell

# Trigger discovery task
>>> from devices.tasks import discover_printers
>>> discover_printers.delay()

# Trigger polling task
>>> from devices.tasks import poll_active_printers
>>> poll_active_printers.delay()
```

### Database Management

```bash
# Create new migration
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Access PostgreSQL shell
docker-compose exec db psql -U admin -d devicemonitor

# Backup database
docker-compose exec db pg_dump -U admin devicemonitor > backup.sql

# Restore database
docker-compose exec -T db psql -U admin devicemonitor < backup.sql
```

## HTMX Integration

### How It Works

HTMX allows the browser to make AJAX requests and update parts of the page without writing JavaScript:

```html
<!-- Auto-refresh printer table every 5 seconds -->
<div hx-get="/devices/printer-table/" 
     hx-trigger="every 5s" 
     hx-swap="outerHTML">
    <table>
        <!-- Server-rendered printer rows -->
    </table>
</div>

<!-- Filter printers on keyup -->
<input type="text" 
       name="search" 
       hx-get="/devices/printer-table/" 
       hx-trigger="keyup changed delay:500ms" 
       hx-target="#printer-table"
       hx-include="[name='status']">
```

### Django View Pattern

```python
def printer_table_view(request):
    """Return HTML partial for HTMX updates"""
    printers = Printer.objects.filter(active=True)
    
    # Apply filters from HTMX request
    if search := request.GET.get('search'):
        printers = printers.filter(name__icontains=search)
    
    if status := request.GET.get('status'):
        printers = printers.filter(device_health=status)
    
    # Return partial template (no base layout)
    return render(request, 'devices/partials/printer_table.html', {
        'printers': printers
    })
```

## Celery Background Tasks

### Scheduled Tasks

Configured in `Backend/printer/settings.py`:

```python
CELERY_BEAT_SCHEDULE = {
    "discover-printers-daily": {
        "task": "devices.discover_printers",
        "schedule": crontab(hour=2, minute=0),  # 2 AM daily
    },
    "poll-active-printers-every-5min": {
        "task": "devices.poll_active_printers",
        "schedule": 300.0,  # Every 5 minutes
    },
}
```

### Task Descriptions

#### `devices.discover_printers`

Scans the configured subnet (e.g., `192.168.x.x`) for SNMP-enabled printers:

1. Sends SNMP GET requests to all IPs in range
2. Checks for printer-specific OIDs (page count, model)
3. Creates new `Printer` records for discovered devices
4. Runs daily at 2 AM to find new printers

#### `devices.poll_active_printers`

Polls all active printers for status updates:

1. Fetches all `Printer` objects with `active=True`
2. Sends SNMP GET requests for:
   - Current status (Idle/Printing/Warming Up)
   - Total page count
   - Device health (Running/Warning/Down)
   - Toner/supply levels
   - System uptime
3. Updates `Printer` model with latest data
4. Creates `PrinterLog` entry for historical tracking
5. Runs every 5 minutes

## SNMP OIDs Used

| OID | Description | Usage |
|-----|-------------|-------|
| `1.3.6.1.2.1.25.3.5.1.1.1.1` | hrPrinterStatus | Current printer state (3=Idle, 4=Printing, 5=WarmingUp) |
| `1.3.6.1.2.1.43.10.2.1.4.1.1` | prtMarkerLifeCount | Total pages printed |
| `1.3.6.1.2.1.25.3.2.1.5.1` | hrDeviceStatus | Device health (2=Running, 3=Warning, 5=Down) |
| `1.3.6.1.2.1.43.11.1.1.9.1.1` | prtMarkerSuppliesLevel | Toner level (0-100%) |
| `1.3.6.1.2.1.1.3.0` | sysUpTime | System uptime (hundredths of seconds) |
| `1.3.6.1.2.1.1.1.0` | sysDescr | Device model description |
| `1.3.6.1.2.1.1.5.0` | sysName | Device hostname |

## Development

### Running Tests

```bash
# Run all tests
docker-compose exec backend python manage.py test

# Run specific app tests
docker-compose exec backend python manage.py test devices

# Run with coverage
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

### Code Style

```bash
# Format code with black
docker-compose exec backend black .

# Lint with flake8
docker-compose exec backend flake8 .

# Type checking with mypy
docker-compose exec backend mypy .
```

### Database Inspection

```bash
# Show all tables
docker-compose exec backend python manage.py dbshell
\dt

# Show printer count
docker-compose exec backend python manage.py shell
>>> from devices.models import Printer
>>> Printer.objects.count()

# Show recent logs
>>> from devices.models import PrinterLog
>>> PrinterLog.objects.order_by('-timestamp')[:10]
```

## Production Deployment

### Recommended Changes

1. **Disable DEBUG mode**:
   ```python
   DEBUG = False
   ALLOWED_HOSTS = ['your-domain.com']
   ```

2. **Use strong SECRET_KEY**:
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

3. **Serve static files with nginx**:
   ```bash
   docker-compose exec backend python manage.py collectstatic
   ```

4. **Use environment variables for secrets**:
   ```python
   SECRET_KEY = os.environ['SECRET_KEY']
   DATABASE_URL = os.environ['DATABASE_URL']
   ```

5. **Enable HTTPS** (terminate SSL at reverse proxy)

6. **Set up monitoring** (Flower for Celery, Sentry for errors)

### Scaling

```bash
# Scale Celery workers horizontally
docker-compose up -d --scale celery_worker=4

# Increase worker concurrency
command: celery -A printer.celery worker -l info --concurrency=8
```

## Troubleshooting

### Celery Tasks Not Running

```bash
# Check if Celery worker is running
docker-compose ps celery_worker

# Check Celery logs for errors
docker-compose logs celery_worker

# Verify Redis connection
docker-compose exec backend python manage.py shell
>>> from celery import current_app
>>> current_app.connection().ensure_connection(max_retries=3)
```

### SNMP Polling Fails

```bash
# Test SNMP manually
docker-compose exec backend python manage.py shell
>>> from pysnmp.hlapi.v3arch.asyncio import *
>>> import asyncio
>>> # Test connection to printer
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps db

# Test connection
docker-compose exec backend python manage.py dbshell

# Check DATABASE_URL
docker-compose exec backend env | grep DATABASE_URL
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [Your Repository URL]
- Documentation: See `ARCHITECTURE.md` for detailed technical documentation

## Acknowledgments

- **Django**: Web framework
- **HTMX**: Hypermedia-driven interactivity
- **Celery**: Distributed task queue
- **PySNMP**: SNMP protocol implementation
