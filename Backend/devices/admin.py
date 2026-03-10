from django.contrib import admin

from .models import Printer, PrinterLog, PrinterDailyStat, SupplyLevel, Consumable


class SupplyLevelInline(admin.TabularInline):
    """Shows toner levels directly inside the Log view"""
    model = SupplyLevel
    extra = 0
    readonly_fields = ('name', 'category', 'level_percent', 'max_capacity', 'current_level')
    can_delete = False

@admin.register(Printer)
class PrinterAdmin(admin.ModelAdmin):
    list_display = ('name', 'ip_address', 'model_name', 'location', 'active')
    search_fields = ('name', 'ip_address', 'model_name')
    list_filter = ('active', 'location')
    fieldsets = (
        (None, {
            'fields': ('name', 'ip_address', 'mac_address', 'model_name', 'location', 'active')
        }),
        ('Asset & Lifecycle', {
            'fields': ('purchase_date', 'warranty_expiry')
        }),
        ('Cost & Capacity', {
            'fields': ('cost_per_page_mono', 'cost_per_page_color', 'target_monthly_volume',
                       'maintenance_kit_capacity', 'energy_consumption_rate_watts')
        }),
    )

@admin.register(PrinterLog)
class PrinterLogAdmin(admin.ModelAdmin):
    list_display = ('printer', 'timestamp', 'event_type', 'status', 'error_code', 'total_pages')
    list_filter = ('event_type', 'status', 'timestamp', 'printer')
    inlines = [SupplyLevelInline]  # This shows the supplies inside the log
    readonly_fields = ('timestamp',)

@admin.register(PrinterDailyStat)
class PrinterDailyStatAdmin(admin.ModelAdmin):
    list_display = ('printer', 'date', 'total_pages_printed', 'jam_count', 'error_count',
                    'uptime_minutes', 'downtime_minutes', 'energy_usage_kwh')
    list_filter = ('date', 'printer')
    date_hierarchy = 'date'


@admin.register(Consumable)
class ConsumableAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'printer', 'category', 'color', 'level_percent', 'status',
        'estimated_days_remaining', 'is_low', 'updated_at'
    )
    list_filter = ('category', 'status', 'type', 'is_low', 'is_empty', 'printer')
    search_fields = ('name', 'part_number', 'serial_number', 'supplier')
    readonly_fields = (
        'status', 'is_low', 'is_empty', 'estimated_days_remaining',
        'remaining_life_percent', 'created_at', 'updated_at'
    )
    fieldsets = (
        ('Identification', {
            'fields': ('printer', 'name', 'category', 'color', 'type', 'part_number', 'serial_number')
        }),
        ('Levels & Capacity', {
            'fields': ('level_percent', 'current_level', 'max_capacity', 
                      'estimated_pages_remaining', 'estimated_days_remaining')
        }),
        ('Usage Tracking', {
            'fields': ('pages_printed_with_this', 'consumption_rate_per_day')
        }),
        ('Cost Tracking', {
            'fields': ('cost_per_unit', 'cost_per_page', 'supplier', 'purchase_date')
        }),
        ('Status & Alerts', {
            'fields': ('status', 'low_threshold_percent', 'critical_threshold_percent', 
                      'is_low', 'is_empty')
        }),
        ('Lifecycle', {
            'fields': ('installed_at', 'last_replaced_at', 'expected_lifetime_pages', 
                      'remaining_life_percent')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )