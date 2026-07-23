type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Recursively merge `override` onto `base`. Arrays and functions replace
 * wholesale; `undefined` values in the override are ignored.
 */
export function deepMerge<T>(base: T, override?: unknown): T {
  if (override === undefined || override === null) return base
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T

  const result: PlainObject = { ...base }
  for (const key of Object.keys(override)) {
    const next = override[key]
    if (next === undefined) continue
    const prev = result[key]
    result[key] =
      isPlainObject(prev) && isPlainObject(next) ? deepMerge(prev, next) : next
  }
  return result as T
}
