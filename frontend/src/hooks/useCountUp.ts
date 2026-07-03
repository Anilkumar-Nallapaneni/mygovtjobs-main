import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type UseCountUpOptions = {
  duration?: number
  enabled?: boolean
}

/** Animate a number from its previous value to `target`. Respects reduced motion. */
export function useCountUp(target: number, options: UseCountUpOptions = {}): number {
  const { duration = 720, enabled = true } = options
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const frameRef = useRef<number>()

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (!enabled || reduced || !Number.isFinite(target)) {
      setDisplay(target)
      return
    }

    const from = displayRef.current
    if (from === target) return

    let start: number | undefined
    const step = (ts: number) => {
      if (start === undefined) start = ts
      const t = Math.min(1, (ts - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (target - from) * eased))
      if (t < 1) frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
  }, [target, enabled, reduced, duration])

  return display
}
