export type Role = 'viewer' | 'operator' | 'admin';

export type CurrentStatus = 2 | 3 | 4 | 5;
export type DeviceHealth = 2 | 3 | 5;
export type EventType =
  | 'STATUS_CHECK'
  | 'PAPER_JAM'
  | 'LOW_TONER'
  | 'OFFLINE'
  | 'MAINTENANCE';

export const STATUS_LABEL: Record<number, string> = {
  2: 'Sleeping',
  3: 'Idle',
  4: 'Printing',
  5: 'Warming Up',
};

export const HEALTH_LABEL: Record<number, string> = {
  2: 'Running',
  3: 'Warning',
  5: 'Down',
};

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SupplyLevel {
  id: number;
  name: string;
  category: string;
  level_percent: number;
  max_capacity: number | null;
  current_level: number | null;
}

export interface Consumable {
  id: number;
  printer: number;
  name: string;
  category: 'TONER' | 'DRUM' | 'MAINTENANCE_KIT' | 'WASTE_TONER';
  color: string | null;
  type: 'OEM' | 'COMPATIBLE' | 'REMANUFACTURED';
  part_number: string | null;
  serial_number: string | null;
  level_percent: number;
  current_level: number | null;
  max_capacity: number | null;
  estimated_pages_remaining: number | null;
  estimated_days_remaining: number | null;
  pages_printed_with_this: number;
  consumption_rate_per_day: number | null;
  cost_per_unit: string | null;
  cost_per_page: string | null;
  supplier: string | null;
  purchase_date: string | null;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'EMPTY';
  is_low: boolean;
  is_empty: boolean;
  installed_at: string | null;
  last_replaced_at: string | null;
  expected_lifetime_pages: number | null;
  remaining_life_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface PrinterDailyStat {
  id: number;
  printer: number;
  date: string;
  total_pages_printed: number;
  pages_printed_today: number;
  jam_count: number;
  jams_today: number;
  error_count: number;
  avg_latency_ms: number;
  uptime_minutes: number;
  idle_minutes: number;
  downtime_minutes: number;
  sleep_time_minutes: number;
  energy_usage_kwh: string | null;
}

export interface PredictedServiceInfo {
  health_label: 'Good' | 'Fair' | 'Poor' | 'Critical';
  next_service_reason: string | null;
  drum_days_remaining: number | null;
  drum_pages_remaining: number | null;
  jam_rate_30d: number | null;
  total_jams_30d: number;
}

export interface Printer {
  id: number;
  name: string;
  ip_address: string;
  mac_address: string | null;
  serial_number: string | null;
  model_name: string;
  firmware_version: string | null;
  sys_name: string | null;
  location: string;
  active: boolean;
  current_status: CurrentStatus | null;
  device_health: DeviceHealth | null;
  total_page_count: number | null;
  last_polled_at: string | null;
  last_latency_ms: number | null;
  min_supply_percent: number | null;
  is_in_alert_state?: boolean;
  alert_triggered_at?: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  last_serviced_date: string | null;
  next_servicing_date: string | null;
  cost_per_page_mono: string | null;
  cost_per_page_color: string | null;
  energy_consumption_rate_watts: number | null;
  target_monthly_volume: number | null;
  maintenance_kit_capacity: number | null;
  latest_supply_levels: SupplyLevel[];
  consumables: Consumable[];
  today_stats: PrinterDailyStat | null;
  health_score?: number;
  predicted_service_info?: PredictedServiceInfo;
}

export interface PrinterLog {
  id: number;
  printer: number;
  timestamp: string;
  total_pages: number | null;
  status: string;
  console_display: string | null;
  tray_status: Array<Record<string, unknown>> | Record<string, unknown>;
  active_alerts: string[];
  system_uptime_seconds: number | null;
  event_type: EventType;
  error_code: string | null;
}

export interface SRESignals {
  traffic: { pages_per_hour: number };
  errors: { current_error_rate: number; error_count: number; total_active: number };
  saturation: { low_toner_count: number };
  latency: { network_latency_avg: number };
}

export interface TaskResponse {
  status: string;
  message: string;
  task_id?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  last_login: string | null;
  role: Role;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface LoginResponse {
  token: string;
  username: string;
  email: string;
}

export interface WSMessage {
  type: string;
  printer_id: number;
  printer_name?: string;
  ip_address?: string;
  current_status?: number | null;
  device_health?: number | null;
  min_supply_percent?: number | null;
  total_page_count?: number | null;
  last_polled_at?: string | null;
  event?: string;
  event_label?: string;
}
