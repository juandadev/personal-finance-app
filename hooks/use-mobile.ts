import * as React from "react"

const MOBILE_BREAKPOINT = 768
const FINE_HOVER_QUERY = "(hover: hover) and (pointer: fine)"

const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT
const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const subscribeFineHover = (callback: () => void) => {
  const mql = window.matchMedia(FINE_HOVER_QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

const getFineHoverSnapshot = () => window.matchMedia(FINE_HOVER_QUERY).matches
const getFineHoverServerSnapshot = () => true

export function useCanHover() {
  return React.useSyncExternalStore(
    subscribeFineHover,
    getFineHoverSnapshot,
    getFineHoverServerSnapshot,
  )
}
