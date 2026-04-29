// Tiny toast helper — appends a div to document.body for ~3.5s.
// Used by client-only action handlers; no provider/context needed.
export function notify(msg: string, ok: boolean = true) {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.className = 'action-toast' + (ok ? '' : ' error')
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.2s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 220)
  }, 3300)
}
