"""
Celery configuration for the printer project.
"""
from celery import Celery
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "printer.settings")

app = Celery("printer")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
