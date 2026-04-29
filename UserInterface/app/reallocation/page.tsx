import { IconChevronRight } from '@/components/ui/Icons'
import { ReallocCards }      from '@/components/dashboard/ReallocCards'
import { api }               from '@/lib/api'

export default async function ReallocationPage() {
  const suggestions = await api.realloc()

  return (
    <>
      <div className="breadcrumb">
        Operate <IconChevronRight size={10} /> Reallocation
      </div>
      <div className="page-head">
        <h1 className="page-title">Reallocation</h1>
      </div>

      <div className="dash-grid">
        <div>
          <ReallocCards suggestions={suggestions} />
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="card-head"><div className="card-title">How it works</div></div>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', lineHeight: '1.6' }}>
            Reallocation suggestions are generated when a device consistently operates below 20% utilization
            while another device in the fleet is over its rated monthly duty cycle.
          </p>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-2)', lineHeight: '1.6', marginTop: 12 }}>
            Approving a suggestion creates a service ticket and notifies the IT admin. Dismissing it
            suppresses the suggestion for 30 days.
          </p>
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--neutral-bg-3)', borderRadius: 'var(--radius-control)', fontSize: 12, color: 'var(--neutral-fg-3)' }}>
            Suggestions refresh automatically after each nightly discovery scan.
          </div>
        </div>
      </div>
    </>
  )
}
