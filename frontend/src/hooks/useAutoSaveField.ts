import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAutoSaveFieldOptions {
  debounceMs?: number
}

interface UseAutoSaveFieldResult<T> {
  displayed: T
  setLocal: (value: T) => void
  error: boolean
}

export function useAutoSaveField<T>(
  initial: T,
  save: (value: T) => Promise<unknown>,
  options: UseAutoSaveFieldOptions = {},
): UseAutoSaveFieldResult<T> {
  const { debounceMs = 0 } = options

  const [displayed, setDisplayed] = useState<T>(initial)
  const [error, setError] = useState(false)
  const persistedRef = useRef<T>(initial)
  const timerRef = useRef<number | null>(null)
  const pendingValueRef = useRef<T>(initial)

  useEffect(() => {
    if (!error && timerRef.current === null) {
      persistedRef.current = initial
      setDisplayed(initial)
    }
  }, [initial, error])

  const flush = useCallback(
    async (value: T) => {
      const previous = persistedRef.current
      try {
        await save(value)
        persistedRef.current = value
        setError(false)
      } catch {
        persistedRef.current = previous
        setDisplayed(previous)
        setError(true)
      }
    },
    [save],
  )

  const setLocal = useCallback(
    (value: T) => {
      setDisplayed(value)
      setError(false)
      pendingValueRef.current = value

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      if (debounceMs > 0) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null
          void flush(pendingValueRef.current)
        }, debounceMs)
      } else {
        void flush(value)
      }
    },
    [debounceMs, flush],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { displayed, setLocal, error }
}
