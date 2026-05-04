from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0016_cover_open_tracking'),
    ]

    operations = [
        migrations.CreateModel(
            name='PrintJob',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('printer_ip',    models.GenericIPAddressField(db_index=True)),
                ('printer_name',  models.CharField(blank=True, max_length=255)),
                ('username',      models.CharField(db_index=True, max_length=200)),
                ('computer',      models.CharField(blank=True, max_length=200)),
                ('document_name', models.CharField(blank=True, max_length=500)),
                ('pages',         models.PositiveIntegerField(default=0)),
                ('printed_at',    models.DateTimeField(db_index=True)),
                ('received_at',   models.DateTimeField(auto_now_add=True)),
                ('printer',       models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='print_jobs',
                    to='devices.printer',
                )),
            ],
            options={
                'verbose_name': 'Print Job',
                'verbose_name_plural': 'Print Jobs',
                'ordering': ['-printed_at'],
            },
        ),
    ]
