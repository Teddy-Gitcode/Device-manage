import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from devices.models import Printer, PrinterDailyStat

class Command(BaseCommand):
    help = 'Generates 30 days of fake historical data for existing printers'

    def handle(self, *args, **kwargs):
        printers = Printer.objects.all()
        
        if not printers.exists():
            self.stdout.write(self.style.WARNING("No printers found! Add a printer first."))
            return

        self.stdout.write(f"Seeding data for {printers.count()} printers...")

        # End date is "yesterday" (so we don't mess up today's real polling)
        end_date = timezone.now().date() - timedelta(days=1)
        
        for printer in printers:
            self.stdout.write(f"  - Generating history for: {printer.name} ({printer.ip_address})")
            
            # Create 30 days of history
            for i in range(30):
                date = end_date - timedelta(days=i)
                
                # SKIP WEEKENDS (Make it realistic - usually no printing on Sat/Sun)
                if date.weekday() >= 5: 
                    # Create a "zero usage" record for weekends
                    PrinterDailyStat.objects.get_or_create(
                        printer=printer,
                        date=date,
                        defaults={
                            'total_pages_printed': 0,
                            'jam_count': 0,
                            'error_count': 0,
                            'uptime_minutes': 1440, # 24 hours uptime (just idle)
                            'idle_minutes': 1440,
                            'downtime_minutes': 0,
                            'energy_usage_kwh': 0.1 # Low standby power
                        }
                    )
                    continue

                # WEEKDAY LOGIC
                # 1. Randomize "Personality" (Some printers are busier than others)
                is_busy_printer = "Finance" in printer.name or "Main" in printer.name
                base_pages = random.randint(50, 300) if is_busy_printer else random.randint(5, 50)
                
                # 2. Randomize "Bad Days" (Jams/Errors)
                # 10% chance of a jam
                jam_count = random.randint(1, 3) if random.random() < 0.1 else 0
                error_count = random.randint(1, 5) if jam_count > 0 else 0

                # 3. Time Calculations (Must sum to 1440 mins)
                # Working: roughly 0.5 min per page
                working_minutes = int(base_pages * 0.5) 
                
                # Downtime: Random glitch or major failure
                downtime_minutes = random.randint(10, 120) if jam_count > 0 else 0
                
                # Idle: Whatever is left
                idle_minutes = 1440 - working_minutes - downtime_minutes
                
                # Sanity check (no negative time)
                if idle_minutes < 0: idle_minutes = 0

                # 4. Energy Calculation (Approx: 500W active, 5W sleep)
                # (Mins / 60) * kW
                kwh = (working_minutes/60 * 0.5) + (idle_minutes/60 * 0.005)

                # Save to DB
                PrinterDailyStat.objects.get_or_create(
                    printer=printer,
                    date=date,
                    defaults={
                        'total_pages_printed': base_pages,
                        'jam_count': jam_count,
                        'error_count': error_count,
                        'uptime_minutes': working_minutes + idle_minutes,
                        'idle_minutes': idle_minutes,
                        'downtime_minutes': downtime_minutes,
                        'energy_usage_kwh': round(kwh, 2)
                    }
                )

        self.stdout.write(self.style.SUCCESS("Successfully seeded 30 days of data!"))