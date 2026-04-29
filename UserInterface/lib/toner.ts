import type { StockItem } from './types'

// ── Series / channel extraction ──────────────────────────────────────────────
// Handles three real-world naming formats from the backend:
//   "TK-5380K"                    → { series: "TK-5380",    channel: "K" }
//   "TK-1170"                     → { series: "TK-1170",    channel: "K", isMono: true }
//   "Black Cartridge HP W2220A"   → { series: "HP W222xA",  channel: "K" }
//   "Cyan Ink Bottle"             → { series: "Ink Bottle",  channel: "C" }

const COLOR_WORD_CHANNEL: Record<string, string> = {
  BLACK: 'K', CYAN: 'C', MAGENTA: 'M', YELLOW: 'Y',
}

export function getTonerMeta(name: string): { series: string; channel: string; isMono: boolean } {
  const trimmed   = name.trim()
  const upper     = trimmed.toUpperCase().replace(/\s+/g, ' ')

  // 1. Kyocera TK-style with KCMY suffix  →  "TK-5380K"
  const tkMatch = upper.match(/^(TK-[0-9A-Z]+?)([KCMY])$/)
  if (tkMatch) return { series: tkMatch[1], channel: tkMatch[2], isMono: false }

  // 2. Colour-word prefix  →  "Black Cartridge HP W2220A" / "Cyan Ink Bottle"
  for (const [word, channel] of Object.entries(COLOR_WORD_CHANNEL)) {
    if (upper.startsWith(word + ' ')) {
      const rest = upper.slice(word.length + 1).trim()   // e.g. "CARTRIDGE HP W2220A"

      // HP part number: letter + 4 digits + letter  →  normalize color digit to 'x'
      // W2220A → W222xA  so all KCMY variants share the same series key
      const hpPart = rest.match(/\b([A-Z][0-9]{3})[0-9]([A-Z])$/)
      const series = hpPart
        ? rest.replace(/\b([A-Z][0-9]{3})[0-9]([A-Z])$/, `$1x$2`)   // "CARTRIDGE HP W222xA"
        : rest                                                          // "INK BOTTLE"

      return { series, channel, isMono: false }
    }
  }

  // 3. Generic: anything ending in a digit then K/C/M/Y
  const generic = upper.match(/^(.*[0-9])([KCMY])$/)
  if (generic) return { series: generic[1], channel: generic[2], isMono: false }

  // 4. Mono fallback  →  "TK-1170", "CF226A", empty name
  return { series: upper || '—', channel: 'K', isMono: true }
}

// ── Channel display names ─────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<string, string> = {
  K: 'Black', C: 'Cyan', M: 'Magenta', Y: 'Yellow',
}

export const CHANNEL_COLOR: Record<string, string> = {
  K: 'var(--toner-k)', C: 'var(--toner-c)', M: 'var(--toner-m)', Y: 'var(--toner-y)',
}

// ── Group StockItem[] by toner series ─────────────────────────────────────────

export interface ChannelGroup {
  channel:    string        // K / C / M / Y
  fullName:   string        // e.g. "TK-5380K"
  items:      StockItem[]   // one per printer that has this toner
  avgPct:     number
  minPct:     number
  isCritical: boolean       // any item < 20%
}

export interface SeriesGroup {
  series:     string        // e.g. "TK-5380"
  isMono:     boolean
  channels:   ChannelGroup[]
  printers:   number        // distinct printer count
  isCritical: boolean
}

export function groupByTonerSeries(stock: StockItem[]): SeriesGroup[] {
  // Only toner consumables — exclude waste toner, empty names
  const toners = stock.filter(s =>
    s.name.trim() !== '' &&
    s.category?.toLowerCase() === 'toner' &&
    s.category?.toLowerCase() !== 'waste_toner'
  )

  // Map: series → channel → items[]
  const map = new Map<string, Map<string, StockItem[]>>()

  for (const item of toners) {
    const { series, channel } = getTonerMeta(item.name)
    if (!map.has(series)) map.set(series, new Map())
    const chMap = map.get(series)!
    if (!chMap.has(channel)) chMap.set(channel, [])
    chMap.get(channel)!.push(item)
  }

  const groups: SeriesGroup[] = []
  const CHANNEL_ORDER = ['K', 'C', 'M', 'Y']

  Array.from(map.entries()).forEach(([series, chMap]) => {
    const kItems = chMap.get('K')
    const isMono = chMap.size === 1 && !!kItems &&
      getTonerMeta(kItems[0].name).isMono

    const channels: ChannelGroup[] = Array.from(chMap.entries())
      .sort((a, b) => CHANNEL_ORDER.indexOf(a[0]) - CHANNEL_ORDER.indexOf(b[0]))
      .map(([channel, items]) => {
        const pcts = items.map((i: StockItem) => i.cap > 0 ? Math.round((i.qty / i.cap) * 100) : 0)
        const avgPct = pcts.length ? Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length) : 0
        const minPct = pcts.length ? Math.min(...pcts) : 0
        return {
          channel,
          fullName:   items[0].name,
          items,
          avgPct,
          minPct,
          isCritical: minPct < 20,
        }
      })

    const printerSet = new Set(
      channels.flatMap(ch => ch.items.map((i: StockItem) => i.printerId ?? ''))
    )

    groups.push({
      series,
      isMono,
      channels,
      printers:   printerSet.size,
      isCritical: channels.some(ch => ch.isCritical),
    })
  })

  // Sort: critical first, then alphabetically
  return groups.sort((a, b) => {
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
    return a.series.localeCompare(b.series)
  })
}
