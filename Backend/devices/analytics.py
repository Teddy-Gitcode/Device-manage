"""
Predictive & Efficiency analytics for the Enterprise Fleet Management system.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from django.db.models import Sum

from .models import Printer, PrinterLog, PrinterDailyStat, SupplyLevel


def calculate_weekly_uptime(printer: Printer) -> Optional[float]:
    """
    Returns % uptime over the last 7 days based on PrinterDailyStat.
    Uptime = (uptime_minutes + idle_minutes) / total_tracked_minutes * 100.
    """
    week_ago = date.today() - timedelta(days=7)
    stats = PrinterDailyStat.objects.filter(
        printer=printer, date__gte=week_ago, date__lt=date.today()
    ).aggregate(
        uptime=Sum("uptime_minutes"),
        idle=Sum("idle_minutes"),
        downtime=Sum("downtime_minutes"),
    )
    total_operational = (stats["uptime"] or 0) + (stats["idle"] or 0)
    total_tracked = total_operational + (stats["downtime"] or 0)
    if total_tracked <= 0:
        return None
    return round(100.0 * total_operational / total_tracked, 2)


def predict_toner_depletion(printer: Printer) -> Optional[date]:
    """
    Use simple linear regression on the last 30 days of primary toner levels
    to predict the date the toner hits 0%.
    Returns None if insufficient data.
    """
    days_back = 30
    start = date.today() - timedelta(days=days_back)

    # Get daily toner levels: (date, level) for primary toner (e.g. Black)
    # Group logs by date, take latest log per day, extract first Toner supply
    logs = (
        PrinterLog.objects.filter(printer=printer, timestamp__date__gte=start)
        .order_by("timestamp")
        .select_related()
        .prefetch_related("supplies")
    )

    # Build (day_index, level) pairs per supply name, then use primary
    by_supply = {}  # name -> [(day_idx, level), ...]
    day_to_idx = {}
    seen_dates = set()

    for log in logs:
        log_date = log.timestamp.date()
        if log_date >= date.today():
            continue
        if log_date not in day_to_idx:
            day_to_idx[log_date] = (log_date - start).days
        day_idx = day_to_idx[log_date]

        for s in log.supplies.filter(category="Toner"):
            if s.name not in by_supply:
                by_supply[s.name] = []
            # Keep latest reading per day per supply
            existing = [p for p in by_supply[s.name] if p[0] == day_idx]
            for p in existing:
                by_supply[s.name].remove(p)
            by_supply[s.name].append((day_idx, s.level_percent))

    if not by_supply:
        return None

    # Use the supply with the most data points (typically Black Toner)
    best_name = max(by_supply.keys(), key=lambda n: len(by_supply[n]))
    points = sorted(by_supply[best_name], key=lambda p: p[0])

    if len(points) < 2:
        return None

    # Linear regression: y = mx + b, solve for x when y = 0
    n = len(points)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_x2 = sum(x * x for x in xs)

    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return None

    m = (n * sum_xy - sum_x * sum_y) / denom
    b = (sum_y - m * sum_x) / n

    if m >= 0:
        return None  # Toner not decreasing

    # y = 0 => x = -b/m
    x_zero = -b / m
    days_from_start = x_zero
    depletion_date = start + timedelta(days=days_from_start)

    if depletion_date < date.today():
        return None  # Predicted past - toner may have been replaced
    return depletion_date


def calculate_cost_per_period(
    printer: Printer,
    start_date: date,
    end_date: date,
    mono_fraction: Optional[float] = None,
) -> Optional[Decimal]:
    """
    Multiply pages printed in the period by the printer's cost_per_page.
    If mono_fraction is None, uses cost_per_page_mono only (or color if mono not set).
    mono_fraction: 0.0 = all color, 1.0 = all mono.
    """
    total_pages = PrinterDailyStat.objects.filter(
        printer=printer, date__gte=start_date, date__lte=end_date
    ).aggregate(total=Sum("total_pages_printed"))["total"]

    if total_pages is None or total_pages == 0:
        return Decimal("0")

    mono = printer.cost_per_page_mono
    color = printer.cost_per_page_color

    if mono is None and color is None:
        return None

    if mono_fraction is not None:
        if mono is None:
            mono = color or Decimal("0")
        if color is None:
            color = mono or Decimal("0")
        mono_pages = int(total_pages * mono_fraction)
        color_pages = total_pages - mono_pages
        cost = (mono or Decimal("0")) * mono_pages + (color or Decimal("0")) * color_pages
    else:
        cpp = mono if mono is not None else color
        if cpp is None:
            return None
        cost = cpp * total_pages

    return cost.quantize(Decimal("0.0001"))


def predict_maintenance_date(printer: Printer) -> Optional[date]:
    """
    Estimate next recommended maintenance date based on volume and maintenance_kit_capacity.
    Uses average daily page volume from last 7 days.
    """
    if not printer.maintenance_kit_capacity or printer.maintenance_kit_capacity <= 0:
        return None

    last_log = printer.logs.order_by("-timestamp").first()
    if not last_log or last_log.total_pages is None:
        return None

    total_pages = last_log.total_pages
    week_ago = date.today() - timedelta(days=7)
    daily_stats = PrinterDailyStat.objects.filter(
        printer=printer, date__gte=week_ago, date__lt=date.today()
    ).aggregate(total=Sum("total_pages_printed"))["total"]

    avg_daily_pages = (daily_stats or 0) / 7 if daily_stats else 0
    if avg_daily_pages <= 0:
        return None

    pages_until_next = printer.maintenance_kit_capacity - (
        total_pages % printer.maintenance_kit_capacity
    )
    if pages_until_next == printer.maintenance_kit_capacity:
        pages_until_next = 0
    if pages_until_next <= 0:
        return date.today()

    days_until = pages_until_next / avg_daily_pages
    return date.today() + timedelta(days=int(days_until))
