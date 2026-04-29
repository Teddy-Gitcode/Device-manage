"""
Management command: populate Consumable records from the latest SupplyLevel
data for every printer that has supply history but no Consumable rows.

Usage:
    python manage.py backfill_consumables
    python manage.py backfill_consumables --overwrite   # re-sync even existing rows
"""
from django.core.management.base import BaseCommand

from devices.models import Printer, Consumable


_CATEGORY_MAP = {
    "Waste Bin": Consumable.Category.WASTE_TONER,
    "Maintenance": Consumable.Category.MAINTENANCE_KIT,
    "Drum Unit": Consumable.Category.DRUM,
    "Toner": Consumable.Category.TONER,
}


def _color(name: str):
    n = (name or "").lower()
    if any(k in n for k in ("black", " bk", "-bk")):
        return "Black"
    if "cyan" in n:
        return "Cyan"
    if "magenta" in n:
        return "Magenta"
    if "yellow" in n:
        return "Yellow"
    return None


class Command(BaseCommand):
    help = "Backfill Consumable rows from the latest SupplyLevel data for each printer."

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Update existing Consumable rows even if they already exist.",
        )

    def handle(self, *args, **options):
        overwrite = options["overwrite"]
        created_total = updated_total = skipped_total = 0

        printers = Printer.objects.prefetch_related("logs__supplies").all()

        for printer in printers:
            # Find the most recent log that has supply entries
            last_log = (
                printer.logs
                .filter(supplies__isnull=False)
                .distinct()
                .order_by("-timestamp")
                .first()
            )
            if not last_log:
                self.stdout.write(f"  {printer}: no supply data — skip")
                continue

            supplies = last_log.supplies.all()
            for supply in supplies:
                consumable_category = _CATEGORY_MAP.get(supply.category, Consumable.Category.TONER)
                max_cap = supply.max_capacity if (supply.max_capacity and supply.max_capacity > 0) else None
                cur_lvl = supply.current_level if (supply.current_level is not None and supply.current_level >= 0) else None

                existing = Consumable.objects.filter(printer=printer, name=supply.name).first()

                if existing and not overwrite:
                    skipped_total += 1
                    continue

                defaults = {
                    "category": consumable_category,
                    "color": _color(supply.name),
                    "level_percent": supply.level_percent,
                    "current_level": cur_lvl,
                    "max_capacity": max_cap,
                }

                _, was_created = Consumable.objects.update_or_create(
                    printer=printer,
                    name=supply.name,
                    defaults=defaults,
                )

                if was_created:
                    created_total += 1
                    self.stdout.write(self.style.SUCCESS(f"  Created: {printer} / {supply.name} @ {supply.level_percent}%"))
                else:
                    updated_total += 1
                    self.stdout.write(f"  Updated: {printer} / {supply.name} @ {supply.level_percent}%")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Created={created_total}, Updated={updated_total}, Skipped={skipped_total}"
        ))
