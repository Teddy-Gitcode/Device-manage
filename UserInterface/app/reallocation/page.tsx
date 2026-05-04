import { IconChevronRight } from '@/components/ui/Icons'
import { ReallocCards }      from '@/components/dashboard/ReallocCards'
import { api }               from '@/lib/api'
import { normalizeDevices, normalizeRealloc } from '@/lib/normalize'

export default async function ReallocationPage() {
  const rawPrinters = await api.printers().catch(() => [])
  const devices     = normalizeDevices(rawPrinters as Parameters<typeof normalizeDevices>[0])
  const suggestions = normalizeRealloc(devices)

  return (
    <>
      <div className="breadcrumb">
        Operate <IconChevronRight size={10} /> Reallocation
      </div>
      <div className="page-head">
        <h1 className="page-title">Reallocation</h1>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Total devices</div>
          <div className="kpi-num">{devices.length}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Underutilised (&lt;20%)</div>
          <div className="kpi-num">{devices.filter(d => d.utilization < 20).length}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Overloaded (&gt;80%)</div>
          <div className="kpi-num" style={{ color: devices.filter(d => d.utilization > 80).length > 0 ? 'var(--status-warning-fg)' : 'inherit' }}>
            {devices.filter(d => d.utilization > 80).length}
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Suggestions</div>
          <div className="kpi-num">{suggestions.length}</div>
        </div>
      </div>

      <div className="dash-grid">
        <ReallocCards suggestions={suggestions} />

        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="card-head"><div className="card-title">How it works</div></div>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', lineHeight: '1.6' }}>
            Suggestions appear when a device consistently operates below 20% utilisation
            while another device in the fleet is over 80% of its rated monthly duty cycle.
          </p>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', lineHeight: '1.6', marginTop: 12 }}>
            Approving a suggestion creates a service ticket and notifies the IT admin.
            Dismissing it suppresses the suggestion for 30 days.
          </p>
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--neutral-bg-3)', borderRadius: 'var(--radius-control)', fontSize: 12, color: 'var(--neutral-fg-3)' }}>
            Utilisation is recalculated on every page load from live SNMP data.
          </div>

          {/* Utilisation breakdown */}
          {devices.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
                Fleet utilisation
              </div>
              {[...devices]
                .sort((a, b) => b.utilization - a.utilization)
                .map(d => {
                  const color = d.utilization > 80
                    ? 'var(--status-warning-fg)'
                    : d.utilization < 20
                      ? 'var(--status-danger-fg)'
                      : 'var(--m365-brand)'
                  return (
                    <div key={d.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d.name}</span>
                        <span style={{ color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{d.utilization}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--neutral-bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.utilization}%`, background: color, borderRadius: 2 }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
