'use client'
import { useMemo } from 'react'
import { usePrinterEventsCtx } from '@/components/providers/WebSocketProvider'
import type { DeviceStatus } from '@/lib/types'

export function useDeviceStatus(): Map<string, DeviceStatus> {
  const { events } = usePrinterEventsCtx()

  return useMemo(() => {
    const map = new Map<string, DeviceStatus>()
    for (const e of events) {
      if (map.has(e.deviceId)) continue
      if (['jam', 'cover_open', 'offline'].includes(e.type))      map.set(e.deviceId, 'danger')
      else if (['toner_low', 'paper_empty'].includes(e.type))     map.set(e.deviceId, 'warn')
      else if (['online', 'job_complete'].includes(e.type))       map.set(e.deviceId, 'ok')
    }
    return map
  }, [events])
}
