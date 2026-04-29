'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconX, IconRefresh, IconDroplet, IconCheckCircle,
  IconInfo, IconActivity, IconCpu, IconArrowRight,
} from '@/components/ui/Icons'
import type { Device, DeviceStatus } from '@/lib/types'

type Tab = 'overview' | 'consumables' | 'activity' | 'specs'

const STATUS_LABELS: Record<DeviceStatus, string> = {
  ok:      'Online',
  warn:    'Warning',
  danger:  'Offline',
  neutral: 'Sleeping',
}

const TONER_COLORS: Record<string, string> = {
  K: 'var(--toner-k)',
  C: 'var(--toner-c)',
  M: 'var(--toner-m)',
  Y: 'var(--toner-y)',
}

const TONER_KEYS = ['K', 'C', 'M', 'Y'] as const

const TAB_META: Record<Tab, { label: string; Icon: React.ElementType }> = {
  overview:    { label: 'Overview',    Icon: IconInfo },
  consumables: { label: 'Consumables', Icon: IconDroplet },
  activity:    { label: 'Activity',    Icon: IconActivity },
  specs:       { label: 'Specs',       Icon: IconCpu },
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
      <span style={{ color: 'var(--neutral-fg-3)' }}>{k}</span>
      <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  )
}

export function DeviceDetailPanel({ device, onClose }: { device: Device | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => { setTab('overview') }, [device?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const open = !!device
  const d = device

  return (
    <>
      <div className={'panel-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <aside className={'detail-panel' + (open ? ' open' : '')} aria-label="Device details">
        {d && (
          <>
            <header>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500 }}>{d.id}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--neutral-fg-3)' }}>{d.location}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <Link
                    href={`/devices/${d.id}`}
                    className="btn subtle small"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                    onClick={onClose}
                  >
                    Full details <IconArrowRight size={11} />
                  </Link>
                  <button className="btn subtle small" onClick={onClose} aria-label="Close">
                    <IconX size={16} />
                  </button>
                </div>
              </div>
            </header>

            <div className="detail-toolbar">
              <button className="btn secondary small"><IconRefresh size={14} /> Poll now</button>
              <button className="btn secondary small"><IconDroplet size={14} /> Order toner</button>
              <button className="btn primary small">Schedule service</button>
            </div>

            <div className="tabs">
              {(Object.keys(TAB_META) as Tab[]).map(t => {
                const { label, Icon } = TAB_META[t]
                return (
                  <div key={t} className={'tab' + (t === tab ? ' active' : '')} onClick={() => setTab(t)}>
                    <Icon size={12} />
                    {label}
                  </div>
                )
              })}
            </div>

            {/* AnimatePresence fades content between tabs */}
            <div className="body">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{    opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  {tab === 'overview' && (
                    <div>
                      <Row k="Status" v={
                        <span className={'badge ' + d.status}>
                          <span className="dot" />{STATUS_LABELS[d.status]}
                        </span>
                      } />
                      <Row k="Utilization"    v={`${d.utilization}%`} />
                      <Row k="Pages (30d)"    v={d.pages30d.toLocaleString()} />
                      <Row k="Jams (30d)"     v={d.jams30d} />
                      <Row k="Uptime"         v={d.uptime} />
                      <Row k="Last service"   v={d.lastService} />
                      <Row k="Recommendation" v={
                        <span className={'chip ' + d.recommendation}>
                          {d.recommendation[0].toUpperCase() + d.recommendation.slice(1)}
                        </span>
                      } />

                      {/* Utilization bar */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500 }}>
                          Utilization
                        </div>
                        <div className="util">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${d.utilization}%`,
                              background: d.utilization > 85
                                ? 'var(--status-danger-fg)'
                                : d.utilization < 20
                                  ? 'var(--neutral-fg-disabled)'
                                  : 'var(--m365-brand)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'consumables' && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500, marginBottom: 8 }}>
                        Toner
                      </div>
                      {(d.mono ? (['K'] as const) : TONER_KEYS).map((ch, i) => {
                        const v    = d.toner[i]
                        const name = d.tonerNames[i] || ch
                        return (
                          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                              color: TONER_COLORS[ch], flexShrink: 0, minWidth: 72,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }} title={name}>
                              {name}
                            </span>
                            <div style={{ flex: 1, height: 6, background: 'var(--neutral-bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${v}%`,
                                  background: v < 20 ? 'var(--status-danger-fg)' : TONER_COLORS[ch],
                                  animationDelay: `${i * 0.08}s`,
                                }}
                              />
                            </div>
                            <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: v < 20 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-1)' }}>
                              {v}%
                            </span>
                          </div>
                        )
                      })}

                      <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500, marginTop: 16, marginBottom: 8 }}>
                        Paper
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 18, fontSize: 11, fontWeight: 600 }}>P</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--neutral-bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${d.paper}%`,
                              background: 'var(--neutral-fg-3)',
                              animationDelay: '0.32s',
                            }}
                          />
                        </div>
                        <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {d.paper}%
                        </span>
                      </div>
                    </div>
                  )}

                  {tab === 'activity' && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--neutral-fg-3)', marginBottom: 8 }}>
                        Last 7 days · pages per day
                      </div>
                      <svg width="100%" height="90" viewBox="0 0 420 90">
                        <polyline
                          points="0,70 60,58 120,62 180,40 240,52 300,30 360,38 420,22"
                          fill="none"
                          stroke="var(--m365-brand)"
                          strokeWidth="2"
                        />
                        <polyline
                          points="0,70 60,58 120,62 180,40 240,52 300,30 360,38 420,22 420,90 0,90"
                          fill="var(--m365-brand-tint-10)"
                          stroke="none"
                        />
                      </svg>
                      <div style={{ marginTop: 12 }}>
                        {[
                          { t: '2m ago',  e: 'Status checked',                         lvl: 'info'  },
                          { t: '1h ago',  e: `Pages: ${d.pages30d.toLocaleString()} (30d)`, lvl: 'info'  },
                          { t: '3h ago',  e: 'Poll completed',                          lvl: 'ok'    },
                          { t: '1d ago',  e: `Jams this month: ${d.jams30d}`,           lvl: 'info'  },
                        ].map((e, i) => (
                          <div key={i} className="stagger" style={{ '--i': i, display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--neutral-stroke-divider)', fontSize: 12 } as React.CSSProperties}>
                            <span style={{ width: 60, color: 'var(--neutral-fg-3)' }}>{e.t}</span>
                            <span>{e.e}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'specs' && (
                    <div>
                      <Row k="IP address"     v={d.ip} />
                      <Row k="MAC"            v={d.mac} />
                      <Row k="Serial"         v={d.serial} />
                      <Row k="Firmware"       v={d.firmware} />
                      <Row k="Monthly duty"   v={d.monthlyDuty} />
                      <Row k="Lifetime pages" v={d.lifetimePages.toLocaleString()} />
                      <Row k="Cost / page"    v={d.costPerPage} />
                      <Row k="Duplex rate"    v={`${d.duplexRate}%`} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
