from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0014_add_sleeping_current_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='printer',
            name='last_known_jam_total',
            field=models.IntegerField(blank=True, help_text='Cumulative jam count last seen (used to compute daily deltas)', null=True),
        ),
    ]
