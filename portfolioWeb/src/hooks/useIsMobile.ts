import { useEffect, useState } from 'react'

const QUERY = '(max-width: 820px)'

/** Phone/small-tablet breakpoint — narrow enough that the fixed desk framing can't show the whole desk at once. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const update = () => setIsMobile(mql.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isMobile
}
