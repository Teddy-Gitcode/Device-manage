'use client'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrinterEventsCtx } from '@/components/providers/WebSocketProvider'
import { levelToClass, formatRelativeTime } from '@/lib/utils'
import {
  IconCheckCircle, IconAlertCircle, IconAlert, IconInfo,
} from '@/components/ui/Icons'
import type { EventLevel } from '@/lib/types'

const LEVEL_ICON: Record<EventLevel, React.ElementType> = {
  ok:       IconCheckCircle,
  warning:  IconAlert,
  critical: IconAlertCircle,
  info:     IconInfo,
}

export function AlertFeed({ limit }: { limit?: number }) {
  const { events, connected } = usePrinterEventsCtx()
  const visible = limit ? events.slice(0, limit) : events

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Live events</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--neutral-fg-3)' }}>
          <span className={'conn-dot' + (connected ? '' : ' warn')} />
          {connected ? 'Connected' : 'Reconnecting'}
        </span>
      </div>

      <div>
        {visible.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '12px 0' }}>
            Waiting for events…
          </p>
        )}
        <AnimatePresence initial={false}>
          {visible.map(e => {
            const LevelIcon = LEVEL_ICON[e.level] ?? IconInfo
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0,  height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <Link
                  href={`/devices/${e.deviceId}`}
                  className="event"
                  style={{ textDecoration: 'none', display: 'flex', cursor: 'pointer' }}
                >
                  <div className={'ei ' + levelToClass(e.level)}>
                    <LevelIcon size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="msg">{e.message}</div>
                    <div className="src">{e.deviceName} · {formatRelativeTime(e.timestamp)}</div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
