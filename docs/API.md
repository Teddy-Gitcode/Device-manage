# Device Management API Reference

Base URL for all endpoints: **`/api/devices/`**

All list endpoints support pagination (Django REST Framework default). Request/response bodies are JSON.

---

## Table of Contents

1. [Printers](#1-printers)
2. [Printer Logs](#2-printer-logs)
3. [Printer Daily Stats](#3-printer-daily-stats)
4. [Serializers Reference](#4-serializers-reference)

---

## 1. Printers

**Resource:** `/api/devices/printers/`  
**ViewSet:** `PrinterViewSet` (full CRUD)  
**Serializer:** `PrinterSerializer`

Default list returns **active printers only** (`active=True`). Use query params to include inactive or filter further.

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/devices/printers/` | List printers (active by default) |
| `POST` | `/api/devices/printers/` | Create a printer |
| `GET` | `/api/devices/printers/{id}/` | Retrieve one printer |
| `PUT` | `/api/devices/printers/{id}/` | Full update |
| `PATCH` | `/api/devices/printers/{id}/` | Partial update |
| `DELETE` | `/api/devices/printers/{id}/` | Delete printer |

### Query Parameters (list)

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search in `ip_address`, `name`, `model_name`, `location` |
| `ordering` | string | Sort by: `name`, `ip_address`, `last_polled_at`, `current_status`, `device_health`, `total_page_count`. Prefix with `-` for descending (e.g. `-last_polled_at`) |
| `active` | boolean | `true`/`1` = active only, `false`/`0` = inactive only; omit = active only |
| `current_status` | int | Filter by status: `3` Idle, `4` Printing, `5` Warming Up |
| `device_health` | int | Filter by health: `2` Running, `3` Warning, `5` Down |

### Custom Actions

| Method | URL | Description | Response |
|--------|-----|-------------|----------|
| `POST` | `/api/devices/printers/discover/` | Start network discovery (Celery task) | `202`: `{ "status": "started", "message": "Discovery in progress.", "task_id": "<uuid>" }` |
| `POST` | `/api/devices/printers/poll/` | Trigger poll of all active printers (Celery task) | `202`: `{ "status": "started", "message": "Polling in progress.", "task_id": "<uuid>" }` |
| `GET` | `/api/devices/printers/sre-signals/` | Google SRE Four Golden Signals (traffic, errors, saturation, latency) | See [SRE Signals response](#sre-signals-response) below |

#### SRE Signals response

When there are active printers:

```json
{
  "traffic": { "pages_per_hour": 42 },
  "errors": {
    "current_error_rate": 5.5,
    "error_count": 2,
    "total_active": 36
  },
  "saturation": { "low_toner_count": 3 },
  "latency": { "network_latency_avg": 120 }
}
```

When there are no active printers, same keys with zeros.

---

## 2. Printer Logs

**Resource:** `/api/devices/logs/`  
**ViewSet:** `PrinterLogViewSet` (read-only: list, retrieve)  
**Serializer:** `PrinterLogSerializer`

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/devices/logs/` | List logs (newest first) |
| `GET` | `/api/devices/logs/{id}/` | Retrieve one log |

### Query Parameters (list)

| Param | Type | Description |
|-------|------|-------------|
| `printer` | int | Filter by printer ID |
| `event_type` | string | One of: `STATUS_CHECK`, `PAPER_JAM`, `LOW_TONER`, `OFFLINE`, `MAINTENANCE` |
| `ordering` | string | Ordering (default: `-timestamp`) |

---

## 3. Printer Daily Stats

**Resource:** `/api/devices/daily-stats/`  
**ViewSet:** `PrinterDailyStatViewSet` (read-only: list, retrieve)  
**Serializer:** `PrinterDailyStatSerializer`

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/devices/daily-stats/` | List daily stats (newest date first) |
| `GET` | `/api/devices/daily-stats/{id}/` | Retrieve one daily stat |

### Query Parameters (list)

| Param | Type | Description |
|-------|------|-------------|
| `printer` | int | Filter by printer ID |
| `date` | string | Filter by date (YYYY-MM-DD) |
| `ordering` | string | Ordering (default: `-date`) |

---

## 4. Serializers Reference

### PrinterSerializer (read/write for CRUD)

Used for **list**, **create**, **retrieve**, **update**, **partial_update**.  
Nested fields `latest_supply_levels` and `today_stats` are **read-only** (computed).

| Field | Type | Read/Write | Description |
|-------|------|------------|-------------|
| `id` | int | read | PK |
| `name` | string | read/write | e.g. "Finance Printer" |
| `ip_address` | string (IP) | read/write | Unique |
| `mac_address` | string \| null | read/write | Max 17 chars |
| `serial_number` | string \| null | read/write | Unique |
| `model_name` | string | read/write | Auto-detected model |
| `firmware_version` | string \| null | read/write | |
| `sys_name` | string \| null | read/write | Hostname (SNMP sysName) |
| `location` | string | read/write | SNMP sysLocation |
| `active` | boolean | read/write | Default true; false stops polling |
| `current_status` | int \| null | read/write | 3=Idle, 4=Printing, 5=Warming Up |
| `device_health` | int \| null | read/write | 2=Running, 3=Warning, 5=Down |
| `total_page_count` | int \| null | read/write | Lifetime page count |
| `last_polled_at` | datetime \| null | read | Set by backend |
| `last_latency_ms` | int \| null | read | SNMP response time (ms) |
| `min_supply_percent` | int \| null | read | Lowest supply % (SRE saturation) |
| `purchase_date` | date \| null | read/write | |
| `warranty_expiry` | date \| null | read/write | |
| `last_serviced_date` | date \| null | read/write | |
| `next_servicing_date` | date \| null | read/write | |
| `cost_per_page_mono` | decimal \| null | read/write | |
| `cost_per_page_color` | decimal \| null | read/write | |
| `energy_consumption_rate_watts` | int \| null | read/write | |
| `target_monthly_volume` | int \| null | read/write | |
| `maintenance_kit_capacity` | int \| null | read/write | |
| `latest_supply_levels` | array | **read-only** | From latest PrinterLog; array of [SupplyLevel](#supplylevelserializer) |
| `today_stats` | object \| null | **read-only** | Today's [PrinterDailyStat](#printerdailystatserializer) or null |

---

### PrinterLogSerializer (read-only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | PK |
| `printer` | int | Printer ID (FK) |
| `timestamp` | datetime | |
| `total_pages` | int \| null | |
| `status` | string | Human-readable status from SNMP |
| `console_display` | string \| null | Text shown on printer screen |
| `tray_status` | array | Paper sources (list of objects) |
| `active_alerts` | array | Active error/alert messages |
| `system_uptime_seconds` | int \| null | SNMP sysUpTime |
| `event_type` | string | `STATUS_CHECK`, `PAPER_JAM`, `LOW_TONER`, `OFFLINE`, `MAINTENANCE` |
| `error_code` | string \| null | Vendor-specific, e.g. "40.00.01" |

---

### PrinterDailyStatSerializer (read-only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | PK |
| `printer` | int | Printer ID (FK) |
| `date` | date | YYYY-MM-DD |
| `total_pages_printed` | int | |
| `pages_printed_today` | int | Pages that day |
| `jam_count` | int | |
| `jams_today` | int | Jams that day |
| `error_count` | int | |
| `avg_latency_ms` | int | |
| `uptime_minutes` | int | |
| `idle_minutes` | int | |
| `downtime_minutes` | int | |
| `sleep_time_minutes` | int | |
| `energy_usage_kwh` | decimal \| null | |

---

### SupplyLevelSerializer (nested only)

Used inside `PrinterSerializer.latest_supply_levels`; not a top-level API resource.

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | PK |
| `name` | string | e.g. "Black Toner" |
| `category` | string | e.g. "Toner", "Maintenance", "Waste" |
| `level_percent` | int | |
| `max_capacity` | int \| null | |
| `current_level` | int \| null | |

---

## Enums (for frontend)

**Printer.current_status**

- `3` — Idle  
- `4` — Printing  
- `5` — Warming Up  

**Printer.device_health**

- `2` — Running  
- `3` — Warning  
- `5` — Down  

**PrinterLog.event_type**

- `STATUS_CHECK`  
- `PAPER_JAM`  
- `LOW_TONER`  
- `OFFLINE`  
- `MAINTENANCE`  

---

## Summary: URL Map

```
GET    /api/devices/printers/              → list printers
POST   /api/devices/printers/              → create printer
GET    /api/devices/printers/{id}/         → get printer
PUT    /api/devices/printers/{id}/         → full update
PATCH  /api/devices/printers/{id}/         → partial update
DELETE /api/devices/printers/{id}/         → delete printer
POST   /api/devices/printers/discover/     → start discovery
POST   /api/devices/printers/poll/         → start poll
GET    /api/devices/printers/sre-signals/  → SRE four golden signals

GET    /api/devices/logs/                  → list logs
GET    /api/devices/logs/{id}/             → get log

GET    /api/devices/daily-stats/           → list daily stats
GET    /api/devices/daily-stats/{id}/      → get daily stat
```
