import { api } from '@/lib/api';
import type { EventType, Paginated, PrinterLog, PrinterDailyStat } from '@/types/api';

export type LogFilters = {
  printer?: number;
  event_type?: EventType;
  page?: number;
};

export type StatFilters = {
  printer?: number;
  date?: string;
  page?: number;
};

export const logsApi = {
  list: (filters?: LogFilters) =>
    api.get<Paginated<PrinterLog>>('/devices/logs/', filters),
};

export const statsApi = {
  list: (filters?: StatFilters) =>
    api.get<Paginated<PrinterDailyStat>>('/devices/daily-stats/', filters),
};
