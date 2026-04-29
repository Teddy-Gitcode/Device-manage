from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0015_printer_last_known_jam_total'),
    ]

    operations = [
        migrations.AddField(
            model_name='printer',
            name='last_cover_was_open',
            field=models.BooleanField(default=False, help_text='Whether cover/door was open on the previous poll (used to detect open transitions)'),
        ),
        migrations.AddField(
            model_name='printerdailystat',
            name='cover_opens_today',
            field=models.IntegerField(default=0, help_text='Cover/door open events this day'),
        ),
    ]
