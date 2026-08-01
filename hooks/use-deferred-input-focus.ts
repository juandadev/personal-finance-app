"use client"

import { useEffect, type RefObject } from "react"

export function useDeferredInputFocus(
  inputRef: RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    let timeoutId: number | undefined
    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
        inputRef.current?.select()
      }, 0)
    })

    return () => {
      window.cancelAnimationFrame(frameId)

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [inputRef])
}
