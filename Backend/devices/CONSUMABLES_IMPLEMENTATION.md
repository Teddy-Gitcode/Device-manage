# Consumables Tracking System Implementation

## Overview

This implementation extends the Django REST Framework backend to support full consumables (toner, drum, maintenance kit, waste toner) tracking with analytics, predictions, and cost management.

## Changes Made

### 1. New Model: `Consumable` (models.py)

Created a comprehensive `Consumable` model with the following features:

**Core Identification:**
- Printer (ForeignKey with related_name="consumables")
- Name, category (TONER, DRUM, MAINTENANCE_KIT, WASTE_TONER)
- Color (Black, Cyan, Magenta, Yellow)
- Type (OEM, COMPATIBLE, REMANUFACTURED)
- Part number, serial number

**Levels & Capacity:**
- level_percent, current_level, max_capacity
- estimated_pages_remaining, estimated_days_remaining

**Usage Tracking:**
- pages_printed_with_this
- consumption_rate_per_day

**Cost Tracking:**
- cost_per_unit, cost_per_page
- supplier, purchase_date

**Status & Alerts:**
- status (OK, LOW, CRITICAL, EMPTY)
- low_threshold_percent (default: 20)
- critical_threshold_percent (default: 10)
- is_low, is_empty (auto-calculated)

**Lifecycle:**
- installed_at, last_replaced_at
- expected_lifetime_pages, remaining_life_percent

**Business Logic (save override):**
- Automatically calculates status based on level_percent and thresholds
- Calculates estimated_days_remaining from consumption_rate_per_day
- Calculates remaining_life_percent from expected_lifetime_pages

### 2. Serializer: `ConsumableSerializer` (serializers.py)

- Full serialization of all Consumable fields
- Read-only fields: status, is_low, is_empty, estimated_days_remaining, remaining_life_percent, created_at, updated_at
- Printer is writable via ID

### 3. ViewSet: `ConsumableViewSet` (views.py)

Full CRUD operations with filtering and ordering:

**Endpoints:**
- GET `/api/devices/consumables/` - List all consumables
- GET `/api/devices/consumables/{id}/` - Retrieve single consumable
- POST `/api/devices/consumables/` - Create new consumable
- PUT/PATCH `/api/devices/consumables/{id}/` - Update consumable
- DELETE `/api/devices/consumables/{id}/` - Delete consumable

**Filtering:**
- `?printer={id}` - Filter by printer ID
- `?category={TONER|DRUM|MAINTENANCE_KIT|WASTE_TONER}` - Filter by category
- `?status={OK|LOW|CRITICAL|EMPTY}` - Filter by status
- `?color={Black|Cyan|Magenta|Yellow}` - Filter by color
- `?type={OEM|COMPATIBLE|REMANUFACTURED}` - Filter by type
- `?is_low=true` - Filter low consumables
- `?is_empty=true` - Filter empty consumables

**Ordering:**
- `?ordering=level_percent` - Order by level
- `?ordering=estimated_days_remaining` - Order by days remaining
- `?ordering=status` - Order by status
- `?ordering=updated_at` - Order by last update
- `?ordering=pages_printed_with_this` - Order by usage

**Search:**
- Searches across: name, part_number, serial_number, supplier

### 4. Integration with PrinterSerializer (serializers.py)

Added `consumables` field to `PrinterSerializer`:
```python
consumables = ConsumableSerializer(many=True, read_only=True)
```

**Note:** The existing `latest_supply_levels` field is kept for backward compatibility. Both fields are now available:
- `latest_supply_levels` - Legacy supply levels from PrinterLog (deprecated but functional)
- `consumables` - New full consumables tracking with analytics

### 5. Auto-Create Consumables from Logs (signals.py)

Created signal handler that automatically creates/updates Consumable records when PrinterLog is saved:

**Matching Logic:**
- Matches by printer + name + category
- Maps SupplyLevel category to Consumable category
- Extracts color from supply name (Black, Cyan, Magenta, Yellow)

**Updates:**
- level_percent, current_level, max_capacity
- Calculates consumption_rate_per_day based on level changes over time
- Estimates pages_remaining based on printer's daily page count

**Signal Registration:**
- Registered in `apps.py` via `ready()` method

### 6. Admin Interface (admin.py)

Created `ConsumableAdmin` with:
- List display: name, printer, category, color, level_percent, status, estimated_days_remaining
- Filters: category, status, type, is_low, is_empty, printer
- Search: name, part_number, serial_number, supplier
- Organized fieldsets for easy data entry
- Read-only calculated fields

### 7. Migration (migrations/0010_add_consumable_model.py)

Created migration file for the new Consumable model.

## API Examples

### List all consumables
```bash
GET /api/devices/consumables/
```

### Get consumables for a specific printer
```bash
GET /api/devices/consumables/?printer=1
```

### Get low toner consumables
```bash
GET /api/devices/consumables/?category=TONER&is_low=true
```

### Get critical status consumables ordered by days remaining
```bash
GET /api/devices/consumables/?status=CRITICAL&ordering=estimated_days_remaining
```

### Create a new consumable
```bash
POST /api/devices/consumables/
{
  "printer": 1,
  "name": "Black Toner Cartridge",
  "category": "TONER",
  "color": "Black",
  "type": "OEM",
  "part_number": "HP-CF410A",
  "level_percent": 85,
  "current_level": 1700,
  "max_capacity": 2000,
  "cost_per_unit": 89.99,
  "supplier": "HP Direct",
  "purchase_date": "2024-01-15",
  "expected_lifetime_pages": 2500
}
```

### Update consumable level
```bash
PATCH /api/devices/consumables/1/
{
  "level_percent": 45,
  "current_level": 900
}
```

### Get printer with consumables
```bash
GET /api/devices/printers/1/
```
Response includes both:
- `latest_supply_levels` (legacy)
- `consumables` (new full tracking)

## Running Migrations

```bash
cd Backend
python manage.py makemigrations
python manage.py migrate
```

## Testing the Implementation

1. Create a printer via admin or API
2. Create a PrinterLog with SupplyLevel data
3. Check that Consumable records are auto-created via signal
4. Query consumables via API with various filters
5. Update consumable levels and verify status changes

## Backward Compatibility

✅ **No breaking changes:**
- All existing endpoints remain unchanged
- Existing Printer fields unchanged
- Existing PrinterLog logic unchanged
- `latest_supply_levels` still works (can be marked as deprecated in future)

## Future Enhancements

Potential additions:
- Consumable replacement history tracking
- Predictive ordering alerts
- Cost analysis reports
- Supplier performance metrics
- Bulk import/export of consumables
- Integration with inventory management systems
