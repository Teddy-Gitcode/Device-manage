"""
Signal handlers for auto-creating and updating Consumable records from PrinterLog data.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import PrinterLog, Consumable


@receiver(post_save, sender=PrinterLog)
def update_consumables_from_log(sender, instance, created, **kwargs):
    """
    When a PrinterLog is created, extract supply_levels data and update or create
    Consumable records for that printer.
    
    Matches by name + category to avoid duplicates.
    Updates: level_percent, current_level, max_capacity
    """
    if not created:
        return
    
    # Get supply levels from the log
    supplies = instance.supplies.all()
    
    if not supplies.exists():
        return
    
    for supply in supplies:
        # Determine category mapping from SupplyLevel to Consumable
        category_map = {
            "toner": Consumable.Category.TONER,
            "drum": Consumable.Category.DRUM,
            "maintenance": Consumable.Category.MAINTENANCE_KIT,
            "waste": Consumable.Category.WASTE_TONER,
        }
        
        # Try to match category
        consumable_category = None
        supply_category_lower = supply.category.lower()
        for key, value in category_map.items():
            if key in supply_category_lower:
                consumable_category = value
                break
        
        # Default to TONER if no match
        if not consumable_category:
            consumable_category = Consumable.Category.TONER
        
        # Extract color from name if possible
        color = None
        name_lower = supply.name.lower()
        if "black" in name_lower or "bk" in name_lower or "k" in name_lower:
            color = "Black"
        elif "cyan" in name_lower or "c" in name_lower:
            color = "Cyan"
        elif "magenta" in name_lower or "m" in name_lower:
            color = "Magenta"
        elif "yellow" in name_lower or "y" in name_lower:
            color = "Yellow"
        
        # Get or create consumable
        consumable, was_created = Consumable.objects.get_or_create(
            printer=instance.printer,
            name=supply.name,
            category=consumable_category,
            defaults={
                "color": color,
                "level_percent": supply.level_percent,
                "current_level": supply.current_level,
                "max_capacity": supply.max_capacity,
                "installed_at": timezone.now() if was_created else None,
            }
        )
        
        # Update existing consumable
        if not was_created:
            # Calculate consumption rate if we have previous data
            if consumable.level_percent > supply.level_percent:
                time_diff = timezone.now() - consumable.updated_at
                days_diff = time_diff.total_seconds() / 86400
                if days_diff > 0:
                    level_drop = consumable.level_percent - supply.level_percent
                    consumable.consumption_rate_per_day = level_drop / days_diff
            
            # Update levels
            consumable.level_percent = supply.level_percent
            consumable.current_level = supply.current_level
            consumable.max_capacity = supply.max_capacity
            
            # Calculate estimated pages remaining if we have consumption rate
            if (consumable.consumption_rate_per_day and 
                consumable.consumption_rate_per_day > 0 and
                instance.printer.total_page_count):
                
                # Estimate based on printer's daily page count
                pages_per_day = instance.printer.total_page_count / max(1, 
                    (timezone.now() - instance.printer.last_polled_at).days if instance.printer.last_polled_at else 1
                )
                if consumable.consumption_rate_per_day > 0:
                    days_remaining = consumable.level_percent / consumable.consumption_rate_per_day
                    consumable.estimated_pages_remaining = int(days_remaining * pages_per_day)
            
            consumable.save()
