import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../app/App.jsx'

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>)
}
const forecast = {
  timezone: 'Asia/Kolkata', current: { time: '2026-11-24T10:15', temperature_2m: 25, relative_humidity_2m: 58, apparent_temperature: 26, is_day: 1, precipitation: 0, weather_code: 2, cloud_cover: 30, wind_speed_10m: 8, wind_direction_10m: 90, wind_gusts_10m: 12 },
  hourly: { time: Array.from({ length: 48 }, (_, i) => { const date = new Date(Date.UTC(2026, 10, 24, i)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:00` }), temperature_2m: Array(48).fill(25), apparent_temperature: Array(48).fill(26), precipitation_probability: Array(48).fill(5), precipitation: Array(48).fill(0), weather_code: Array(48).fill(2), wind_speed_10m: Array(48).fill(8), is_day: Array(48).fill(1) },
  daily: { time: Array.from({ length: 7 }, (_, i) => `2026-11-${String(24 + i).padStart(2, '0')}`), weather_code: Array(7).fill(2), temperature_2m_max: Array(7).fill(29), temperature_2m_min: Array(7).fill(20), sunrise: Array(7).fill('2026-11-24T06:10'), sunset: Array(7).fill('2026-11-24T17:25'), uv_index_max: Array(7).fill(5), precipitation_sum: Array(7).fill(0), precipitation_probability_max: Array(7).fill(10), wind_speed_10m_max: Array(7).fill(12), wind_gusts_10m_max: Array(7).fill(17) },
}

describe('Weatherly first-use and search flow', () => {
  it('does not request geolocation automatically and always offers city search', () => {
    const geo = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: geo } })
    mount()
    expect(screen.getAllByLabelText('Search for a city').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /use my location/i })).toHaveLength(2)
    expect(geo).not.toHaveBeenCalled()
  })
  it('loads live weather after a city is selected and unit changes do not refetch', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = new URL(input)
      if (url.hostname.includes('geocoding-api')) return { ok: true, json: async () => ({ results: [{ id: 123, name: 'Noida', country: 'India', admin1: 'Uttar Pradesh', latitude: 28.58, longitude: 77.33, timezone: 'Asia/Kolkata' }] }) }
      return { ok: true, json: async () => forecast }
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    mount()
    const inputs = screen.getAllByLabelText('Search for a city')
    await user.type(inputs[0], 'Noida')
    const result = await screen.findByRole('option', { name: /Noida Uttar Pradesh, India/i })
    await user.click(result)
    expect(await screen.findByText('Weather outlook')).toBeInTheDocument()
    expect(screen.getByText('25°C')).toBeInTheDocument()
    const weatherCalls = fetchMock.mock.calls.filter(([input]) => new URL(input).hostname.includes('api.open-meteo.com')).length
    await user.click(screen.getByRole('button', { name: '°F' }))
    expect(screen.getByText('77°F')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => new URL(input).hostname.includes('api.open-meteo.com'))).toHaveLength(weatherCalls)
  })
  it('shows a clear empty state when city search has no matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ results: [] }) })))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getAllByLabelText('Search for a city')[0], 'Narnia')
    expect(await screen.findByText(/No matching places/)).toBeInTheDocument()
  })
  it('saves and removes a selected city', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => new URL(input).hostname.includes('geocoding-api')
      ? { ok: true, json: async () => ({ results: [{ id: 1, name: 'Noida', country: 'India', latitude: 28.58, longitude: 77.33 }] }) }
      : { ok: true, json: async () => forecast }))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getAllByLabelText('Search for a city')[0], 'Noida')
    await user.click(await screen.findByRole('option', { name: /Noida India/i }))
    await screen.findByText('Weather outlook')
    await user.click(screen.getByRole('button', { name: 'Save location' }))
    expect(screen.getByRole('button', { name: 'Remove Noida from saved places' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Noida from saved places' }))
    expect(screen.queryByRole('button', { name: 'Remove Noida from saved places' })).not.toBeInTheDocument()
  })
})
