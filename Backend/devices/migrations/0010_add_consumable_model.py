# Generated migration for Consumable model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0009_add_servicing_and_daily_deep_analytics'),
    ]

    operations = [
        migrations.CreateModel(
            name='Consumable',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='e.g., Black Toner Cartridge', max_length=100)),
                ('category', models.CharField(choices=[('TONER', 'Toner'), ('DRUM', 'Drum'), ('MAINTENANCE_KIT', 'Maintenance Kit'), ('WASTE_TONER', 'Waste Toner')], max_length=20)),
                ('color', models.CharField(blank=True, help_text='Black, Cyan, Magenta, Yellow', max_length=50, null=True)),
                ('type', models.CharField(choices=[('OEM', 'OEM'), ('COMPATIBLE', 'Compatible'), ('REMANUFACTURED', 'Remanufactured')], default='OEM', max_length=20)),
                ('part_number', models.CharField(blank=True, max_length=100, null=True)),
                ('serial_number', models.CharField(blank=True, max_length=100, null=True)),
                ('level_percent', models.IntegerField(help_text='Current level as percentage')),
                ('current_level', models.IntegerField(blank=True, help_text='Current level in units', null=True)),
                ('max_capacity', models.IntegerField(blank=True, help_text='Maximum capacity in units', null=True)),
                ('estimated_pages_remaining', models.IntegerField(blank=True, help_text='Estimated pages remaining', null=True)),
                ('estimated_days_remaining', models.FloatField(blank=True, help_text='Estimated days until empty', null=True)),
                ('pages_printed_with_this', models.IntegerField(default=0, help_text='Total pages printed with this consumable')),
                ('consumption_rate_per_day', models.FloatField(blank=True, help_text='Average consumption rate per day (%)', null=True)),
                ('cost_per_unit', models.DecimalField(blank=True, decimal_places=2, help_text='Purchase cost per unit', max_digits=10, null=True)),
                ('cost_per_page', models.DecimalField(blank=True, decimal_places=4, help_text='Calculated cost per page', max_digits=10, null=True)),
                ('supplier', models.CharField(blank=True, max_length=100, null=True)),
                ('purchase_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('OK', 'OK'), ('LOW', 'Low'), ('CRITICAL', 'Critical'), ('EMPTY', 'Empty')], default='OK', max_length=10)),
                ('low_threshold_percent', models.IntegerField(default=20, help_text='Threshold for low status')),
                ('critical_threshold_percent', models.IntegerField(default=10, help_text='Threshold for critical status')),
                ('is_low', models.BooleanField(default=False)),
                ('is_empty', models.BooleanField(default=False)),
                ('installed_at', models.DateTimeField(blank=True, null=True)),
                ('last_replaced_at', models.DateTimeField(blank=True, null=True)),
                ('expected_lifetime_pages', models.IntegerField(blank=True, help_text='Expected pages for this consumable type', null=True)),
                ('remaining_life_percent', models.IntegerField(blank=True, help_text='Remaining life percentage', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('printer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumables', to='devices.printer')),
            ],
            options={
                'verbose_name': 'Consumable',
                'verbose_name_plural': 'Consumables',
                'ordering': ['-updated_at'],
            },
        ),
    ]
