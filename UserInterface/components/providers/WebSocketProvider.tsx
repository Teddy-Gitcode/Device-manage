'use client'
import { createContext, useContext } from 'react'
import { usePrinterEvents } from '@/hooks/usePrinterEvents'
import type { PrinterEvent } from '@/hooks/usePrinterEvents'

interface WsContext {
  events:    PrinterEvent[]
  connected: boolean
}

const Ctx = createContext<WsContext>({ events: [], connected: false })

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const state = usePrinterEvents()
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function usePrinterEventsCtx() {
  return useContext(Ctx)
}
