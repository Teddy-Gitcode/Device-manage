import { IconChevronRight } from '@/components/ui/Icons'
import { DashboardShell }    from '@/components/dashboard/DashboardShell'
import { api }               from '@/lib/api'
import { normalizeDevices } from '@/lib/normalize'

export default async function DashboardPage() {
  const rawPrinters = await api.printers().catch(() => [])
  const devices     = normalizeDevices(rawPrinters as Parameters<typeof normalizeDevices>[0])

  return (
    <>
      <div className="breadcrumb">
        Monitor
        <IconChevronRight size={10} />
        Print Fleet
        <IconChevronRight size={10} />
        Dashboard
      </div>
      <div className="page-head">
        <h1 className="page-title">Print Fleet Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary">Export</button>
          <button className="btn primary">Add device</button>
        </div>
      </div>

      <DashboardShell devices={devices} />
    </>
  )
}
