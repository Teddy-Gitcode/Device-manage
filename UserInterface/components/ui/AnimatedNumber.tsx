'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'

interface Props {
  value: number
  /**
   * Plain string appended after the number — safe to pass from Server Components.
   * e.g. suffix="%" or suffix="ms"
   */
  suffix?: string
  /**
   * Callback formatter — only works when AnimatedNumber is rendered inside a
   * Client Component tree (cannot be serialised across the Server/Client boundary).
   */
  format?: (n: number) => string
  className?: string
}

export function AnimatedNumber({ value, suffix = '', format, className }: Props) {
  const ref  = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  const display = (n: number) =>
    format ? format(n) : `${n.toLocaleString()}${suffix}`

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value

    const ctrl = animate(from, value, {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) { node.textContent = display(Math.round(v)) },
    })
    return () => ctrl.stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, suffix])

  return (
    <span ref={ref} className={className}>
      {display(value)}
    </span>
  )
}
