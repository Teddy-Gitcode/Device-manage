import Link         from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconChevronRight, IconPrinter,
  IconDroplet, IconCpu, IconActivity, IconWrench,
  IconAlertCircle, IconAlert, IconInfo, IconCheckCircle,
} from '@/components/ui/Icons'
import { AnimatedNumber }       from '@/components/ui/AnimatedNumber'
import { AutoRefresh }          from '@/components/ui/AutoRefresh'
import { DeviceDetailActions }  from '@/components/devices/DeviceDetailActions'
import { api }                  from '@/lib/api'
import { normalizeDevice }      from '@/lib/normalize'
import type { DeviceStatus, TonerAlert } from '@/lib/types'

// ── Inline types for raw backend shapes ────────────────────────────────────

interface PageStats {
  today:      number
  this_week:  number
  this_month: number
  last_month: number
  daily:      { date: string; pages: number }[]
}

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

function buildChartPoints(daily: { date: string; pages: number }[], last = 7) {
  const slice = daily.slice(-last)
  if (slice.length < 2) return { line: '', area: '', labels: [] as string[] }
  const max = Math.max(...slice.map(d => d.pages), 1)
  const pts = slice.map((d, i) => {
    const x = (i / (slice.length - 1)) * 480
    const y = 10 + (1 - d.pages / max) * 90   // y: 10 (top) → 100 (bottom)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return {
    line:   pts.join(' '),
    area:   [...pts, '480,110', '0,110'].join(' '),
    labels: slice.map(d => {
      const dt = new Date(d.date)
      return dt.toLocaleDateString('en-GB', { weekday: 'short' })
    }),
  }
}

function VolRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
      <span style={{ fontSize: 13, color: 'var(--neutral-fg-2)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: highlight ? 'var(--m365-brand)' : 'var(--neutral-fg-1)' }}>
        {value.toLocaleString()} pp
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DevicePage({ params }: { params: { id: string } }) {
  const [rawPrinter, rawLogs] = await Promise.all([
    api.printer(params.id).catch(() => null),
    api.printerLogs(params.id).catch(() => []),
  ])

  if (!rawPrinter) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const device    = normalizeDevice(rawPrinter as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageStats = ((rawPrinter as any).page_stats ?? null) as PageStats | null
  const logs      = (rawLogs as BackendLog[]).slice(0, 60)

  const tonerKeys = device.mono ? (['K'] as const) : TONER_KEYS

  return (
    <div className="page-fade">
      {/* Silently re-fetches server data every 30 s (matches poll interval) */}
      <AutoRefresh seconds={30} />

      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Monitor
        <IconChevronRight size={10} />
        <Link href="/devices" style={{ color: 'var(--m365-brand)', textDecoration: 'none' }}>Devices</Link>
        <IconChevronRight size={10} />
        {device.name}
      </div>

      {/* Active alert banner — shown when the latest log has active alerts */}
      {logs.length > 0 && (logs[0].active_alerts ?? []).length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', marginBottom: 14, borderRadius: 'var(--radius-card)',
          background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)',
        }}>
          <IconAlertCircle size={16} style={{ color: 'var(--status-danger-fg)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-danger-fg)', marginBottom: 3 }}>
              Active alerts
            </div>
            {logs[0].active_alerts!.map((msg, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--status-danger-fg)', marginTop: 2 }}>{msg}</div>
            ))}
          </div>
        </div>
      )}

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

          {/* Right: status badges + actions */}
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
            <DeviceDetailActions device={device} />
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
          <div className="kpi-label">Pages today</div>
          <div className="kpi-num"><AnimatedNumber value={pageStats?.today ?? 0} /></div>
          <div className="kpi-sub">printed so far</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">This month</div>
          <div className="kpi-num"><AnimatedNumber value={pageStats?.this_month ?? device.pages30d} /></div>
          <div className="kpi-sub">pages printed</div>
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
        <div className="card kpi">
          <div className="kpi-label">Cover opens (30d)</div>
          <div className="kpi-num" style={{ color: device.coverOpens30d > 3 ? 'var(--status-warning-fg)' : 'inherit' }}>
            <AnimatedNumber value={device.coverOpens30d} />
          </div>
          <div className="kpi-sub">door / cover events</div>
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

            {device.paper !== null && (
              <>
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
              </>
            )}
            {device.hasWasteToner && (
              <>
                <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, margin: '14px 0 6px' }}>
                  Waste Toner
                </div>
                {device.wasteToner === null ? (
                  <div className="detail-toner-row">
                    <span className="label" style={{ fontSize: 9 }}>WT</span>
                    <div className="track">
                      <div className="bar-fill" style={{ width: '100%', background: 'var(--status-success-fg)', animationDelay: '0.36s' }} />
                    </div>
                    <span style={{ width: 38, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--status-success-fg)' }}>OK</span>
                  </div>
                ) : (
                  <div className="detail-toner-row">
                    <span className="label" style={{ fontSize: 9 }}>WT</span>
                    <div className="track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${device.wasteToner}%`,
                          background: device.wasteToner > 90 ? 'var(--status-danger-fg)' : device.wasteToner > 70 ? 'var(--status-warning-fg)' : 'var(--neutral-fg-3)',
                          animationDelay: '0.36s',
                        }}
                      />
                    </div>
                    <span style={{ width: 38, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: device.wasteToner > 70 ? 'var(--status-warning-fg)' : undefined }}>
                      {device.wasteToner}% full
                    </span>
                  </div>
                )}
              </>
            )}
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

          {/* Activity chart — last 7 days real data */}
          {(() => {
            const chart = buildChartPoints(pageStats?.daily ?? [], 7)
            const hasData = chart.line.length > 0
            return (
              <div className="card" style={{ padding: '16px 20px' }}>
                <div className="card-head" style={{ marginBottom: 10 }}>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconActivity size={14} /> Activity · last 7 days
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>pages per day</span>
                </div>
                {hasData ? (
                  <>
                    <svg width="100%" height="110" viewBox="0 0 480 110" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--m365-brand)" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="var(--m365-brand)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polyline points={chart.line} fill="none" stroke="var(--m365-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <polygon  points={chart.area} fill="url(#areaGrad)" />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      {chart.labels.map((l, i) => (
                        <span key={i} style={{ fontSize: 10, color: 'var(--neutral-fg-3)' }}>{l}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '16px 0' }}>No activity data yet.</p>
                )}
              </div>
            )
          })()}

          {/* Print volume breakdown */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="card-head" style={{ marginBottom: 4 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconActivity size={14} /> Print volume
              </div>
            </div>
            <VolRow label="Today"      value={pageStats?.today      ?? 0} highlight />
            <VolRow label="This week"  value={pageStats?.this_week  ?? 0} />
            <VolRow label="This month" value={pageStats?.this_month ?? 0} />
            <VolRow label="Last month" value={pageStats?.last_month ?? 0} />
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
                const alerts = log.active_alerts ?? []
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
                      {alerts.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--status-danger-fg)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alerts[0]}
                        </div>
                      )}
                      {!alerts.length && log.console_display && (
                        <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.console_display}
                        </div>
                      )}
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
                  const level  = eventTypeToLevel(log.event_type)
                  const alerts = log.active_alerts ?? []
                  return (
                    <tr key={log.id} style={{ cursor: 'default' }}>
                      <td style={{ color: 'var(--neutral-fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{eventTypeLabel(log.event_type)}</div>
                        {alerts.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--status-danger-fg)', marginTop: 2 }}>{alerts[0]}</div>
                        )}
                        {!alerts.length && log.console_display && (
                          <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{log.console_display}</div>
                        )}
                      </td>
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
