import { IconChevronRight } from '@/components/ui/Icons'
import { DashboardShell }    from '@/components/dashboard/DashboardShell'
import { api }               from '@/lib/api'
import { normalizeDevices, normalizeConsumables } from '@/lib/normalize'

export default async function DashboardPage() {
  const [rawPrinters, rawConsumables, realloc, tickets, policies, topUsers, deptCosts, jobs] =
    await Promise.all([
      api.printers().catch(() => []),
      api.consumables().catch(() => []),
      api.realloc(),
      api.tickets(),
      api.policies(),
      api.topUsers(),
      api.deptCosts(),
      api.jobs(),
    ])

  const devices = normalizeDevices(rawPrinters as Parameters<typeof normalizeDevices>[0])
  const stock   = normalizeConsumables(rawConsumables as Parameters<typeof normalizeConsumables>[0])

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

      <DashboardShell
        devices={devices}
        stock={stock}
        realloc={realloc}
        tickets={tickets}
        policies={policies}
        topUsers={topUsers}
        deptCosts={deptCosts}
        jobs={jobs}
      />
    </>
  )
}
