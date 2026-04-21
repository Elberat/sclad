import { useEffect, useRef } from 'react'
import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useMediaQuery } from '@/hooks/useMediaQuery'

export function usePullToRefresh(queryKey?: QueryKey) {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const startYRef = useRef<number | null>(null)
  const startXRef = useRef<number | null>(null)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    if (!isMobile) return

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0) return
      const target = event.target
      if (target instanceof Element && target.closest('[data-no-pull-refresh="true"]')) return

      startYRef.current = event.touches[0]?.clientY ?? null
      startXRef.current = event.touches[0]?.clientX ?? null
    }

    const onScroll = () => {
      if (window.scrollY > 0) {
        startYRef.current = null
        startXRef.current = null
      }
    }

    const onTouchMove = async (event: TouchEvent) => {
      if (startYRef.current === null || startXRef.current === null || window.scrollY > 0 || isRefreshingRef.current) return

      const currentY = event.touches[0]?.clientY ?? startYRef.current
      const currentX = event.touches[0]?.clientX ?? startXRef.current
      const deltaY = currentY - startYRef.current
      const deltaX = Math.abs(currentX - startXRef.current)

      if (deltaY < 72 || deltaY < deltaX * 1.5) return

      isRefreshingRef.current = true
      startYRef.current = null
      startXRef.current = null

      try {
        await queryClient.refetchQueries(queryKey ? { queryKey } : undefined)
        toast.success('Данные обновлены')
      } finally {
        window.setTimeout(() => {
          isRefreshingRef.current = false
        }, 700)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isMobile, queryClient, queryKey])
}
