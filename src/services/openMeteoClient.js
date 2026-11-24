const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

async function request(url, signal) {
  let response
  try { response = await fetch(url, { signal }) } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach the weather service. Check your connection and try again.')
  }
  let body
  try { body = await response.json() } catch { throw new Error('The weather service returned an unreadable response.') }
  if (!response.ok || body?.error) {
    const error = new Error(body?.reason || 'The weather service could not complete this request.')
    error.status = response.status
    throw error
  }
  return body
}

export async function searchPlaces(term, signal) {
  const url = new URL(GEOCODING_URL)
  url.search = new URLSearchParams({ name: term, count: '8', language: 'en', format: 'json' })
  const body = await request(url, signal)
  return (Array.isArray(body.results) ? body.results : []).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)).map((place) => ({
    id: place.id ?? null, name: place.name, country: place.country ?? '', countryCode: place.country_code ?? '',
    admin1: place.admin1 ?? '', admin2: place.admin2 ?? '', latitude: place.latitude, longitude: place.longitude,
    timezone: place.timezone ?? 'auto', type: 'city',
  }))
}

export async function getForecast(location, signal) {
  const params = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), timezone: 'auto', forecast_days: '7',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm', timeformat: 'iso8601',
    current: ['temperature_2m','relative_humidity_2m','apparent_temperature','is_day','precipitation','weather_code','cloud_cover','wind_speed_10m','wind_direction_10m','wind_gusts_10m'].join(','),
    hourly: ['temperature_2m','apparent_temperature','precipitation_probability','precipitation','weather_code','wind_speed_10m','is_day'].join(','),
    daily: ['weather_code','temperature_2m_max','temperature_2m_min','sunrise','sunset','uv_index_max','precipitation_sum','precipitation_probability_max','wind_speed_10m_max','wind_gusts_10m_max'].join(','),
  })
  const url = new URL(FORECAST_URL); url.search = params
  const body = await request(url, signal)
  if (!body.current?.time || !Array.isArray(body.hourly?.time) || !Array.isArray(body.daily?.time)) throw new Error('Weather data was incomplete. Please try again.')
  return mapForecast(body)
}

export function mapForecast(body) {
  const current = body.current ?? {}
  const hourly = body.hourly ?? {}
  const daily = body.daily ?? {}
  const hours = (hourly.time ?? []).map((time, i) => ({
    time, temperature: hourly.temperature_2m?.[i] ?? null, feelsLike: hourly.apparent_temperature?.[i] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[i] ?? null, precipitation: hourly.precipitation?.[i] ?? null,
    code: hourly.weather_code?.[i] ?? null, wind: hourly.wind_speed_10m?.[i] ?? null, isDay: hourly.is_day?.[i] !== 0,
  }))
  const days = (daily.time ?? []).map((date, i) => ({
    date, code: daily.weather_code?.[i] ?? null, high: daily.temperature_2m_max?.[i] ?? null, low: daily.temperature_2m_min?.[i] ?? null,
    sunrise: daily.sunrise?.[i] ?? null, sunset: daily.sunset?.[i] ?? null, uv: daily.uv_index_max?.[i] ?? null,
    precipitation: daily.precipitation_sum?.[i] ?? null, precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
    wind: daily.wind_speed_10m_max?.[i] ?? null, gusts: daily.wind_gusts_10m_max?.[i] ?? null,
  }))
  return {
    timezone: body.timezone ?? 'auto', current: {
      time: current.time, temperature: current.temperature_2m ?? null, humidity: current.relative_humidity_2m ?? null,
      feelsLike: current.apparent_temperature ?? null, isDay: current.is_day !== 0, precipitation: current.precipitation ?? null,
      code: current.weather_code ?? null, cloud: current.cloud_cover ?? null, wind: current.wind_speed_10m ?? null,
      windDirection: current.wind_direction_10m ?? null, gusts: current.wind_gusts_10m ?? null,
    }, hours, days,
  }
}
