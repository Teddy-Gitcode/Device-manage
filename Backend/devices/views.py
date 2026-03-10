"""
Django REST Framework API views for the devices app.
Implements Google SRE Four Golden Signals API.
"""
from django.contrib.auth import authenticate
from django.db.models import Avg, Prefetch, Sum, Q
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, filters, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth.models import User
from .models import Printer, PrinterLog, PrinterDailyStat, Consumable, SupplyLevel, UserProfile
from .serializers import (
    PrinterSerializer,
    PrinterLogSerializer,
    PrinterDailyStatSerializer,
    ConsumableSerializer,
)
from .tasks import discover_printers, poll_all_active_printers
from .permissions import IsViewer, IsOperator, IsAdminRole, user_role


class PrinterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Printer CRUD operations.
    Returns only active printers by default.
    Supports search by ip_address and name, filtering by current_status.
    """

    permission_classes = [IsViewer]

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'update', 'discover', 'poll'):
            return [IsOperator()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsViewer()]
    serializer_class = PrinterSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["ip_address", "name", "model_name", "location"]
    ordering_fields = [
        "name",
        "ip_address",
        "last_polled_at",
        "current_status",
        "device_health",
        "total_page_count",
    ]

    def get_queryset(self):
        """Return active printers by default; support query params for filtering."""
        today = timezone.now().date()
        queryset = Printer.objects.prefetch_related(
            Prefetch(
                "daily_stats",
                queryset=PrinterDailyStat.objects.filter(date=today),
                to_attr="today_stats_list",
            )
        )

        # Filter by active: default True, allow ?active=false to include inactive
        active_param = self.request.query_params.get("active")
        if active_param is None:
            queryset = queryset.filter(active=True)
        elif active_param.lower() in ("false", "0"):
            queryset = queryset.filter(active=False)
        elif active_param.lower() in ("true", "1"):
            queryset = queryset.filter(active=True)

        # Filter by current_status (e.g. ?current_status=3 for Idle)
        current_status = self.request.query_params.get("current_status")
        if current_status is not None:
            queryset = queryset.filter(current_status=current_status)

        # Filter by device_health (e.g. ?device_health=2 for Running)
        device_health = self.request.query_params.get("device_health")
        if device_health is not None:
            queryset = queryset.filter(device_health=device_health)

        return queryset.order_by("name")

    @action(detail=False, methods=["post"], url_path="discover")
    def discover(self, request):
        """Trigger network discovery to scan for printers."""
        task = discover_printers.delay()
        return Response(
            {"status": "started", "message": "Discovery in progress.", "task_id": str(task.id)},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="poll")
    def poll(self, request):
        """Trigger immediate poll of all active printers."""
        task = poll_all_active_printers.delay()
        return Response(
            {"status": "started", "message": "Polling in progress.", "task_id": str(task.id)},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path="sre-signals")
    def sre_signals(self, request):
        """
        Google SRE Four Golden Signals endpoint.
        GET /api/devices/printers/sre-signals/
        """
        active = Printer.objects.filter(active=True)
        total_active = active.count()
        if total_active == 0:
            return Response({
                "traffic": {"pages_per_hour": 0},
                "errors": {"current_error_rate": 0.0, "error_count": 0, "total_active": 0},
                "saturation": {"low_toner_count": 0},
                "latency": {"network_latency_avg": 0},
            })

        # Traffic: pages_per_hour - today's print volume / hours elapsed
        today = timezone.now().date()
        today_stats = PrinterDailyStat.objects.filter(date=today).aggregate(
            total=Sum("total_pages_printed")
        )
        pages_today = int(today_stats["total"] or 0)
        hours_elapsed = max(1, (timezone.now() - timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds() / 3600)
        pages_per_hour = int(pages_today / hours_elapsed)

        # Errors: % of printers in device_health 3 (Warning) or 5 (Down)
        error_count = active.filter(device_health__in=(3, 5)).count()
        current_error_rate = round((error_count / total_active) * 100, 2)

        # Saturation: printers with toner/supply < 10%
        low_toner_count = active.filter(
            min_supply_percent__isnull=False,
            min_supply_percent__lt=10,
        ).count()

        # Latency: average last_latency_ms across active printers
        latency_agg = active.filter(last_latency_ms__isnull=False).aggregate(
            avg=Avg("last_latency_ms")
        )
        network_latency_avg = int(latency_agg["avg"] or 0)

        return Response({
            "traffic": {"pages_per_hour": pages_per_hour},
            "errors": {
                "current_error_rate": current_error_rate,
                "error_count": error_count,
                "total_active": total_active,
            },
            "saturation": {"low_toner_count": low_toner_count},
            "latency": {"network_latency_avg": network_latency_avg},
        })


class PrinterLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for PrinterLog (historical data)."""

    permission_classes = [IsViewer]
    serializer_class = PrinterLogSerializer
    filter_backends = [filters.OrderingFilter]

    def get_queryset(self):
        queryset = PrinterLog.objects.select_related("printer").order_by("-timestamp")
        printer_id = self.request.query_params.get("printer")
        if printer_id is not None:
            queryset = queryset.filter(printer_id=printer_id)
        event_type = self.request.query_params.get("event_type")
        if event_type is not None:
            queryset = queryset.filter(event_type=event_type)
        return queryset


class PrinterDailyStatViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for PrinterDailyStat (dashboard charts)."""

    permission_classes = [IsViewer]
    serializer_class = PrinterDailyStatSerializer
    filter_backends = [filters.OrderingFilter]

    def get_queryset(self):
        queryset = PrinterDailyStat.objects.select_related("printer").order_by("-date")
        printer_id = self.request.query_params.get("printer")
        if printer_id is not None:
            queryset = queryset.filter(printer_id=printer_id)
        date_val = self.request.query_params.get("date")
        if date_val is not None:
            queryset = queryset.filter(date=date_val)
        return queryset


class ConsumableViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Consumable CRUD operations with analytics and predictions.
    Supports filtering by printer, category, and status.
    Supports ordering by level_percent and estimated_days_remaining.
    """

    permission_classes = [IsViewer]

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'update', 'destroy'):
            return [IsOperator()]
        return [IsViewer()]
    serializer_class = ConsumableSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "part_number", "serial_number", "supplier"]
    ordering_fields = [
        "level_percent",
        "estimated_days_remaining",
        "status",
        "updated_at",
        "pages_printed_with_this",
    ]

    def get_queryset(self):
        """Return consumables with optional filtering."""
        queryset = Consumable.objects.select_related("printer").order_by("-updated_at")

        # Filter by printer ID
        printer_id = self.request.query_params.get("printer")
        if printer_id is not None:
            queryset = queryset.filter(printer_id=printer_id)

        # Filter by category
        category = self.request.query_params.get("category")
        if category is not None:
            queryset = queryset.filter(category=category)

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param is not None:
            queryset = queryset.filter(status=status_param)

        # Filter by color
        color = self.request.query_params.get("color")
        if color is not None:
            queryset = queryset.filter(color__iexact=color)

        # Filter by type
        type_param = self.request.query_params.get("type")
        if type_param is not None:
            queryset = queryset.filter(type=type_param)

        # Filter low consumables
        is_low = self.request.query_params.get("is_low")
        if is_low is not None and is_low.lower() in ("true", "1"):
            queryset = queryset.filter(is_low=True)

        # Filter empty consumables
        is_empty = self.request.query_params.get("is_empty")
        if is_empty is not None and is_empty.lower() in ("true", "1"):
            queryset = queryset.filter(is_empty=True)

        return queryset


# ============================================================================
# HTML TEMPLATE VIEWS
# ============================================================================

def dashboard_view(request):
    """Main dashboard with printer grid and analytics."""
    printers = Printer.objects.filter(active=True)
    total_devices = printers.count()
    
    operational_count = printers.filter(device_health=2).count()
    warning_count = printers.filter(device_health=3).count()
    critical_count = printers.filter(device_health=5).count()
    
    today = timezone.now().date()
    last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    
    trend_labels = [d.strftime('%m/%d') for d in last_7_days]
    trend_pages = []
    trend_jams = []
    
    for day in last_7_days:
        stats = PrinterDailyStat.objects.filter(date=day).aggregate(
            pages=Sum('pages_printed_today'),
            jams=Sum('jams_today')
        )
        trend_pages.append(stats['pages'] or 0)
        trend_jams.append(stats['jams'] or 0)
    
    today_stats = PrinterDailyStat.objects.filter(date=today).aggregate(
        total_uptime=Sum('uptime_minutes'),
        total_idle=Sum('idle_minutes'),
        total_downtime=Sum('downtime_minutes')
    )
    
    total_minutes = (today_stats['total_uptime'] or 0) + (today_stats['total_idle'] or 0) + (today_stats['total_downtime'] or 0)
    if total_minutes > 0:
        utilization = {
            'working_pct': round((today_stats['total_uptime'] or 0) / total_minutes * 100, 1),
            'idle_pct': round((today_stats['total_idle'] or 0) / total_minutes * 100, 1),
            'downtime_pct': round((today_stats['total_downtime'] or 0) / total_minutes * 100, 1),
        }
    else:
        utilization = {'working_pct': 0, 'idle_pct': 0, 'downtime_pct': 0}
    
    fleet_cost_today = 0
    for printer in printers:
        if printer.cost_per_page_mono and printer.total_page_count:
            today_stat = PrinterDailyStat.objects.filter(printer=printer, date=today).first()
            if today_stat:
                fleet_cost_today += float(printer.cost_per_page_mono) * today_stat.pages_printed_today
    
    week_ago = today - timedelta(days=7)
    most_problematic = PrinterDailyStat.objects.filter(date__gte=week_ago).values('printer__name').annotate(
        total_jams=Sum('jams_today')
    ).order_by('-total_jams').first()
    most_problematic_device = most_problematic['printer__name'] if most_problematic else None
    
    if total_minutes > 0:
        fleet_uptime_pct = (today_stats['total_uptime'] or 0) / total_minutes * 100
    else:
        fleet_uptime_pct = 0
    
    avg_latency = printers.filter(last_latency_ms__isnull=False).aggregate(avg=Avg('last_latency_ms'))
    avg_latency_ms = int(avg_latency['avg'] or 0)
    
    toner_forecast = {
        'days_7': printers.filter(min_supply_percent__lt=15).count(),
        'days_14': printers.filter(min_supply_percent__lt=30).count(),
        'days_30': printers.filter(min_supply_percent__lt=50).count(),
    }
    
    printer_data = []
    for printer in printers:
        last_log = printer.logs.first()
        if last_log:
            status_str = last_log.status
            if printer.device_health == 5:
                status_tier = 'critical'
                color = 'danger'
            elif printer.device_health == 3:
                status_tier = 'warning'
                color = 'warning'
            elif printer.device_health == 2:
                status_tier = 'operational'
                color = 'success'
            else:
                status_tier = 'unknown'
                color = 'secondary'
            
            today_stat = PrinterDailyStat.objects.filter(printer=printer, date=today).first()
            daily_jams = today_stat.jams_today if today_stat else 0
            
            uptime_display = None
            if last_log.system_uptime_seconds:
                days = last_log.system_uptime_seconds // 86400
                hours = (last_log.system_uptime_seconds % 86400) // 3600
                uptime_display = f"{days}d {hours}h"
            
            est_cost_today = None
            if printer.cost_per_page_mono and today_stat:
                est_cost_today = f"${float(printer.cost_per_page_mono) * today_stat.pages_printed_today:.2f}"
            
            primary_toner = last_log.supplies.filter(category='Toner').first()
            
            printer_data.append({
                'printer': printer,
                'status': status_str,
                'status_tier': status_tier,
                'color': color,
                'daily_jams': daily_jams,
                'system_uptime_display': uptime_display,
                'est_cost_today': est_cost_today,
                'primary_toner': primary_toner,
                'last_checked': last_log.timestamp,
                'toner_depletion_days': None,
                'maintenance_date': printer.next_servicing_date,
            })
        else:
            printer_data.append({
                'printer': printer,
                'status': 'Unknown',
                'status_tier': 'unknown',
                'color': 'secondary',
                'daily_jams': 0,
                'system_uptime_display': None,
                'est_cost_today': None,
                'primary_toner': None,
                'last_checked': 'Never',
                'toner_depletion_days': None,
                'maintenance_date': None,
            })
    
    context = {
        'total_devices': total_devices,
        'operational_count': operational_count,
        'warning_count': warning_count,
        'critical_count': critical_count,
        'trend_labels': trend_labels,
        'trend_pages': trend_pages,
        'trend_jams': trend_jams,
        'utilization': utilization,
        'printer_data': printer_data,
        'fleet_cost_today': fleet_cost_today,
        'most_problematic_device': most_problematic_device,
        'fleet_uptime_pct': fleet_uptime_pct,
        'avg_latency_ms': avg_latency_ms,
        'toner_forecast': toner_forecast,
    }
    
    return render(request, 'devices/dashboard.html', context)


def printer_list_partial(request):
    """HTMX partial for printer grid refresh."""
    printers = Printer.objects.filter(active=True)
    today = timezone.now().date()
    
    printer_data = []
    for printer in printers:
        last_log = printer.logs.first()
        if last_log:
            status_str = last_log.status
            if printer.device_health == 5:
                status_tier = 'critical'
                color = 'danger'
            elif printer.device_health == 3:
                status_tier = 'warning'
                color = 'warning'
            elif printer.device_health == 2:
                status_tier = 'operational'
                color = 'success'
            else:
                status_tier = 'unknown'
                color = 'secondary'
            
            today_stat = PrinterDailyStat.objects.filter(printer=printer, date=today).first()
            daily_jams = today_stat.jams_today if today_stat else 0
            
            uptime_display = None
            if last_log.system_uptime_seconds:
                days = last_log.system_uptime_seconds // 86400
                hours = (last_log.system_uptime_seconds % 86400) // 3600
                uptime_display = f"{days}d {hours}h"
            
            est_cost_today = None
            if printer.cost_per_page_mono and today_stat:
                est_cost_today = f"${float(printer.cost_per_page_mono) * today_stat.pages_printed_today:.2f}"
            
            primary_toner = last_log.supplies.filter(category='Toner').first()
            
            printer_data.append({
                'printer': printer,
                'status': status_str,
                'status_tier': status_tier,
                'color': color,
                'daily_jams': daily_jams,
                'system_uptime_display': uptime_display,
                'est_cost_today': est_cost_today,
                'primary_toner': primary_toner,
                'last_checked': last_log.timestamp,
                'toner_depletion_days': None,
                'maintenance_date': printer.next_servicing_date,
            })
        else:
            printer_data.append({
                'printer': printer,
                'status': 'Unknown',
                'status_tier': 'unknown',
                'color': 'secondary',
                'daily_jams': 0,
                'system_uptime_display': None,
                'est_cost_today': None,
                'primary_toner': None,
                'last_checked': 'Never',
                'toner_depletion_days': None,
                'maintenance_date': None,
            })
    
    return render(request, 'devices/partials/printer_list.html', {'printer_data': printer_data})


def printer_detail_view(request, printer_id):
    """Detailed printer view with vitals, analytics, and timeline."""
    printer = get_object_or_404(Printer, id=printer_id)
    last_log = printer.logs.first()
    
    status_color = 'secondary'
    console_display = None
    toners = []
    tray_status_display = []
    active_alerts = []
    
    if last_log:
        if printer.device_health == 5:
            status_color = 'danger'
        elif printer.device_health == 3:
            status_color = 'warning'
        elif printer.device_health == 2:
            status_color = 'success'
        
        console_display = last_log.console_display
        toners = last_log.supplies.all()
        
        if last_log.tray_status:
            if isinstance(last_log.tray_status, list):
                tray_status_display = last_log.tray_status
            else:
                tray_status_display = [last_log.tray_status]
        
        if last_log.active_alerts:
            if isinstance(last_log.active_alerts, list):
                active_alerts = last_log.active_alerts
            else:
                active_alerts = [last_log.active_alerts]
    
    system_uptime_display = None
    if last_log and last_log.system_uptime_seconds:
        days = last_log.system_uptime_seconds // 86400
        hours = (last_log.system_uptime_seconds % 86400) // 3600
        minutes = (last_log.system_uptime_seconds % 3600) // 60
        system_uptime_display = f"{days}d {hours}h {minutes}m"
    
    last_30_days = [timezone.now().date() - timedelta(days=i) for i in range(29, -1, -1)]
    history_labels = [d.strftime('%m/%d') for d in last_30_days]
    history_pages = []
    
    for day in last_30_days:
        stat = PrinterDailyStat.objects.filter(printer=printer, date=day).first()
        history_pages.append(stat.pages_printed_today if stat else 0)
    
    history_has_data = any(p > 0 for p in history_pages)
    
    recent_logs = printer.logs.order_by('-timestamp')[:10]
    
    context = {
        'printer': printer,
        'last_log': last_log,
        'status_color': status_color,
        'console_display': console_display,
        'toners': toners,
        'tray_status_display': tray_status_display,
        'active_alerts': active_alerts,
        'system_uptime_display': system_uptime_display,
        'history_labels': history_labels,
        'history_pages': history_pages,
        'history_has_data': history_has_data,
        'recent_logs': recent_logs,
    }
    
    return render(request, 'devices/printer_detail.html', context)


def notifications_partial(request):
    """HTMX partial for notification dropdown."""
    cutoff = timezone.now() - timedelta(hours=1)
    recent_logs = PrinterLog.objects.filter(
        timestamp__gte=cutoff,
        event_type__in=['OFFLINE', 'PAPER_JAM', 'LOW_TONER']
    ).select_related('printer').order_by('-timestamp')[:10]
    
    alerts = []
    for log in recent_logs:
        if log.event_type == 'OFFLINE':
            severity = 'critical'
            message = 'Device is offline'
        elif log.event_type == 'PAPER_JAM':
            severity = 'critical'
            message = 'Paper jam detected'
        elif log.event_type == 'LOW_TONER':
            severity = 'warning'
            message = 'Low toner level'
        else:
            severity = 'info'
            message = log.status
        
        alerts.append({
            'printer_name': log.printer.name or log.printer.ip_address,
            'message': message,
            'severity': severity,
            'timestamp': f"{(timezone.now() - log.timestamp).seconds // 60} mins ago",
        })
    
    return render(request, 'devices/partials/notifications.html', {'alerts': alerts})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Token-based login endpoint. POST {username, password} -> {token, username, email}"""
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Username and password required.'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(username=username, password=password)
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email or '',
        })
    return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Invalidate the user's auth token."""
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """GET/PATCH the current user's profile."""
    user = request.user
    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'role': user_role(user),
        })
    # PATCH
    allowed = ('email', 'first_name', 'last_name')
    for field in allowed:
        if field in request.data:
            setattr(user, field, request.data[field])
    user.save(update_fields=[f for f in allowed if f in request.data])
    return Response({
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """POST {current_password, new_password} to change password."""
    current = request.data.get('current_password', '')
    new_pw = request.data.get('new_password', '')
    if not current or not new_pw:
        return Response({'error': 'current_password and new_password required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_pw) < 8:
        return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(username=request.user.username, password=current)
    if user is None:
        return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_pw)
    user.save()
    # Re-issue token so the session stays alive
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response({'message': 'Password changed.', 'token': token.key})


# ============================================================================
# User Management (admin only)
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminRole])
def users_list_view(request):
    """GET /api/auth/users/ — list all users with roles."""
    users = User.objects.select_related('profile').order_by('username')
    data = []
    for u in users:
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'role': user_role(u),
            'is_active': u.is_active,
            'date_joined': u.date_joined,
            'last_login': u.last_login,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def user_create_view(request):
    """POST /api/auth/users/ — create a new user with a role."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email    = request.data.get('email', '').strip()
    role     = request.data.get('role', UserProfile.VIEWER)

    if not username or not password:
        return Response({'error': 'username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if role not in (UserProfile.VIEWER, UserProfile.OPERATOR, UserProfile.ADMIN):
        return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save()

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': role,
    }, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminRole])
def user_detail_view(request, user_id):
    """PATCH/DELETE /api/auth/users/<id>/"""
    try:
        target = User.objects.select_related('profile').get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Prevent self-demotion/deletion
    if target == request.user and request.method == 'DELETE':
        return Response({'error': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH — update role and/or active status
    role = request.data.get('role')
    is_active = request.data.get('is_active')

    if role is not None:
        if role not in (UserProfile.VIEWER, UserProfile.OPERATOR, UserProfile.ADMIN):
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        if target == request.user and role != UserProfile.ADMIN:
            return Response({'error': 'Cannot demote your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        profile, _ = UserProfile.objects.get_or_create(user=target)
        profile.role = role
        profile.save()

    if is_active is not None:
        target.is_active = bool(is_active)
        target.save(update_fields=['is_active'])

    return Response({
        'id': target.id,
        'username': target.username,
        'role': user_role(target),
        'is_active': target.is_active,
    })
