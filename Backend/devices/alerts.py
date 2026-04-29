"""
Email alert helpers for printer monitoring.

Sends alerts via Mailtrap (django-anymail) when:
- A printer has been unreachable for > 60s (cool-off period)
- A supply level drops below ALERT_LOW_TONER_THRESHOLD (default 10%)

Deduplication: uses Redis keys with 24h TTL to avoid sending repeated
alerts for the same event within a single day.
"""
import logging
import os

import redis as redis_lib
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

_redis = None


def _get_redis():
    global _redis
    if _redis is None:
        _redis = redis_lib.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))
    return _redis


def _dedup_key_clear(key: str):
    """Remove a dedup key so a new alert can be sent (e.g. on recovery)."""
    try:
        _get_redis().delete(key)
    except Exception:
        pass


def _should_send(key: str, ttl_seconds: int = 86400) -> bool:
    """
    Returns True (and sets the key) if no alert has been sent for this key
    within ttl_seconds. Returns False if the key already exists.
    """
    try:
        r = _get_redis()
        if r.exists(key):
            return False
        r.setex(key, ttl_seconds, "1")
        return True
    except Exception as e:
        # Redis unavailable — allow sending so we don't silently drop alerts
        logger.warning(f"Redis unavailable for alert dedup: {e}")
        return True


def _recipients():
    return getattr(settings, "ALERT_EMAIL_RECIPIENTS", [])


# ============================================================
# Public alert functions
# ============================================================

def send_printer_down_alert(printer_name: str, ip: str, elapsed_seconds: float):
    """Send a CRITICAL email when a printer has been down for > cool-off period."""
    recipients = _recipients()
    if not recipients:
        logger.debug("ALERT_EMAIL_RECIPIENTS not set — skipping down alert")
        return

    key = f"alert:down:{ip}"
    if not _should_send(key, ttl_seconds=3600):  # 1h dedup for down alerts
        logger.debug(f"Down alert for {ip} already sent within 1h, skipping")
        return

    try:
        send_mail(
            subject=f"[CRITICAL] Printer Down: {printer_name} ({ip})",
            message=(
                f"Printer '{printer_name}' ({ip}) has been unreachable "
                f"for {elapsed_seconds:.0f} seconds.\n\n"
                f"Please investigate immediately.\n\n"
                f"-- Device Monitor"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.info(f"Down alert sent for {ip} → {recipients}")
    except Exception as e:
        logger.error(f"Failed to send down alert for {ip}: {e}")


def clear_printer_down_alert(ip: str):
    """Call this when a printer recovers so the next outage sends a fresh alert."""
    _dedup_key_clear(f"alert:down:{ip}")


def send_low_toner_alert(printer_name: str, ip: str, supply_name: str, level_percent: int):
    """Send a WARNING email when a supply level drops below threshold."""
    recipients = _recipients()
    if not recipients:
        logger.debug("ALERT_EMAIL_RECIPIENTS not set — skipping toner alert")
        return

    # Deduplicate per printer+supply per 24 hours
    key = f"alert:toner:{ip}:{supply_name}"
    if not _should_send(key, ttl_seconds=86400):
        logger.debug(f"Toner alert for {ip}/{supply_name} already sent today, skipping")
        return

    try:
        threshold = getattr(settings, "ALERT_LOW_TONER_THRESHOLD", 10)
        send_mail(
            subject=f"[WARNING] Low Supply: {printer_name} — {supply_name} at {level_percent}%",
            message=(
                f"Printer '{printer_name}' ({ip}) has a low supply level:\n\n"
                f"  Supply : {supply_name}\n"
                f"  Level  : {level_percent}%\n"
                f"  Threshold: {threshold}%\n\n"
                f"Please arrange a replacement soon.\n\n"
                f"-- Device Monitor"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.info(f"Toner alert sent for {ip} ({supply_name} {level_percent}%) → {recipients}")
    except Exception as e:
        logger.error(f"Failed to send toner alert for {ip}/{supply_name}: {e}")
