const VERSION = 1

export function readStored(key, fallback, validate = () => true) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (parsed?.version !== VERSION || !validate(parsed.value)) return fallback
    return parsed.value
  } catch {
    return fallback
  }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: VERSION, value }))
    return true
  } catch {
    return false
  }
}

export const STORAGE_KEYS = { favorites: 'weatherly:favorites', unit: 'weatherly:unit', last: 'weatherly:last-location' }

export function isLocation(value) {
  return Boolean(value && typeof value.name === 'string' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude))
}

export function addFavorite(items, location, max = 8) {
  const same = (item) => location.id != null && item.id != null
    ? String(item.id) === String(location.id)
    : Math.abs(item.latitude - location.latitude) < 0.02 && Math.abs(item.longitude - location.longitude) < 0.02
  if (items.some(same) || items.length >= max) return items
  return [...items, location]
}

export function removeFavorite(items, location) {
  return items.filter((item) => !(location.id != null && item.id != null
    ? String(item.id) === String(location.id)
    : Math.abs(item.latitude - location.latitude) < 0.02 && Math.abs(item.longitude - location.longitude) < 0.02))
}
