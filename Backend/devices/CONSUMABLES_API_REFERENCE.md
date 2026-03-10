# Consumables API Reference

## Base URL
```
/api/devices/consumables/
```

## Endpoints

### 1. List Consumables
**GET** `/api/devices/consumables/`

Returns a paginated list of all consumables.

**Query Parameters:**
- `printer` (int) - Filter by printer ID
- `category` (string) - Filter by category: TONER, DRUM, MAINTENANCE_KIT, WASTE_TONER
- `status` (string) - Filter by status: OK, LOW, CRITICAL, EMPTY
- `color` (string) - Filter by color: Black, Cyan, Magenta, Yellow
- `type` (string) - Filter by type: OEM, COMPATIBLE, REMANUFACTURED
- `is_low` (boolean) - Filter low consumables: true/false
- `is_empty` (boolean) - Filter empty consumables: true/false
- `ordering` (string) - Order by field: level_percent, estimated_days_remaining, status, updated_at, pages_printed_with_this
- `search` (string) - Search in name, part_number, serial_number, supplier

**Example Requests:**
```bash
# Get all consumables
GET /api/devices/consumables/

# Get consumables for printer 1
GET /api/devices/consumables/?printer=1

# Get all low toner consumables
GET /api/devices/consumables/?category=TONER&is_low=true

# Get critical consumables ordered by days remaining
GET /api/devices/consumables/?status=CRITICAL&ordering=estimated_days_remaining

# Search for HP consumables
GET /api/devices/consumables/?search=HP

# Get black toner consumables below 20%
GET /api/devices/consumables/?category=TONER&color=Black&ordering=level_percent
```

**Response Example:**
```json
{
  "count": 24,
  "next": "http://localhost:8000/api/devices/consumables/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "printer": 1,
      "name": "Black Toner Cartridge",
      "category": "TONER",
      "color": "Black",
      "type": "OEM",
      "part_number": "HP-CF410A",
      "serial_number": "SN123456789",
      "level_percent": 45,
      "current_level": 900,
      "max_capacity": 2000,
      "estimated_pages_remaining": 1125,
      "estimated_days_remaining": 15.5,
      "pages_printed_with_this": 1100,
      "consumption_rate_per_day": 2.9,
      "cost_per_unit": "89.99",
      "cost_per_page": "0.0818",
      "supplier": "HP Direct",
      "purchase_date": "2024-01-15",
      "status": "LOW",
      "low_threshold_percent": 20,
      "critical_threshold_percent": 10,
      "is_low": false,
      "is_empty": false,
      "installed_at": "2024-01-15T10:30:00Z",
      "last_replaced_at": null,
      "expected_lifetime_pages": 2500,
      "remaining_life_percent": 56,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-02-27T14:20:00Z"
    }
  ]
}
```

---

### 2. Retrieve Consumable
**GET** `/api/devices/consumables/{id}/`

Returns details of a single consumable.

**Example Request:**
```bash
GET /api/devices/consumables/1/
```

**Response:** Same as single object in list response above.

---

### 3. Create Consumable
**POST** `/api/devices/consumables/`

Creates a new consumable record.

**Required Fields:**
- `printer` (int) - Printer ID
- `name` (string) - Consumable name
- `category` (string) - TONER, DRUM, MAINTENANCE_KIT, WASTE_TONER
- `level_percent` (int) - Current level percentage (0-100)

**Optional Fields:**
- `color` (string) - Black, Cyan, Magenta, Yellow
- `type` (string) - OEM, COMPATIBLE, REMANUFACTURED (default: OEM)
- `part_number` (string)
- `serial_number` (string)
- `current_level` (int)
- `max_capacity` (int)
- `estimated_pages_remaining` (int)
- `pages_printed_with_this` (int, default: 0)
- `consumption_rate_per_day` (float)
- `cost_per_unit` (decimal)
- `cost_per_page` (decimal)
- `supplier` (string)
- `purchase_date` (date, format: YYYY-MM-DD)
- `low_threshold_percent` (int, default: 20)
- `critical_threshold_percent` (int, default: 10)
- `installed_at` (datetime)
- `last_replaced_at` (datetime)
- `expected_lifetime_pages` (int)

**Read-Only Fields (auto-calculated):**
- `status` - Calculated from level_percent and thresholds
- `is_low` - Calculated from level_percent
- `is_empty` - Calculated from level_percent
- `estimated_days_remaining` - Calculated from consumption_rate_per_day
- `remaining_life_percent` - Calculated from expected_lifetime_pages
- `created_at`, `updated_at`

**Example Request:**
```bash
POST /api/devices/consumables/
Content-Type: application/json

{
  "printer": 1,
  "name": "Black Toner Cartridge",
  "category": "TONER",
  "color": "Black",
  "type": "OEM",
  "part_number": "HP-CF410A",
  "level_percent": 100,
  "current_level": 2000,
  "max_capacity": 2000,
  "cost_per_unit": "89.99",
  "supplier": "HP Direct",
  "purchase_date": "2024-02-27",
  "expected_lifetime_pages": 2500,
  "installed_at": "2024-02-27T10:00:00Z"
}
```

**Response:** 201 Created with full consumable object.

---

### 4. Update Consumable (Full)
**PUT** `/api/devices/consumables/{id}/`

Replaces all fields of a consumable (requires all required fields).

**Example Request:**
```bash
PUT /api/devices/consumables/1/
Content-Type: application/json

{
  "printer": 1,
  "name": "Black Toner Cartridge",
  "category": "TONER",
  "color": "Black",
  "type": "OEM",
  "level_percent": 45,
  "current_level": 900
}
```

**Response:** 200 OK with updated consumable object.

---

### 5. Update Consumable (Partial)
**PATCH** `/api/devices/consumables/{id}/`

Updates specific fields of a consumable.

**Example Requests:**
```bash
# Update level
PATCH /api/devices/consumables/1/
Content-Type: application/json

{
  "level_percent": 45,
  "current_level": 900
}

# Update cost information
PATCH /api/devices/consumables/1/
Content-Type: application/json

{
  "cost_per_unit": "79.99",
  "supplier": "Office Supply Co"
}

# Record replacement
PATCH /api/devices/consumables/1/
Content-Type: application/json

{
  "level_percent": 100,
  "current_level": 2000,
  "last_replaced_at": "2024-02-27T10:00:00Z",
  "pages_printed_with_this": 0
}
```

**Response:** 200 OK with updated consumable object.

---

### 6. Delete Consumable
**DELETE** `/api/devices/consumables/{id}/`

Deletes a consumable record.

**Example Request:**
```bash
DELETE /api/devices/consumables/1/
```

**Response:** 204 No Content

---

## Integration with Printer API

### Get Printer with Consumables
**GET** `/api/devices/printers/{id}/`

The printer detail endpoint now includes a `consumables` field with all consumables for that printer.

**Example Request:**
```bash
GET /api/devices/printers/1/
```

**Response:**
```json
{
  "id": 1,
  "name": "Finance Printer",
  "ip_address": "192.168.1.100",
  "model_name": "HP LaserJet Pro M404dn",
  "location": "Finance Department",
  "active": true,
  "total_page_count": 12500,
  "latest_supply_levels": [
    {
      "id": 1,
      "name": "Black Toner",
      "category": "Toner",
      "level_percent": 45,
      "max_capacity": 2000,
      "current_level": 900
    }
  ],
  "consumables": [
    {
      "id": 1,
      "printer": 1,
      "name": "Black Toner Cartridge",
      "category": "TONER",
      "color": "Black",
      "level_percent": 45,
      "status": "LOW",
      "estimated_days_remaining": 15.5,
      "is_low": false,
      "is_empty": false,
      ...
    }
  ],
  "today_stats": { ... },
  ...
}
```

---

## Auto-Creation from Logs

When a `PrinterLog` is created with `SupplyLevel` data, the system automatically:

1. **Creates or updates** corresponding `Consumable` records
2. **Matches** by printer + name + category
3. **Extracts** color from supply name (Black, Cyan, Magenta, Yellow)
4. **Calculates** consumption_rate_per_day based on level changes
5. **Estimates** pages_remaining based on printer's daily page count

**Example:**
```bash
# Create a PrinterLog (via polling or manual entry)
POST /api/devices/logs/
{
  "printer": 1,
  "total_pages": 12500,
  "status": "Ready",
  "event_type": "STATUS_CHECK"
}

# If the log has SupplyLevel records, Consumables are auto-created/updated
```

---

## Status Calculation Logic

The `status` field is automatically calculated on save:

| Condition | Status | is_low | is_empty |
|-----------|--------|--------|----------|
| level_percent == 0 | EMPTY | true | true |
| level_percent <= critical_threshold_percent | CRITICAL | true | false |
| level_percent <= low_threshold_percent | LOW | true | false |
| level_percent > low_threshold_percent | OK | false | false |

**Default Thresholds:**
- `low_threshold_percent`: 20
- `critical_threshold_percent`: 10

---

## Common Use Cases

### 1. Dashboard: Show All Low Consumables
```bash
GET /api/devices/consumables/?is_low=true&ordering=estimated_days_remaining
```

### 2. Inventory: List All Consumables by Printer
```bash
GET /api/devices/consumables/?printer=1&ordering=category
```

### 3. Alerts: Critical Toner Levels
```bash
GET /api/devices/consumables/?category=TONER&status=CRITICAL
```

### 4. Cost Analysis: Consumables by Supplier
```bash
GET /api/devices/consumables/?search=HP&ordering=-cost_per_unit
```

### 5. Maintenance: Drums Due for Replacement
```bash
GET /api/devices/consumables/?category=DRUM&ordering=remaining_life_percent
```

### 6. Reporting: All Consumables Updated Today
```bash
GET /api/devices/consumables/?ordering=-updated_at
```

---

## Error Responses

### 400 Bad Request
```json
{
  "printer": ["This field is required."],
  "level_percent": ["Ensure this value is less than or equal to 100."]
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error."
}
```

---

## Notes

- All datetime fields use ISO 8601 format with timezone
- Pagination is enabled by default (page size configurable in settings)
- All endpoints support standard DRF authentication/permissions
- The `consumables` field in PrinterSerializer is read-only (use Consumable endpoints for CRUD)
- The legacy `latest_supply_levels` field remains for backward compatibility
