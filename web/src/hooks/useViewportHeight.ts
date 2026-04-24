import { useEffect, useState } from 'react'

function readViewportHeight() {
  if (typeof window === 'undefined') return 0
  const visualViewport = window.visualViewport
  if (!visualViewport) return Math.round(window.innerHeight)
  return Math.round(visualViewport.height + visualViewport.offsetTop)
}

function readViewportBottomInset() {
  if (typeof window === 'undefined') return 0
  return Math.max(0, Math.round(window.innerHeight - readViewportHeight()))
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

export function useViewportBottomInset(enabled = true) {
  const [viewportBottomInset, setViewportBottomInset] = useState(() => readViewportBottomInset())

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const updateViewportBottomInset = () => setViewportBottomInset(readViewportBottomInset())

    updateViewportBottomInset()
    window.addEventListener('resize', updateViewportBottomInset)
    window.visualViewport?.addEventListener('resize', updateViewportBottomInset)
    window.visualViewport?.addEventListener('scroll', updateViewportBottomInset)

    return () => {
      window.removeEventListener('resize', updateViewportBottomInset)
      window.visualViewport?.removeEventListener('resize', updateViewportBottomInset)
      window.visualViewport?.removeEventListener('scroll', updateViewportBottomInset)
    }
  }, [enabled])

  return viewportBottomInset
}
