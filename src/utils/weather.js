export const WMO = {
  0: ['Clear sky', 'sun'], 1: ['Mainly clear', 'sun-cloud'], 2: ['Partly cloudy', 'sun-cloud'], 3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'], 51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'], 57: ['Freezing drizzle', 'rain'], 61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'], 67: ['Heavy freezing rain', 'rain'], 71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
  80: ['Rain showers', 'rain'], 81: ['Rain showers', 'rain'], 82: ['Heavy rain showers', 'rain'], 85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm with hail', 'storm'], 99: ['Thunderstorm with heavy hail', 'storm'],
}

export function weatherDescription(code, isDay = true) {
  if (code == null || !WMO[code]) return { label: 'Conditions unavailable', icon: 'cloud' }
  const [label, icon] = WMO[code]
  return { label: code === 0 && !isDay ? 'Clear night' : label, icon: code === 0 && !isDay ? 'moon' : icon }
}

export function celsiusToFahrenheit(value) { return value == null ? null : (value * 9) / 5 + 32 }
export function formatTemperature(value, unit = 'C') {
  if (!Number.isFinite(value)) return null
  const output = unit === 'F' ? celsiusToFahrenheit(value) : value
  return `${Math.round(output)}°${unit}`
}
export function formatWind(value) { return Number.isFinite(value) ? `${Math.round(value)} km/h` : null }
export function formatProbability(value) { return Number.isFinite(value) ? `${Math.round(value)}%` : null }

export function localTime(value, options = { hour: 'numeric', minute: '2-digit' }) {
  if (typeof value !== 'string') return ''
  const match = value.match(/(?:T| )(\d{2}):(\d{2})/)
  if (!match) return value
  const hour = Number(match[1]); const minute = Number(match[2])
  if (options.hour === 'numeric') return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function localDay(value, today = false) {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  if (today) return 'Today'
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], 12)))
}

export function nextHourIndex(hours, currentTime) {
  if (!Array.isArray(hours) || !currentTime) return 0
  const index = hours.findIndex((hour) => hour.time >= currentTime)
  return index < 0 ? Math.max(0, hours.length - 1) : index
}

export function windDirection(degrees) {
  if (!Number.isFinite(degrees)) return null
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8]
}
