"""
URL routing for the devices API and templates.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PrinterViewSet,
    PrinterLogViewSet,
    PrinterDailyStatViewSet,
    ConsumableViewSet,
    dashboard_view,
    printer_detail_view,
    printer_list_partial,
    notifications_partial,
)

router = DefaultRouter()
router.register(r"printers", PrinterViewSet, basename="printer")
router.register(r"logs", PrinterLogViewSet, basename="printerlog")
router.register(r"daily-stats", PrinterDailyStatViewSet, basename="printerdailystat")
router.register(r"consumables", ConsumableViewSet, basename="consumable")

urlpatterns = [
    path("", include(router.urls)),
]
