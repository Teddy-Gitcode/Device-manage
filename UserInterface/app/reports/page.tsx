import { IconChevronRight, IconFile, IconDownload } from '@/components/ui/Icons'
import { api } from '@/lib/api'
import { normalizeDevices } from '@/lib/normalize'

const REPORTS = [
  {
    id:     'fleet-status',
    title:  'Fleet status report',
    desc:   'Current status of all devices: health, toner, utilization.',
    period: 'Live snapshot',
  },
  {
    id:     'monthly-volume',
    title:  'Monthly print volume',
    desc:   'Pages printed per device for the current month.',
    period: 'Monthly',
  },
  {
    id:     'toner-usage',
    title:  'Toner usage & forecasting',
    desc:   'Consumption rates, estimated replacements, and reorder suggestions.',
    period: 'Monthly',
  },
  {
    id:     'incident-log',
    title:  'Incident log',
    desc:   'Paper jams, offline events, and maintenance actions over 90 days.',
    period: '90 days',
  },
  {
    id:     'cost-summary',
    title:  'Cost summary',
    desc:   'Estimated print costs per device based on cost-per-page settings.',
    period: 'Monthly',
  },
  {
    id:     'energy',
    title:  'Energy consumption',
    desc:   'Estimated kWh used across the fleet with per-device breakdown.',
    period: 'Monthly',
  },
]

export default async function ReportsPage() {
  // Fetch live fleet summary for the header strip
  let devices: ReturnType<typeof normalizeDevices> = []
  try {
    const raw = await api.printers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    devices = normalizeDevices(raw as any)
  } catch {
    // show zeros if backend unreachable
  }

  const total      = devices.length
  const online     = devices.filter(d => d.status !== 'danger').length
  const offline    = devices.filter(d => d.status === 'danger').length
  const lowToner   = devices.filter(d => d.tonerAlert !== 'none').length
  const pagesMonth = devices.reduce((s, d) => s + d.pages30d, 0)

  const kpis = [
    { label: 'Total devices',     value: total,                    color: undefined },
    { label: 'Online',            value: online,                   color: 'var(--status-ok)' as string | undefined },
    { label: 'Offline',           value: offline,                  color: offline   > 0 ? 'var(--status-danger)' : undefined },
    { label: 'Low / empty toner', value: lowToner,                 color: lowToner  > 0 ? 'var(--status-warn)'   : undefined },
    { label: 'Pages this month',  value: pagesMonth.toLocaleString(), color: undefined },
  ]

  return (
    <>
      <div className="breadcrumb">
        Operate <IconChevronRight size={10} /> Reports
      </div>
      <div className="page-head">
        <h1 className="page-title">Reports</h1>
      </div>

      {/* Live fleet summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div className="card" key={k.label} style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {REPORTS.map(r => (
          <div className="card" key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--m365-brand)', marginTop: 2 }}>
                <IconFile size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{r.period}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', margin: 0 }}>{r.desc}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <a
                href={`/api/reports/${r.id}`}
                className="btn primary small"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
              >
                <IconDownload size={12} /> CSV
              </a>
              <a
                href={`/api/reports/${r.id}?print=1`}
                target="_blank"
                rel="noreferrer"
                className="btn secondary small"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
              >
                <IconDownload size={12} /> PDF
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, padding: '14px 16px' }}>
        <div className="card-head">
          <div className="card-title">Scheduled reports</div>
          <button className="btn primary small">Add schedule</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>
          No scheduled reports configured. Click &quot;Add schedule&quot; to set up automated delivery.
        </p>
      </div>
    </>
  )
}
