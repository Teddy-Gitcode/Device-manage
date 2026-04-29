"""
URL configuration for printer project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings

from devices.views import (
    dashboard_view, printer_detail_view, printer_list_partial,
    notifications_partial, login_view, logout_view, me_view, change_password_view,
    register_view, users_list_view, user_create_view, user_detail_view,
)
from devices.spa import spa_view, spa_asset

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/devices/", include("devices.urls")),
    path("api/auth/login/",    login_view,    name="api_login"),
    path("api/auth/logout/",   logout_view,   name="api_logout"),
    path("api/auth/register/", register_view, name="api_register"),
    path("api/auth/me/", me_view, name="api_me"),
    path("api/auth/change-password/", change_password_view, name="api_change_password"),
    path("api/auth/users/", users_list_view, name="api_users_list"),
    path("api/auth/users/create/", user_create_view, name="api_user_create"),
    path("api/auth/users/<int:user_id>/", user_detail_view, name="api_user_detail"),

    # Legacy HTMX views (kept for backward compat, /legacy/ prefix)
    path("legacy/", dashboard_view, name="dashboard"),
    path("legacy/printer/<int:printer_id>/", printer_detail_view, name="printer_detail"),
    path("legacy/partials/printer-list/", printer_list_partial, name="printer_list_partial"),
    path("legacy/partials/notifications/", notifications_partial, name="notifications_partial"),

    # SPA bundle assets (hashed — safe to cache aggressively via nginx if placed in front)
    re_path(r"^assets/(?P<path>.+)$", spa_asset, name="spa_asset"),

    # SPA fallback — any other non-API path returns index.html
    re_path(r"^$", spa_view, name="spa_root"),
    re_path(r"^(?!api/|admin/|assets/|legacy/|static/).*$", spa_view, name="spa_catchall"),
]

if settings.DEBUG:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
