from rest_framework.permissions import BasePermission

ROLE_LEVEL = {'viewer': 0, 'operator': 1, 'admin': 2}


def user_role(user) -> str:
    """Return the effective role string for a user."""
    if not user or not user.is_authenticated:
        return 'viewer'
    if user.is_superuser:
        return 'admin'
    profile = getattr(user, 'profile', None)
    return profile.role if profile else 'viewer'


def has_min_role(user, min_role: str) -> bool:
    return ROLE_LEVEL.get(user_role(user), 0) >= ROLE_LEVEL.get(min_role, 0)


class IsViewer(BasePermission):
    """Read-only access — all authenticated users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and has_min_role(request.user, 'viewer')


class IsOperator(BasePermission):
    """Can trigger polls/discovery and edit printers/consumables."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and has_min_role(request.user, 'operator')


class IsAdminRole(BasePermission):
    """Full access including user management and destructive actions."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and has_min_role(request.user, 'admin')
