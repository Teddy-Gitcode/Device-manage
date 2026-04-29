'use client'
import { useEffect, useRef, useCallback, useReducer } from 'react'

export type EventLevel = 'critical' | 'warning' | 'info' | 'ok'

export interface PrinterEvent {
  id:         string
  deviceId:   string
  deviceName: string
  type:       'jam' | 'cover_open' | 'toner_low' | 'paper_empty' |
              'job_complete' | 'job_held' | 'offline' | 'online' | 'info'
  level:      EventLevel
  message:    string
  timestamp:  string
}

interface State {
  events:    PrinterEvent[]
  connected: boolean
}

type Action =
  | { type: 'EVENT';        payload: PrinterEvent }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'EVENT':
      return { ...state, events: [action.payload, ...state.events].slice(0, 100) }
    case 'CONNECTED':
      return { ...state, connected: true }
    case 'DISCONNECTED':
      return { ...state, connected: false }
  }
}

export function usePrinterEvents() {
  const [state, dispatch] = useReducer(reducer, { events: [], connected: false })
  const ws = useRef<WebSocket | null>(null)
  const retryDelay = useRef(1000)

  const connect = useCallback(() => {
    const token = localStorage.getItem('ketepa_auth_token') ?? ''
    const url   = `ws://${window.location.hostname}:8000/ws/printers/?token=${token}`

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      dispatch({ type: 'CONNECTED' })
      retryDelay.current = 1000
    }

    ws.current.onmessage = (msg) => {
      try {
        const event: PrinterEvent = JSON.parse(msg.data)
        dispatch({ type: 'EVENT', payload: event })
      } catch {
        console.warn('WS parse error:', msg.data)
      }
    }

    ws.current.onclose = () => {
      dispatch({ type: 'DISCONNECTED' })
      setTimeout(connect, Math.min(retryDelay.current, 30_000))
      retryDelay.current *= 2
    }

    ws.current.onerror = () => ws.current?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return state
}
