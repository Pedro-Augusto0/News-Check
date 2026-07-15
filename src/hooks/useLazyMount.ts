import { useEffect, useRef, useState } from 'react'

export function useLazyMount(rootMargin = '240px') {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || mounted) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [mounted, rootMargin])

  return { ref, mounted }
}
