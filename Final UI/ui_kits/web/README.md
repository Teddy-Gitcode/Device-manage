# Ketepa Print Fleet — Web UI Kit

Interactive click-through recreation of the Next.js dashboard described in `DESIGN/DESIGN.md`. Opens on the Dashboard page with a live-feed simulation; click any device row to open the detail panel; toggle policies; dismiss / approve reallocation suggestions.

## Files

| File | Role |
| --- | --- |
| `index.html` | Boots React 18 via CDN + Babel standalone. Mounts `App`. |
| `styles.css` | UI kit styles — imports `../../colors_and_type.css` then adds layout/component rules. |
| `Icons.js` | Inline Lucide SVG path library. |
| `data.js` | Seed data: devices, stock, tickets, policies, users, costs, reallocation suggestions, seed event feed. |
| `Chrome.jsx` | `SuiteHeader` + `SideNav`. |
| `Dashboard.jsx` | `KpiTiles`, `DeviceTable`, `AlertFeed`, `StockInventory`, `ServiceTickets`, `CostByDept`, `PrintPolicies`, `ReallocCards`, `DeviceDetailPanel`, `Badge`, `Sparkline`. |
| `App.jsx` | Root. Simulates the WebSocket feed by pushing a new event every 7s. Derives live status per device from newest event. |

## Interactions

- **Row click** → slide-in device detail panel (480px) with 4 tabs (Overview, Consumables, Activity, Specs). Esc or overlay closes.
- **Simulated WS events** push every ~7s; the alert feed updates and the device badge flips when a critical event lands on a device.
- **Policy toggles** flip on/off with local state — the production version calls `api.patchPolicy()`.
- **Reallocation cards** render with Approve/Dismiss affordances (cosmetic in the kit).

## Note on fidelity

This is a cosmetic recreation — no real SNMP poller, no real WebSocket, no real REST API. The DOM structure, class names, and visuals mirror the spec so components can be copied into the real Next.js app with minimal edits (just rename `.jsx` → `.tsx`, add types, swap the fake event source for `usePrinterEvents`).
