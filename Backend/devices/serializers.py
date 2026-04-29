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

    latest_supply_levels   = serializers.SerializerMethodField(read_only=True)
    consumables            = ConsumableSerializer(many=True, read_only=True)
    today_stats            = serializers.SerializerMethodField(read_only=True)
    health_score           = serializers.SerializerMethodField(read_only=True)
    predicted_service_info = serializers.SerializerMethodField(read_only=True)
    active_alerts_current  = serializers.SerializerMethodField(read_only=True)
    page_stats             = serializers.SerializerMethodField(read_only=True)

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
            "health_score",
            "predicted_service_info",
            "active_alerts_current",
            "page_stats",
        ]

    def get_latest_supply_levels(self, obj):
        """Return supply levels from the most recent PrinterLog that has supply data.

        Uses the latest log WITH supplies so that offline/status-check logs
        (which have no supply entries) don't hide the last known toner levels.
        """
        last_log = (
            obj.logs
            .filter(supplies__isnull=False)
            .distinct()
            .order_by("-timestamp")
            .first()
        )
        if not last_log:
            return []
        return SupplyLevelSerializer(last_log.supplies.all(), many=True).data

    def get_active_alerts_current(self, obj):
        """Return active_alerts from the most recent poll (latest log entry)."""
        last_log = obj.logs.order_by("-timestamp").first()
        if not last_log:
            return []
        return last_log.active_alerts or []

    def get_page_stats(self, obj):
        """Aggregate page counts: today, this week, this month, last month, plus daily breakdown."""
        from django.utils import timezone
        from datetime import timedelta

        today            = timezone.now().date()
        week_start       = today - timedelta(days=today.weekday())          # Monday
        month_start      = today.replace(day=1)
        last_month_end   = month_start - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        thirty_days_ago  = today - timedelta(days=29)

        stats = list(
            obj.daily_stats
            .filter(date__gte=last_month_start)
            .order_by("date")
            .values("date", "pages_printed_today")
        )

        def _sum(from_date, to_date):
            return sum(
                s["pages_printed_today"] for s in stats
                if from_date <= s["date"] <= to_date
            )

        daily_30 = [
            {"date": str(s["date"]), "pages": s["pages_printed_today"]}
            for s in stats if s["date"] >= thirty_days_ago
        ]

        return {
            "today":      _sum(today, today),
            "this_week":  _sum(week_start, today),
            "this_month": _sum(month_start, today),
            "last_month": _sum(last_month_start, last_month_end),
            "daily":      daily_30,
        }

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

    def get_health_score(self, obj):
        """
        0-100 composite health score.
        100 = perfect, 0 = critical.
        Factors: device health, drum/fuser life, toner, jam rate (30d).
        """
        if obj.device_health == 5:  # Down
            return 0

        score = 100

        if obj.device_health == 3:  # Warning
            score -= 15

        # Drum / fuser life — strongest predictor of repair need
        for c in obj.consumables.filter(category__in=["DRUM", "MAINTENANCE_KIT"]):
            if c.level_percent < 5:
                score -= 35
            elif c.level_percent < 20:
                score -= 20
            elif c.level_percent < 40:
                score -= 8

        # Min toner (operational but not mechanical)
        if obj.min_supply_percent is not None:
            if obj.min_supply_percent < 5:
                score -= 10
            elif obj.min_supply_percent < 10:
                score -= 5

        # Jam rate (30-day window)
        from django.utils import timezone
        from datetime import timedelta
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        stats = list(obj.daily_stats.filter(date__gte=thirty_days_ago))
        total_jams = sum(s.jams_today for s in stats)
        total_pages = sum(s.pages_printed_today for s in stats)
        if total_pages > 100:
            jam_rate = (total_jams / total_pages) * 1000
            if jam_rate > 10:
                score -= 25
            elif jam_rate > 5:
                score -= 15
            elif jam_rate > 2:
                score -= 5

        return max(0, min(100, score))

    def get_predicted_service_info(self, obj):
        """
        Returns maintenance/repair prediction data for decision making.
        Fields:
          health_label: 'Good' | 'Fair' | 'Poor' | 'Critical'
          next_service_reason: human-readable reason for predicted service
          drum_days_remaining: float or null
          drum_pages_remaining: int or null
          jam_rate_30d: jams per 1000 pages over last 30 days
          total_jams_30d: raw jam count
        """
        from django.utils import timezone
        from datetime import timedelta

        info = {
            "health_label": "Good",
            "next_service_reason": None,
            "drum_days_remaining": None,
            "drum_pages_remaining": None,
            "jam_rate_30d": None,
            "total_jams_30d": 0,
            "total_cover_opens_30d": 0,
        }

        # Drum / fuser predictions
        for c in obj.consumables.filter(category="DRUM"):
            info["drum_days_remaining"] = c.estimated_days_remaining
            info["drum_pages_remaining"] = c.estimated_pages_remaining
            if c.level_percent < 20:
                info["next_service_reason"] = (
                    f"Drum unit at {c.level_percent}% — replacement needed soon"
                )
            break

        for c in obj.consumables.filter(category="MAINTENANCE_KIT"):
            if c.level_percent < 20 and not info["next_service_reason"]:
                info["next_service_reason"] = (
                    f"Maintenance kit at {c.level_percent}% — service due"
                )
            break

        # Jam rate (30-day)
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        stats = list(obj.daily_stats.filter(date__gte=thirty_days_ago))
        total_jams = sum(s.jams_today for s in stats)
        total_pages = sum(s.pages_printed_today for s in stats)
        info["total_jams_30d"]        = total_jams
        info["total_cover_opens_30d"] = sum(s.cover_opens_today for s in stats)
        if total_pages > 0:
            info["jam_rate_30d"] = round((total_jams / total_pages) * 1000, 2)
        if total_jams > 10 and not info["next_service_reason"]:
            info["next_service_reason"] = (
                f"High jam frequency: {total_jams} jams in 30 days — inspect paper path"
            )

        # Health label from score
        score = self.get_health_score(obj)
        if score >= 80:
            info["health_label"] = "Good"
        elif score >= 60:
            info["health_label"] = "Fair"
        elif score >= 40:
            info["health_label"] = "Poor"
        else:
            info["health_label"] = "Critical"

        return info
