from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    VIEWER   = 'viewer'
    OPERATOR = 'operator'
    ADMIN    = 'admin'
    ROLE_CHOICES = [
        (VIEWER,   'Viewer'),
        (OPERATOR, 'Operator'),
        (ADMIN,    'Admin'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=VIEWER)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = UserProfile.ADMIN if instance.is_superuser else UserProfile.VIEWER
        UserProfile.objects.get_or_create(user=instance, defaults={'role': role})


class Printer(models.Model):
    """Enterprise printer asset with full configuration and cost tracking."""

    # Real-time status (SNMP-polled)
    class CurrentStatus(models.IntegerChoices):
        IDLE = 3, "Idle"
        PRINTING = 4, "Printing"
        WARMING_UP = 5, "Warming Up"

    class DeviceHealth(models.IntegerChoices):
        RUNNING = 2, "Running"
        WARNING = 3, "Warning"
        DOWN = 5, "Down"

    # Core identification
    name = models.CharField(max_length=100, blank=True, help_text="e.g., Finance Printer")
    ip_address = models.GenericIPAddressField(unique=True)
    mac_address = models.CharField(
        max_length=17, blank=True, null=True, help_text="Physical address for conflict detection"
    )
    serial_number = models.CharField(
        max_length=100, unique=True, null=True, blank=True, help_text="Device serial number"
    )
    model_name = models.CharField(max_length=100, blank=True, help_text="Auto-detected model")
    firmware_version = models.CharField(max_length=100, null=True, blank=True)
    sys_name = models.CharField(
        max_length=255, null=True, blank=True, help_text="Hostname (SNMP sysName)"
    )
    location = models.CharField(max_length=255, blank=True, help_text="SNMP sysLocation")
    active = models.BooleanField(default=True, help_text="Uncheck to stop polling this device")

    # Real-time status fields (polled via SNMP)
    current_status = models.IntegerField(
        choices=CurrentStatus.choices,
        null=True,
        blank=True,
        help_text="3=Idle, 4=Printing, 5=Warming Up",
    )
    device_health = models.IntegerField(
        choices=DeviceHealth.choices,
        null=True,
        blank=True,
        help_text="2=Running, 3=Warning, 5=Down",
    )
    total_page_count = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Lifetime page count from printer",
    )
    last_polled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this device was last polled via SNMP",
    )
    last_latency_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="SNMP response time in milliseconds",
    )
    min_supply_percent = models.IntegerField(
        null=True,
        blank=True,
        help_text="Lowest supply/toner level from last poll (for SRE saturation)",
    )

    # Alerting state (SRE actionable alerting with cool-off)
    is_in_alert_state = models.BooleanField(default=False)
    alert_triggered_at = models.DateTimeField(null=True, blank=True)

    # Asset & lifecycle
    purchase_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    last_serviced_date = models.DateField(null=True, blank=True)
    next_servicing_date = models.DateField(null=True, blank=True)

    # Cost management (per page, in local currency)
    cost_per_page_mono = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True, default=None
    )
    cost_per_page_color = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True, default=None
    )

    # Energy & capacity
    energy_consumption_rate_watts = models.IntegerField(
        null=True, blank=True, help_text="Typical power draw in watts"
    )
    target_monthly_volume = models.IntegerField(
        null=True, blank=True, help_text="Expected monthly page count target"
    )
    maintenance_kit_capacity = models.IntegerField(
        null=True, blank=True, help_text="Pages between maintenance kit replacement"
    )

    def __str__(self):
        return f"{self.name} ({self.ip_address})"

    class Meta:
        verbose_name = "Printer"
        verbose_name_plural = "Printers"


class PrinterLog(models.Model):
    """Stores historical data for trending and root cause analysis."""

    class EventType(models.TextChoices):
        STATUS_CHECK = "STATUS_CHECK", "Status Check"
        PAPER_JAM = "PAPER_JAM", "Paper Jam"
        LOW_TONER = "LOW_TONER", "Low Toner"
        OFFLINE = "OFFLINE", "Offline"
        MAINTENANCE = "MAINTENANCE", "Maintenance"

    printer = models.ForeignKey(Printer, on_delete=models.CASCADE, related_name="logs")
    timestamp = models.DateTimeField(auto_now_add=True)
    total_pages = models.IntegerField(null=True)

    # Human-readable status from printer's SNMP alert table
    status = models.CharField(max_length=100, default="Unknown")

    # Deep-dive: exact text shown on printer screen (e.g., "Sleep mode on")
    console_display = models.CharField(max_length=255, null=True, blank=True)
    # Paper sources: list of dicts {source, size, capacity, current, status} (or legacy dict)
    tray_status = models.JSONField(default=list, blank=True)
    # List of active error/alert messages
    active_alerts = models.JSONField(default=list, blank=True)

    # Printer-reported system uptime in seconds (sysUpTime from SNMP)
    system_uptime_seconds = models.IntegerField(null=True, blank=True)

    # Event classification for root cause analysis
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.STATUS_CHECK,
    )
    error_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Vendor-specific error code, e.g., 40.00.01",
    )

    def __str__(self):
        return f"{self.printer.name} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        verbose_name = "Printer Log"
        verbose_name_plural = "Printer Logs"
        ordering = ["-timestamp"]


class PrinterDailyStat(models.Model):
    """Aggregated daily performance for fast dashboard queries."""

    printer = models.ForeignKey(
        Printer, on_delete=models.CASCADE, related_name="daily_stats"
    )
    date = models.DateField(db_index=True)

    # Volume
    total_pages_printed = models.IntegerField(default=0)
    avg_latency_ms = models.IntegerField(default=0)
    pages_printed_today = models.IntegerField(default=0, help_text="Pages printed this day")

    # Incidents
    jam_count = models.IntegerField(default=0)
    jams_today = models.IntegerField(default=0, help_text="Paper jams this day")
    error_count = models.IntegerField(default=0)

    # Time breakdown (minutes)
    uptime_minutes = models.IntegerField(default=0)
    idle_minutes = models.IntegerField(default=0)
    downtime_minutes = models.IntegerField(default=0)
    sleep_time_minutes = models.IntegerField(default=0)

    # Energy (kWh) - typically: (uptime_minutes/60) * (watts/1000)
    energy_usage_kwh = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    class Meta:
        verbose_name = "Printer Daily Stat"
        verbose_name_plural = "Printer Daily Stats"
        unique_together = [["printer", "date"]]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.printer.name} - {self.date}"


class SupplyLevel(models.Model):
    """Tracks individual supplies (Black Toner, Waste Bin, etc.)"""

    log = models.ForeignKey(PrinterLog, on_delete=models.CASCADE, related_name="supplies")
    name = models.CharField(max_length=100)  # e.g., "Black Toner"
    category = models.CharField(max_length=50)  # e.g., "Toner", "Maintenance", "Waste"
    level_percent = models.IntegerField()
    max_capacity = models.IntegerField(null=True)
    current_level = models.IntegerField(null=True)

    def __str__(self):
        return f"{self.name}: {self.level_percent}%"

    class Meta:
        verbose_name = "Supply Level"
        verbose_name_plural = "Supply Levels"


class Consumable(models.Model):
    """Full consumables tracking with analytics, predictions, and cost management."""

    class Category(models.TextChoices):
        TONER = "TONER", "Toner"
        DRUM = "DRUM", "Drum"
        MAINTENANCE_KIT = "MAINTENANCE_KIT", "Maintenance Kit"
        WASTE_TONER = "WASTE_TONER", "Waste Toner"

    class Type(models.TextChoices):
        OEM = "OEM", "OEM"
        COMPATIBLE = "COMPATIBLE", "Compatible"
        REMANUFACTURED = "REMANUFACTURED", "Remanufactured"

    class Status(models.TextChoices):
        OK = "OK", "OK"
        LOW = "LOW", "Low"
        CRITICAL = "CRITICAL", "Critical"
        EMPTY = "EMPTY", "Empty"

    # Core identification
    printer = models.ForeignKey(Printer, on_delete=models.CASCADE, related_name="consumables")
    name = models.CharField(max_length=100, help_text="e.g., Black Toner Cartridge")
    category = models.CharField(max_length=20, choices=Category.choices)
    color = models.CharField(
        max_length=50, null=True, blank=True, help_text="Black, Cyan, Magenta, Yellow"
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.OEM)
    part_number = models.CharField(max_length=100, null=True, blank=True)
    serial_number = models.CharField(max_length=100, null=True, blank=True)

    # Levels & capacity
    level_percent = models.IntegerField(help_text="Current level as percentage")
    current_level = models.IntegerField(null=True, blank=True, help_text="Current level in units")
    max_capacity = models.IntegerField(
        null=True, blank=True, help_text="Maximum capacity in units"
    )
    estimated_pages_remaining = models.IntegerField(
        null=True, blank=True, help_text="Estimated pages remaining"
    )
    estimated_days_remaining = models.FloatField(
        null=True, blank=True, help_text="Estimated days until empty"
    )

    # Usage tracking
    pages_printed_with_this = models.IntegerField(
        default=0, help_text="Total pages printed with this consumable"
    )
    consumption_rate_per_day = models.FloatField(
        null=True, blank=True, help_text="Average consumption rate per day (%)"
    )

    # Cost tracking
    cost_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Purchase cost per unit",
    )
    cost_per_page = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Calculated cost per page",
    )
    supplier = models.CharField(max_length=100, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)

    # Status & alerts
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OK)
    low_threshold_percent = models.IntegerField(
        default=20, help_text="Threshold for low status"
    )
    critical_threshold_percent = models.IntegerField(
        default=10, help_text="Threshold for critical status"
    )
    is_low = models.BooleanField(default=False)
    is_empty = models.BooleanField(default=False)

    # Lifecycle
    installed_at = models.DateTimeField(null=True, blank=True)
    last_replaced_at = models.DateTimeField(null=True, blank=True)
    expected_lifetime_pages = models.IntegerField(
        null=True, blank=True, help_text="Expected pages for this consumable type"
    )
    remaining_life_percent = models.IntegerField(
        null=True, blank=True, help_text="Remaining life percentage"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Override save to automatically update status and predictions."""
        # Update status based on level
        if self.level_percent == 0:
            self.status = self.Status.EMPTY
            self.is_empty = True
            self.is_low = True
        elif self.level_percent <= self.critical_threshold_percent:
            self.status = self.Status.CRITICAL
            self.is_low = True
            self.is_empty = False
        elif self.level_percent <= self.low_threshold_percent:
            self.status = self.Status.LOW
            self.is_low = True
            self.is_empty = False
        else:
            self.status = self.Status.OK
            self.is_low = False
            self.is_empty = False

        # Calculate estimated days remaining
        if self.consumption_rate_per_day and self.consumption_rate_per_day > 0:
            self.estimated_days_remaining = self.level_percent / self.consumption_rate_per_day

        # Calculate remaining life percent
        if self.expected_lifetime_pages and self.expected_lifetime_pages > 0:
            self.remaining_life_percent = int(
                ((self.expected_lifetime_pages - self.pages_printed_with_this)
                 / self.expected_lifetime_pages)
                * 100
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.printer.name} - {self.name} ({self.level_percent}%)"

    class Meta:
        verbose_name = "Consumable"
        verbose_name_plural = "Consumables"
        ordering = ["-updated_at"]
