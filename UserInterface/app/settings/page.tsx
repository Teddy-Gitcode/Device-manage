import { IconChevronRight, IconWifi, IconBell, IconDatabase, IconCpu } from '@/components/ui/Icons'

const SECTION_ICON: Record<string, React.ElementType> = {
  'Discovery & polling':      IconWifi,
  'Alerts & notifications':   IconBell,
  'Data retention':           IconDatabase,
  'System':                   IconCpu,
}

export default function SettingsPage() {
  const sections = [
    {
      title: 'Discovery & polling',
      rows: [
        { label: 'Poll interval',           value: '5 minutes',   desc: 'How often active printers are polled via SNMP' },
        { label: 'Discovery interval',      value: 'Daily 02:00', desc: 'Network scan for new devices' },
        { label: 'Subnet prefix',           value: '192.168.x.x', desc: 'Address range scanned during discovery' },
        { label: 'SNMP community string',   value: '••••••••',    desc: 'Shared secret for SNMP v2c' },
        { label: 'Poll concurrency limit',  value: '10',          desc: 'Max simultaneous SNMP connections' },
      ],
    },
    {
      title: 'Alerts & notifications',
      rows: [
        { label: 'Alert recipients',        value: 'lonewalker634@gmail.com', desc: 'Comma-separated email addresses' },
        { label: 'From address',            value: 'alerts@ketepa.co.ke',     desc: 'Sender for all alert emails' },
        { label: 'Low toner threshold',     value: '10%',                     desc: 'Trigger alert when toner drops below this' },
        { label: 'Down alert cool-off',     value: '60 seconds',              desc: 'Minimum time before re-alerting for same device' },
        { label: 'Email backend',           value: 'Mailtrap (sandbox)',      desc: 'Switch to Gmail SMTP for live delivery' },
      ],
    },
    {
      title: 'Data retention',
      rows: [
        { label: 'Log retention',           value: '90 days',       desc: 'PrinterLog entries older than this are deleted' },
        { label: 'Database',                value: 'PostgreSQL 15',  desc: 'Primary data store' },
        { label: 'Message broker',          value: 'Redis',          desc: 'Celery queue and alert deduplication' },
      ],
    },
    {
      title: 'System',
      rows: [
        { label: 'Backend version',         value: 'Django 4.x',     desc: '' },
        { label: 'Frontend version',        value: 'Next.js 14',     desc: '' },
        { label: 'Environment',             value: 'Docker (local)', desc: '' },
      ],
    },
  ]

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Admin <IconChevronRight size={10} /> Settings
      </div>
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
        <button className="btn primary">Save changes</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
        {sections.map((sec, si) => {
          const SIcon = SECTION_ICON[sec.title]
          return (
            <div className="card stagger" key={sec.title} style={{ padding: '14px 16px', '--i': si } as React.CSSProperties}>
              <div className="card-head">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {SIcon && <SIcon size={14} />}
                  {sec.title}
                </div>
              </div>
              {sec.rows.map(row => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '10px 0', borderBottom: '1px solid var(--neutral-stroke-divider)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{row.label}</div>
                    {row.desc && (
                      <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{row.desc}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <input
                      defaultValue={row.value}
                      style={{
                        height: 28, padding: '0 10px', fontSize: 12,
                        border: '1px solid var(--neutral-stroke-1)',
                        borderRadius: 'var(--radius-control)',
                        background: 'var(--neutral-bg-2)',
                        color: 'var(--neutral-fg-1)',
                        outline: 'none',
                        minWidth: 200,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
