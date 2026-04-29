import { api } from '@/lib/api';
import type {
  Paginated,
  Printer,
  SRESignals,
  TaskResponse,
} from '@/types/api';

export type PrinterFilters = {
  search?: string;
  active?: string;
  current_status?: string;
  device_health?: string;
  ordering?: string;
  page?: number;
};

export const printersApi = {
  list: (filters?: PrinterFilters) =>
    api.get<Paginated<Printer>>('/devices/printers/', filters),
  retrieve: (id: number) => api.get<Printer>(`/devices/printers/${id}/`),
  create: (data: Partial<Printer>) =>
    api.post<Printer>('/devices/printers/', data),
  update: (id: number, data: Partial<Printer>) =>
    api.patch<Printer>(`/devices/printers/${id}/`, data),
  destroy: (id: number) => api.delete<void>(`/devices/printers/${id}/`),
  discover: () => api.post<TaskResponse>('/devices/printers/discover/'),
  poll: () => api.post<TaskResponse>('/devices/printers/poll/'),
  sre: () => api.get<SRESignals>('/devices/printers/sre-signals/'),
};
