export type DeviceStatus    = 'ok' | 'warn' | 'danger' | 'neutral'
export type TonerAlert      = 'none' | 'low' | 'empty'
export type Recommendation  = 'keep' | 'relocate' | 'service'
export type JobState        = 'printing' | 'held' | 'queued'
export type TicketPriority  = 'high' | 'medium' | 'low'
export type TicketStatus    = 'open' | 'inprogress' | 'scheduled'
export type EventLevel      = 'critical' | 'warning' | 'info' | 'ok'

export interface Device {
  id:             string
  name:           string
  location:       string
  status:         DeviceStatus
  tonerAlert:     TonerAlert
  toner:          [number, number, number, number]   // [K%, C%, M%, Y%] — 0 if N/A
  tonerNames:     [string, string, string, string]   // actual model codes e.g. "TK-5270K"
  paper:          number | null   // null = no paper tray data from SNMP
  hasWasteToner:  boolean         // waste toner box present (even if level not measurable)
  wasteToner:     number | null   // fill %; null = box exists but SNMP can't measure level
  pages30d:       number
  pagesToday:     number
  utilization:    number
  recommendation: Recommendation
  ip:             string
  mac:            string
  serial:         string
  firmware:       string
  uptime:         string
  mono:           boolean
  lastService:    string
  jams30d:        number
  coverOpens30d:  number
  costPerPage:    string
  monthlyDuty:    string
  lifetimePages:  number
  jobs30d:        number
  avgJobSize:     number
  duplexRate:     number
  healthScore:    number
  activeAlerts:   string[]
}

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

export interface StockItem {
  name:       string
  sku:        string
  qty:        number
  cap:        number
  printerId?: string   // DB id of the owning printer
  category?:  string   // e.g. 'Toner', 'Paper', 'Drum'
}

export interface ReallocSuggestion {
  from:   { name: string; location: string; utilLabel: string }
  to:     { name: string; location: string; utilLabel: string }
  reason: string
}

export interface PrintJob {
  id:          string
  title:       string
  userName:    string
  dept:        string
  deviceId:    string
  pages:       number
  state:       JobState
  submittedAt: string
}

export interface TopUser {
  name:     string
  dept:     string
  initials: string
  color:    string
  pages:    number
  cost:     number
  quota:    number
}

export interface DeptCost {
  dept:  string
  color: number
  mono:  number
}

export interface ServiceTicket {
  id:       string
  title:    string
  device:   string
  priority: TicketPriority
  status:   TicketStatus
  age:      string
  assignee: string
}

export interface PrintPolicy {
  id:      string
  name:    string
  desc:    string
  enabled: boolean
}

export interface MetricHistory {
  dates:  string[]
  values: number[]
}
