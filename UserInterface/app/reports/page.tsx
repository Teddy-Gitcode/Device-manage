import { IconChevronRight, IconFile, IconDownload } from '@/components/ui/Icons'

const REPORTS = [
  { id: 'fleet-status',   title: 'Fleet status report',       desc: 'Current status of all devices: health, toner, utilization.',             period: 'Live snapshot' },
  { id: 'monthly-volume', title: 'Monthly print volume',       desc: 'Pages printed per device and department for the current month.',          period: 'Monthly' },
  { id: 'toner-usage',    title: 'Toner usage & forecasting',  desc: 'Consumption rates, estimated replacements, and reorder suggestions.',     period: 'Monthly' },
  { id: 'incident-log',   title: 'Incident log',               desc: 'Paper jams, offline events, and maintenance actions over 90 days.',       period: '90 days' },
  { id: 'cost-summary',   title: 'Cost summary by department', desc: 'Print costs broken down by department, user, and device.',               period: 'Monthly' },
  { id: 'energy',         title: 'Energy consumption',         desc: 'Estimated kWh used across the fleet with per-device breakdown.',          period: 'Monthly' },
]

export default function ReportsPage() {
  return (
    <>
      <div className="breadcrumb">
        Operate <IconChevronRight size={10} /> Reports
      </div>
      <div className="page-head">
        <h1 className="page-title">Reports</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {REPORTS.map(r => (
          <div className="card" key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--m365-brand)', marginTop: 2 }}><IconFile size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{r.period}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', margin: 0 }}>{r.desc}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn primary small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconDownload size={12} />CSV</button>
              <button className="btn secondary small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconDownload size={12} />PDF</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, padding: '14px 16px' }}>
        <div className="card-head"><div className="card-title">Scheduled reports</div><button className="btn primary small">Add schedule</button></div>
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No scheduled reports configured. Click "Add schedule" to set up automated delivery.</p>
      </div>
    </>
  )
}
