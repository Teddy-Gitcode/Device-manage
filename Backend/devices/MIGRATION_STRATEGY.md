# Enterprise Fleet Management — Migration Strategy

## Overview

Migration `0003_enterprise_fleet_management` adds asset management fields to `Printer`, introduces `PrinterDailyStat` for aggregated reporting, and extends `PrinterLog` for root cause analysis.

## Applied Changes

### 1. Printer Model (Additive)

| Field | Type | Notes |
|-------|------|-------|
| `purchase_date` | DateField | nullable |
| `warranty_expiry` | DateField | nullable |
| `cost_per_page_mono` | DecimalField(10,4) | nullable |
| `cost_per_page_color` | DecimalField(10,4) | nullable |
| `energy_consumption_rate_watts` | IntegerField | nullable |
| `target_monthly_volume` | IntegerField | nullable |
| `maintenance_kit_capacity` | IntegerField | nullable |

**Strategy:** All fields are nullable. Existing printers continue to work. Populate via Admin or bulk import.

### 2. PrinterLog Model

| Change | Details |
|--------|---------|
| `event_type` | CharField, choices: STATUS_CHECK, PAPER_JAM, LOW_TONER, OFFLINE, MAINTENANCE. Default: `STATUS_CHECK` |
| `error_code` | CharField(50), nullable. Vendor codes (e.g., 40.00.01) |
| `status` | max_length increased 50 → 100 for longer alert strings |

**Strategy:** Existing logs default to `event_type=STATUS_CHECK`. Update `scan_printers.py` to set `event_type` and `error_code` when creating logs based on SNMP alerts.

### 3. PrinterDailyStat Model (New)

Stores one row per printer per day for fast dashboard queries.

| Field | Type |
|-------|------|
| printer | FK |
| date | DateField (indexed) |
| total_pages_printed | IntegerField |
| jam_count | IntegerField |
| error_count | IntegerField |
| uptime_minutes | IntegerField |
| idle_minutes | IntegerField |
| downtime_minutes | IntegerField |
| energy_usage_kwh | DecimalField(12,4), nullable |

**Unique constraint:** (printer, date) — one stat row per printer per day.

## Next Steps

1. **Aggregation job:** Add a management command (e.g., `aggregate_daily_stats`) that:
   - Reads `PrinterLog` for each day
   - Counts jams (`event_type=PAPER_JAM`), errors, page deltas
   - Estimates uptime/downtime from log frequency
   - Computes `energy_usage_kwh = (uptime_minutes/60) * (watts/1000)`
   - Creates/updates `PrinterDailyStat` rows

2. **Update `scan_printers.py`:** Map status strings to `event_type`:
   - "Offline" → OFFLINE
   - "Paper Jam" / 🔥 alerts → PAPER_JAM
   - Low toner from supplies → LOW_TONER
   - Normal scan → STATUS_CHECK

3. **Dashboard:** Add views that query `PrinterDailyStat` instead of raw logs for fleet-wide summaries.

## Rollback

```bash
python manage.py migrate devices 0002_printer_mac_address_alter_printer_name
```

This drops `PrinterDailyStat` and the new Printer/PrinterLog fields. Data in those fields will be lost.
