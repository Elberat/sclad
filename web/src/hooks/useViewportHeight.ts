import { useEffect, useState } from 'react'

function readViewportHeight() {
  if (typeof window === 'undefined') return 0
  const visualViewport = window.visualViewport
  if (!visualViewport) return Math.round(window.innerHeight)
  return Math.round(visualViewport.height + visualViewport.offsetTop)
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
