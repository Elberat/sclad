import { useEffect, useState } from 'react'

function readViewportHeight() {
  if (typeof window === 'undefined') return 0
  return Math.round(window.visualViewport?.height ?? window.innerHeight)
}

export function useViewportHeight(enabled = true) {
  const [viewportHeight, setViewportHeight] = useState(() => readViewportHeight())

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const updateViewportHeight = () => setViewportHeight(readViewportHeight())

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    window.visualViewport?.addEventListener('resize', updateViewportHeight)
    window.visualViewport?.addEventListener('scroll', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.visualViewport?.removeEventListener('resize', updateViewportHeight)
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight)
    }
  }, [enabled])

  return viewportHeight
}
