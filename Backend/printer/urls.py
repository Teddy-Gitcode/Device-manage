"""
URL configuration for printer project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings

from devices.views import (
    dashboard_view, printer_detail_view, printer_list_partial,
    notifications_partial, login_view, logout_view, me_view, change_password_view,
    users_list_view, user_create_view, user_detail_view,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/devices/", include("devices.urls")),
    path("api/auth/login/", login_view, name="api_login"),
    path("api/auth/logout/", logout_view, name="api_logout"),
    path("api/auth/me/", me_view, name="api_me"),
    path("api/auth/change-password/", change_password_view, name="api_change_password"),
    path("api/auth/users/", users_list_view, name="api_users_list"),
    path("api/auth/users/create/", user_create_view, name="api_user_create"),
    path("api/auth/users/<int:user_id>/", user_detail_view, name="api_user_detail"),
    # Legacy HTMX views (kept for backward compat)
    path("", dashboard_view, name="dashboard"),
    path("printer/<int:printer_id>/", printer_detail_view, name="printer_detail"),
    path("partials/printer-list/", printer_list_partial, name="printer_list_partial"),
    path("partials/notifications/", notifications_partial, name="notifications_partial"),
]

if settings.DEBUG:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
