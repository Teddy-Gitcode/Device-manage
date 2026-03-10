"""
Django REST Framework serializers for the devices app.
"""
from rest_framework import serializers

from .models import Printer, PrinterLog, PrinterDailyStat, SupplyLevel, Consumable


class SupplyLevelSerializer(serializers.ModelSerializer):
    """Serializer for supply levels (toner, waste bin, etc.)."""

    class Meta:
        model = SupplyLevel
        fields = ["id", "name", "category", "level_percent", "max_capacity", "current_level"]


class PrinterLogSerializer(serializers.ModelSerializer):
    """Standard serializer for PrinterLog."""

    class Meta:
        model = PrinterLog
        fields = [
            "id",
            "printer",
            "timestamp",
            "total_pages",
            "status",
            "console_display",
            "tray_status",
            "active_alerts",
            "system_uptime_seconds",
            "event_type",
            "error_code",
        ]


class PrinterDailyStatSerializer(serializers.ModelSerializer):
    """Standard serializer for PrinterDailyStat."""

    class Meta:
        model = PrinterDailyStat
        fields = [
            "id",
            "printer",
            "date",
            "total_pages_printed",
            "pages_printed_today",
            "jam_count",
            "jams_today",
            "error_count",
            "avg_latency_ms",
            "uptime_minutes",
            "idle_minutes",
            "downtime_minutes",
            "sleep_time_minutes",
            "energy_usage_kwh",
        ]


class ConsumableSerializer(serializers.ModelSerializer):
    """Serializer for Consumable with full tracking and analytics."""

    class Meta:
        model = Consumable
        fields = [
            "id",
            "printer",
            "name",
            "category",
            "color",
            "type",
            "part_number",
            "serial_number",
            "level_percent",
            "current_level",
            "max_capacity",
            "estimated_pages_remaining",
            "estimated_days_remaining",
            "pages_printed_with_this",
            "consumption_rate_per_day",
            "cost_per_unit",
            "cost_per_page",
            "supplier",
            "purchase_date",
            "status",
            "low_threshold_percent",
            "critical_threshold_percent",
            "is_low",
            "is_empty",
            "installed_at",
            "last_replaced_at",
            "expected_lifetime_pages",
            "remaining_life_percent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "is_low",
            "is_empty",
            "estimated_days_remaining",
            "remaining_life_percent",
            "created_at",
            "updated_at",
        ]


class PrinterSerializer(serializers.ModelSerializer):
    """Serializer for Printer with nested latest supply levels and today's stats (read-only)."""

    latest_supply_levels = serializers.SerializerMethodField(read_only=True)
    consumables = ConsumableSerializer(many=True, read_only=True)
    today_stats = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Printer
        fields = [
            "id",
            "name",
            "ip_address",
            "mac_address",
            "serial_number",
            "model_name",
            "firmware_version",
            "sys_name",
            "location",
            "active",
            "current_status",
            "device_health",
            "total_page_count",
            "last_polled_at",
            "last_latency_ms",
            "min_supply_percent",
            "purchase_date",
            "warranty_expiry",
            "last_serviced_date",
            "next_servicing_date",
            "cost_per_page_mono",
            "cost_per_page_color",
            "energy_consumption_rate_watts",
            "target_monthly_volume",
            "maintenance_kit_capacity",
            "latest_supply_levels",
            "consumables",
            "today_stats",
        ]

    def get_latest_supply_levels(self, obj):
        """Return supply levels from the most recent PrinterLog for this printer."""
        last_log = obj.logs.order_by("-timestamp").first()
        if not last_log:
            return []
        supplies = last_log.supplies.all()
        return SupplyLevelSerializer(supplies, many=True).data

    def get_today_stats(self, obj):
        """Return today's PrinterDailyStat for deep analytics (uses prefetched today_stats_list)."""
        stats = getattr(obj, "today_stats_list", None)
        if stats is None:
            from django.utils import timezone

            stat = obj.daily_stats.filter(date=timezone.now().date()).first()
        else:
            stat = stats[0] if stats else None
        if not stat:
            return None
        return PrinterDailyStatSerializer(stat).data
