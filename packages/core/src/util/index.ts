export const throttle = <T extends (...args: any[]) => void>(fn: T, ms: number): T => {
  let last = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    }
  }) as unknown as T
}

export const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number): T => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}
