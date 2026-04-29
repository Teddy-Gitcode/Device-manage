import Link         from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconChevronRight, IconPrinter, IconRefresh,
  IconDroplet, IconCpu, IconActivity, IconWrench,
  IconAlertCircle, IconAlert, IconInfo, IconCheckCircle,
} from '@/components/ui/Icons'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { api }            from '@/lib/api'
import { normalizeDevice } from '@/lib/normalize'
import type { DeviceStatus, TonerAlert } from '@/lib/types'

// ── Inline types for raw backend shapes ────────────────────────────────────

interface BackendLog {
  id:              number
  printer:         number
  timestamp:       string
  status:          string
  event_type:      string
  total_pages:     number
  console_display: string | null
  active_alerts:   string[] | null
  error_code:      string | null
}

// ── Small server-safe helpers ───────────────────────────────────────────────

const STATUS_LABELS: Record<DeviceStatus, string> = {
  ok: 'Online', warn: 'Warning', danger: 'Offline', neutral: 'Sleeping',
}

const TONER_ALERT_LABEL: Record<TonerAlert, string | null> = {
  none: null, low: 'Low Toner', empty: 'Replace Toner',
}
const TONER_ALERT_CLASS: Record<TonerAlert, string> = {
  none: '', low: 'warn', empty: 'danger',
}

const TONER_COLORS: Record<string, string> = {
  K: 'var(--toner-k)', C: 'var(--toner-c)', M: 'var(--toner-m)', Y: 'var(--toner-y)',
}
const TONER_KEYS = ['K', 'C', 'M', 'Y'] as const

function HealthRing({ score }: { score: number }) {
  const r     = 26
  const circ  = 2 * Math.PI * r
  const pct   = Math.min(Math.max(score, 0), 100)
  const dash  = circ * (pct / 100)
  const color = pct >= 80
    ? 'var(--status-success-fg)'
    : pct >= 50
      ? 'var(--status-warning-fg)'
      : 'var(--status-danger-fg)'

  return (
    <svg width={68} height={68} viewBox="0 0 68 68" style={{ display: 'block' }}>
      <circle cx={34} cy={34} r={r} fill="none" stroke="var(--neutral-bg-3)" strokeWidth={6} />
      <circle
        cx={34} cy={34} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x={34} y={34}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={15}
        fontWeight={700}
        fill={color}
      >
        {pct}
      </text>
    </svg>
  )
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="spec-row">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  )
}

function eventTypeToLevel(t: string): string {
  if (['PAPER_JAM', 'OFFLINE'].includes(t)) return 'danger'
  if (['LOW_TONER'].includes(t))            return 'warn'
  if (['MAINTENANCE'].includes(t))          return 'info'
  return 'ok'
}

function eventTypeLabel(t: string): string {
  const map: Record<string, string> = {
    STATUS_CHECK: 'Status check',
    PAPER_JAM:   'Paper jam',
    LOW_TONER:   'Low toner',
    OFFLINE:     'Offline',
    MAINTENANCE: 'Maintenance',
  }
  return map[t] ?? t
}

const LEVEL_ICON: Record<string, React.ElementType> = {
  ok:     IconCheckCircle,
  warn:   IconAlert,
  danger: IconAlertCircle,
  info:   IconInfo,
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DevicePage({ params }: { params: { id: string } }) {
  const [rawPrinter, rawLogs] = await Promise.all([
    api.printer(params.id).catch(() => null),
    api.printerLogs(params.id).catch(() => []),
  ])

  if (!rawPrinter) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const device = normalizeDevice(rawPrinter as any)
  const logs   = (rawLogs as BackendLog[]).slice(0, 60)

  const tonerKeys = device.mono ? (['K'] as const) : TONER_KEYS

  return (
    <div className="page-fade">
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Monitor
        <IconChevronRight size={10} />
        <Link href="/devices" style={{ color: 'var(--m365-brand)', textDecoration: 'none' }}>Devices</Link>
        <IconChevronRight size={10} />
        {device.name}
      </div>

      {/* Hero card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {/* Left: icon + name */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: 'var(--m365-brand)', flexShrink: 0 }}>
              <IconPrinter size={36} />
            </span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{device.name}</div>
              <div style={{ fontSize: 13, color: 'var(--neutral-fg-3)', marginTop: 4 }}>
                {device.location}
                {device.ip !== '—' && <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>}
                {device.ip !== '—' && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{device.ip}</span>}
                {device.serial !== '—' && (
                  <>
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                    <span>S/N {device.serial}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: status + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={'badge ' + device.status} style={{ fontSize: 12 }}>
                <span className="dot" />{STATUS_LABELS[device.status]}
              </span>
              {TONER_ALERT_LABEL[device.tonerAlert] && (
                <span className={'badge ' + TONER_ALERT_CLASS[device.tonerAlert]} style={{ fontSize: 12 }}>
                  <span className="dot" />{TONER_ALERT_LABEL[device.tonerAlert]}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn secondary small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <IconRefresh size={13} /> Poll now
              </button>
              <button className="btn secondary small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <IconDroplet size={13} /> Order toner
              </button>
              <button className="btn primary small" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <IconWrench size={13} /> Schedule service
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div className="kpi-label">Health score</div>
          <HealthRing score={device.healthScore} />
          <div className="kpi-sub">out of 100</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Pages (30d)</div>
          <div className="kpi-num"><AnimatedNumber value={device.pages30d} /></div>
          <div className="kpi-sub">total printed</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Utilization</div>
          <div className="kpi-num"><AnimatedNumber value={device.utilization} suffix="%" /></div>
          <div className="kpi-sub">of monthly duty cycle</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Jams (30d)</div>
          <div className="kpi-num" style={{ color: device.jams30d > 5 ? 'var(--status-danger-fg)' : 'inherit' }}>
            <AnimatedNumber value={device.jams30d} />
          </div>
          <div className="kpi-sub">paper jams recorded</div>
        </div>
      </div>

      {/* 2-column: consumables + specs | activity + events */}
      <div className="dash-grid" style={{ marginBottom: 16 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Consumables card */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconDroplet size={14} /> Consumables
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, marginBottom: 6 }}>
              Toner
            </div>
            {tonerKeys.map((ch, i) => {
              const v    = device.toner[i]
              const name = device.tonerNames[i] || ch
              return (
                <div key={ch} className="detail-toner-row">
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                    color: TONER_COLORS[ch], flexShrink: 0, minWidth: 72,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={name}>
                    {name}
                  </span>
                  <div className="track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${v}%`,
                        background: v < 20 ? 'var(--status-danger-fg)' : TONER_COLORS[ch],
                        animationDelay: `${i * 0.09}s`,
                      }}
                    />
                  </div>
                  <span style={{ width: 38, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: v < 20 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-1)' }}>
                    {v}%
                  </span>
                </div>
              )
            })}

            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, margin: '14px 0 6px' }}>
              Paper
            </div>
            <div className="detail-toner-row">
              <span className="label">P</span>
              <div className="track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${device.paper}%`,
                    background: device.paper < 20 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)',
                    animationDelay: '0.36s',
                  }}
                />
              </div>
              <span style={{ width: 38, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {device.paper}%
              </span>
            </div>
          </div>

          {/* Specifications card */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="card-head" style={{ marginBottom: 8 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCpu size={14} /> Specifications
              </div>
            </div>
            <SpecRow label="IP address"     value={device.ip} />
            <SpecRow label="MAC address"    value={device.mac} />
            <SpecRow label="Serial number"  value={device.serial} />
            <SpecRow label="Firmware"       value={device.firmware} />
            <SpecRow label="Monthly duty"   value={device.monthlyDuty} />
            <SpecRow label="Lifetime pages" value={device.lifetimePages.toLocaleString()} />
            <SpecRow label="Cost per page"  value={device.costPerPage} />
            <SpecRow label="Last serviced"  value={device.lastService} />
            <SpecRow label="Recommendation" value={
              <span className={'chip ' + device.recommendation}>
                {device.recommendation[0].toUpperCase() + device.recommendation.slice(1)}
              </span>
            } />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Activity chart */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="card-head" style={{ marginBottom: 10 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconActivity size={14} /> Activity · last 7 days
              </div>
              <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>pages per day</span>
            </div>
            <svg width="100%" height="110" viewBox="0 0 480 110" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--m365-brand)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--m365-brand)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points="0,80 68,65 136,72 204,45 272,58 342,32 410,40 480,24"
                fill="none" stroke="var(--m365-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <polygon
                points="0,80 68,65 136,72 204,45 272,58 342,32 410,40 480,24 480,110 0,110"
                fill="url(#areaGrad)"
              />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <span key={d} style={{ fontSize: 10, color: 'var(--neutral-fg-3)' }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Recent events */}
          <div className="card" style={{ padding: '16px 20px', flex: 1 }}>
            <div className="card-head" style={{ marginBottom: 8 }}>
              <div className="card-title">Recent events</div>
              {logs.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{logs.length} logged</span>
              )}
            </div>
            {logs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No events logged for this device.</p>
            ) : (
              logs.slice(0, 8).map((log, i) => {
                const level = eventTypeToLevel(log.event_type)
                const LIcon = LEVEL_ICON[level] ?? IconInfo
                return (
                  <div
                    key={log.id}
                    className="stagger"
                    style={{
                      '--i': i,
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '8px 0',
                      borderBottom: i < 7 ? '1px solid var(--neutral-stroke-divider)' : 'none',
                    } as React.CSSProperties}
                  >
                    <div className={'ei ' + level} style={{ width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', flexShrink: 0, fontSize: 0 }}>
                      <LIcon size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{eventTypeLabel(log.event_type)}</div>
                      <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>
                        {new Date(log.timestamp).toLocaleString()} · {log.total_pages?.toLocaleString() ?? '—'} pp
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Full event log */}
      {logs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '14px 20px', marginBottom: 0 }}>
            <div className="card-title">Full event log</div>
            <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{logs.length} entries</span>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <table className="table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Level</th>
                  <th style={{ textAlign: 'right' }}>Pages</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const level = eventTypeToLevel(log.event_type)
                  return (
                    <tr key={log.id} style={{ cursor: 'default' }}>
                      <td style={{ color: 'var(--neutral-fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 500 }}>{eventTypeLabel(log.event_type)}</td>
                      <td style={{ color: 'var(--neutral-fg-2)' }}>{log.status || '—'}</td>
                      <td>
                        <span className={'badge ' + level}>
                          <span className="dot" />{level}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {log.total_pages?.toLocaleString() ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
