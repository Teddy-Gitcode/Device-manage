import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/components/auth-guard';
import { AppLayout } from '@/components/app-layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PrintersPage } from '@/pages/PrintersPage';
import { PrinterDetailPage } from '@/pages/PrinterDetailPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/printers" element={<PrintersPage />} />
          <Route path="/printers/:id" element={<PrinterDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
