# Optimization: add indexes for frequent filters and joins

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0010_add_consumable_model'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='printer',
            index=models.Index(fields=['active', 'device_health'], name='devices_pri_active_health_idx'),
        ),
        migrations.AddIndex(
            model_name='printer',
            index=models.Index(fields=['active', 'min_supply_percent'], name='devices_pri_active_supply_idx'),
        ),
        migrations.AddIndex(
            model_name='printerlog',
            index=models.Index(fields=['printer', 'timestamp'], name='devices_log_printer_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='printerlog',
            index=models.Index(fields=['event_type', 'timestamp'], name='devices_log_event_ts_idx'),
        ),
    ]
