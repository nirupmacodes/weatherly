import { describe, expect, it } from 'vitest'
import { mapForecast } from '../services/openMeteoClient.js'
import { deriveInsights, RAIN_THRESHOLD, STRONG_WIND_KMH } from '../features/insights.js'
import { celsiusToFahrenheit, formatTemperature, localDay, localTime, nextHourIndex, weatherDescription, windDirection } from '../utils/weather.js'
import { addFavorite, readStored, removeFavorite, writeStored } from '../utils/storage.js'

const hours = (probabilities, extras = {}) => probabilities.map((probability, i) => ({ time: `2026-11-24T${String(10 + i).padStart(2, '0')}:00`, precipitationProbability: probability, temperature: [12, 13, 16, 18, 19, 17, 15, 14][i] ?? 14, wind: 10, code: 1, ...extras[i] }))

describe('weather helpers', () => {
  it('maps WMO groups and provides a neutral fallback', () => {
    expect(weatherDescription(0).label).toBe('Clear sky')
    expect(weatherDescription(61).label).toBe('Light rain')
    expect(weatherDescription(95).icon).toBe('storm')
    expect(weatherDescription(null).label).toBe('Conditions unavailable')
  })
  it('converts and formats temperatures without changing null data', () => {
    expect(celsiusToFahrenheit(0)).toBe(32)
    expect(formatTemperature(20, 'F')).toBe('68°F')
    expect(formatTemperature(null, 'C')).toBeNull()
  })
  it('formats destination-local times and dates without browser timezone parsing', () => {
    expect(localTime('2026-11-24T17:05')).toBe('5:05 PM')
    expect(localTime('2026-11-24T07:05', { hour: '2-digit' })).toBe('07:05')
    expect(localDay('2026-11-24')).toBe('Tue')
  })
  it('finds the next hourly item from API local time', () => {
    expect(nextHourIndex([{ time: '2026-11-24T10:00' }, { time: '2026-11-24T11:00' }], '2026-11-24T10:15')).toBe(1)
  })
  it('formats wind direction', () => { expect(windDirection(90)).toBe('E') })
  it('maps response arrays defensively when optional values are missing', () => {
    const model = mapForecast({ timezone: 'Asia/Kolkata', current: { time: '2026-11-24T10:15', temperature_2m: 28 }, hourly: { time: ['2026-11-24T11:00'] }, daily: { time: ['2026-11-24'] } })
    expect(model.current.temperature).toBe(28)
    expect(model.current.humidity).toBeNull()
    expect(model.hours[0].precipitationProbability).toBeNull()
    expect(model.days[0].high).toBeNull()
  })
})

describe('weather insights', () => {
  it('surfaces rain and an umbrella when an upcoming probability crosses threshold', () => {
    const result = deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: hours([25, 51, 80, 30, 10, 10]) })
    expect(result.map((item) => item.id)).toContain('rain')
    expect(result.map((item) => item.id)).toContain('umbrella')
    expect(result[0].message).toContain('11:00 AM')
    expect(RAIN_THRESHOLD).toBe(50)
  })
  it('does not claim a dry outlook when probabilities are missing', () => {
    const result = deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: hours([null, null, null, null]) })
    expect(result.some((item) => item.id === 'rain-low' || item.id === 'outdoor')).toBe(false)
  })
  it('can suggest a dry window only with two low-rain hours and enough weather fields', () => {
    const result = deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: hours([10, 12, 13, 15]) })
    expect(result.some((item) => item.id === 'outdoor')).toBe(true)
    const incomplete = deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: hours([10, 12]).map((hour) => ({ ...hour, wind: null, temperature: null })) })
    expect(incomplete.some((item) => item.id === 'outdoor')).toBe(false)
  })
  it('reports strong wind at its named boundary', () => {
    const forecast = hours([null, null, null, null]).map((hour, i) => ({ ...hour, temperature: 20, wind: i === 2 ? STRONG_WIND_KMH : 10 }))
    expect(deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: forecast }).some((item) => item.id === 'wind')).toBe(true)
  })
  it('omits a temperature insight when the outlook barely changes', () => {
    const forecast = hours([10, 10, 10, 10, 10]).map((hour) => ({ ...hour, temperature: 20 }))
    expect(deriveInsights({ current: { time: '2026-11-24T09:00' }, hours: forecast }).some((item) => item.id === 'temperature')).toBe(false)
  })
})

describe('favorites and persistent storage', () => {
  it('deduplicates, limits, and removes a saved place', () => {
    const paris = { id: 1, name: 'Paris', latitude: 48.8, longitude: 2.3 }
    expect(addFavorite([paris], { ...paris })).toHaveLength(1)
    expect(addFavorite(Array(8).fill({ ...paris, id: null, latitude: 0 }), { id: 2, name: 'Rome', latitude: 41.9, longitude: 12.5 })).toHaveLength(8)
    expect(removeFavorite([paris], paris)).toEqual([])
  })
  it('recovers from malformed stored data', () => {
    localStorage.setItem('bad', '{nope')
    expect(readStored('bad', [], Array.isArray)).toEqual([])
    expect(writeStored('ok', ['hello'])).toBe(true)
    expect(readStored('ok', [], Array.isArray)).toEqual(['hello'])
  })
})
