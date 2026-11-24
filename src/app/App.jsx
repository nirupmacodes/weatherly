import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowDown, ArrowUp, Bookmark, Check, Cloud, CloudFog, CloudMoon, CloudRain, CloudSnow, CloudSun, Compass, Droplets, MapPin, Moon, Navigation, Search, Sun, Sunrise, Sunset, Umbrella, Wind, X } from 'lucide-react'
import { getForecast, searchPlaces } from '../services/openMeteoClient.js'
import { deriveInsights } from '../features/insights.js'
import { addFavorite, isLocation, readStored, removeFavorite, STORAGE_KEYS, writeStored } from '../utils/storage.js'
import { formatProbability, formatTemperature, formatWind, localDay, localTime, nextHourIndex, weatherDescription, windDirection } from '../utils/weather.js'

const HourlyTemperatureChart = lazy(() => import('../components/HourlyTemperatureChart.jsx'))

const iconMap = { sun: Sun, 'sun-cloud': CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudRain, storm: CloudRain, moon: Moon }
function WeatherGlyph({ kind = 'cloud', size = 26, className = '' }) {
  const Icon = kind === 'moon' ? CloudMoon : kind === 'snow' ? CloudSnow : (iconMap[kind] ?? Cloud)
  return <Icon size={size} strokeWidth={1.65} className={className} aria-hidden="true" />
}
function placeLabel(place) {
  return [place.admin1, place.country].filter((part, i, all) => part && part !== place.name && all.indexOf(part) === i).join(', ')
}
function useDebounced(value, delay = 320) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value.trim()), delay); return () => window.clearTimeout(timer) }, [value, delay])
  return debounced
}

function SearchBox({ onSelect }) {
  const inputId = useId()
  const [term, setTerm] = useState('')
  const normalized = useDebounced(term)
  const search = useQuery({ queryKey: ['places', normalized.toLowerCase()], queryFn: ({ signal }) => searchPlaces(normalized, signal), enabled: normalized.length >= 2, staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 })
  const visible = term.trim().length >= 2
  return <div className="search-wrap">
    <label className="sr-only" htmlFor={inputId}>Search for a city</label>
    <Search size={18} className="search-icon" aria-hidden="true" />
    <input id={inputId} value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search city or place" autoComplete="off" aria-autocomplete="list" aria-controls={`${inputId}-results`} aria-expanded={visible} />
    {term && <button className="clear-search icon-button" aria-label="Clear search" onClick={() => setTerm('')}><X size={16} /></button>}
    {visible && <div className="search-results" id={`${inputId}-results`} role="listbox" aria-label="City search results" aria-live="polite">
      {normalized.length < 2 ? <p className="search-note">Type at least two characters</p> : search.isFetching ? <p className="search-note">Finding places…</p> : search.isError ? <p className="search-note">{search.error.message}</p> : search.data?.length ? search.data.map((place) => <button role="option" aria-selected="false" key={`${place.id}-${place.latitude}`} onClick={() => { onSelect(place); setTerm('') }} className="result-row"><span className="result-pin"><MapPin size={17} /></span><span><strong>{place.name}</strong>{' '}<small>{placeLabel(place) || 'Location'}</small></span><span className="result-arrow">↗</span></button>) : normalized && <p className="search-note">No matching places. Try a nearby city or a different spelling.</p>}
    </div>}
  </div>
}

function Metric({ icon: Icon, label, value, hint }) {
  if (value == null || value === '') return null
  return <div className="metric-card"><span className="metric-icon"><Icon size={17} /></span><span className="metric-label">{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

function App() {
  const [location, setLocation] = useState(() => {
    const saved = readStored(STORAGE_KEYS.last, null, isLocation)
    return saved && isLocation(saved) ? saved : null
  })
  const [favorites, setFavorites] = useState(() => readStored(STORAGE_KEYS.favorites, [], Array.isArray).filter(isLocation))
  const [unit, setUnit] = useState(() => readStored(STORAGE_KEYS.unit, 'C', (value) => value === 'C' || value === 'F'))
  const [geoState, setGeoState] = useState('idle')
  const [geoError, setGeoError] = useState('')
  const [favoriteMessage, setFavoriteMessage] = useState('')
  const forecast = useQuery({ queryKey: ['weather', location?.latitude, location?.longitude], queryFn: ({ signal }) => getForecast(location, signal), enabled: Boolean(location), staleTime: 12 * 60 * 1000, gcTime: 45 * 60 * 1000 })

  useEffect(() => { if (location) writeStored(STORAGE_KEYS.last, location) }, [location])
  useEffect(() => { writeStored(STORAGE_KEYS.favorites, favorites) }, [favorites])
  useEffect(() => { writeStored(STORAGE_KEYS.unit, unit) }, [unit])

  const selectLocation = (place) => { setLocation(place); setGeoError(''); setGeoState('idle') }
  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoError('Location isn’t available in this browser. Search for a city instead.'); return }
    setGeoState('loading'); setGeoError('')
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      selectLocation({ id: null, name: 'My location', country: '', admin1: '', latitude: coords.latitude, longitude: coords.longitude, timezone: 'auto', type: 'current' })
    }, (error) => {
      setGeoState('idle')
      const messages = { 1: 'Location permission was denied. You can still search for a city.', 2: 'Your location couldn’t be determined. Try searching for a city.', 3: 'Finding your location took too long. Try again or search for a city.' }
      setGeoError(messages[error.code] || 'Location access failed. Search for a city instead.')
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }
  const saved = useMemo(() => location && favorites.some((item) => item.id != null && location.id != null ? String(item.id) === String(location.id) : Math.abs(item.latitude - location.latitude) < 0.02 && Math.abs(item.longitude - location.longitude) < 0.02), [location, favorites])
  const toggleFavorite = () => {
    if (!location) return
    if (saved) { setFavorites((items) => removeFavorite(items, location)); setFavoriteMessage('Removed from saved places.') }
    else if (favorites.length >= 8) setFavoriteMessage('You can save up to eight places.')
    else { setFavorites((items) => addFavorite(items, location)); setFavoriteMessage('Place saved.') }
    window.setTimeout(() => setFavoriteMessage(''), 2600)
  }

  const weather = forecast.data
  const current = weather?.current
  const condition = current ? weatherDescription(current.code, current.isDay) : null
  const insights = useMemo(() => weather ? deriveInsights(weather) : [], [weather])
  const today = weather?.days?.[0]
  const chartHours = weather ? weather.hours.slice(nextHourIndex(weather.hours, current?.time), nextHourIndex(weather.hours, current?.time) + 24) : []
  const hourly = chartHours.map((hour) => ({ ...hour, label: localTime(hour.time), shownTemp: hour.temperature == null ? null : Math.round(unit === 'F' ? hour.temperature * 9 / 5 + 32 : hour.temperature) }))

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Weatherly home"><span className="brand-mark"><CloudSun size={22} /></span><span>weatherly<span className="brand-dot">.</span></span></a>
      <div className="header-tools"><SearchBox onSelect={selectLocation} /><button className="location-action" onClick={useMyLocation} disabled={geoState === 'loading'}><Navigation size={16} />{geoState === 'loading' ? 'Locating…' : 'Use my location'}</button></div>
      <div className="unit-control" aria-label="Temperature units"><button aria-pressed={unit === 'C'} onClick={() => setUnit('C')}>°C</button><span>/</span><button aria-pressed={unit === 'F'} onClick={() => setUnit('F')}>°F</button></div>
    </header>

    <main id="top" className="main-content">
      {geoError && <div role="alert" className="inline-alert"><MapPin size={17} />{geoError}<button className="icon-button" aria-label="Dismiss message" onClick={() => setGeoError('')}><X size={16} /></button></div>}
      {favoriteMessage && <div aria-live="polite" className="toast"><Check size={16} />{favoriteMessage}</div>}

      {!location ? <section className="welcome-panel"><div className="welcome-art"><span className="sun-orb" /><CloudSun size={108} strokeWidth={1.1} /></div><div className="welcome-copy"><span className="eyebrow">A little clarity for your day</span><h1>Weather that helps<br />you <em>plan ahead.</em></h1><p>See what’s happening now and find a forecast that makes everyday decisions easier.</p><div className="welcome-search"><SearchBox onSelect={selectLocation} /><button className="primary-button" onClick={useMyLocation}><Navigation size={17} />Use my location</button></div>{geoState === 'loading' && <span className="helper-text">Finding your location…</span>}<span className="helper-text">Your location is only used when you choose to share it.</span></div></section>
        : <>
          <div className="dashboard-heading"><div><div className="eyebrow">{weather?.current?.time ? localDay(weather.current.time, true) + ' · ' + localTime(weather.current.time) : 'Your weather'}</div><h1>{location.name}</h1><div className="location-subtitle">{placeLabel(location) || (location.type === 'current' ? 'Approximate current position' : 'Local forecast')} {weather?.timezone && <span>· {weather.timezone.replaceAll('_', ' ')}</span>}</div></div><div className="location-actions"><button className={`soft-button ${saved ? 'is-saved' : ''}`} onClick={toggleFavorite} aria-label={saved ? 'Remove saved location' : 'Save location'}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save place'}</button><button className="refresh-button" aria-label="Refresh forecast" onClick={() => forecast.refetch()} disabled={forecast.isFetching}><Activity size={16} className={forecast.isFetching ? 'spin' : ''} />Refresh</button></div></div>

          {favorites.length > 0 && <section className="favorites-row" aria-label="Saved places"><span className="section-kicker">SAVED PLACES</span>{favorites.map((item) => <span key={`${item.id ?? item.latitude}-${item.longitude}`} className="favorite-wrap"><button className={`favorite-chip ${item.latitude === location.latitude && item.longitude === location.longitude ? 'active' : ''}`} onClick={() => selectLocation(item)}><MapPin size={14} />{item.name}</button><button className="remove-favorite" aria-label={`Remove ${item.name} from saved places`} onClick={() => setFavorites((items) => removeFavorite(items, item))}>×</button></span>)}</section>}

          {forecast.isPending ? <div className="loading-grid" aria-label="Loading weather"><div className="skeleton hero-skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
            : forecast.isError && !weather ? <section className="error-card" role="alert"><div className="error-icon"><Cloud size={28} /></div><h2>We couldn’t load this forecast</h2><p>{forecast.error.message}</p><button className="primary-button" onClick={() => forecast.refetch()}>Try again</button><span>Or search for another city above.</span></section>
            : weather && <>
              {forecast.isError && <div className="stale-banner" role="status">Showing the last forecast we could load. <button onClick={() => forecast.refetch()}>Try refreshing</button></div>}
              <section className="top-grid">
                <article className="current-card"><div className="current-card-top"><span className="current-label">CURRENT CONDITIONS</span><span className="live-dot">Updated locally</span></div><div className="current-main"><div><div className="temperature">{formatTemperature(current?.temperature, unit) ?? '—'}</div><div className="current-condition">{condition?.label ?? 'Weather unavailable'}</div><div className="feels-like">Feels like {formatTemperature(current?.feelsLike, unit) ?? '—'}</div></div><div className="current-weather-icon"><WeatherGlyph kind={condition?.icon} size={90} /></div></div><div className="current-summary">{current?.code === 0 ? 'Clear skies give the day a bright start.' : current?.code != null && [61,63,65,80,81,82,95,96,99].includes(current.code) ? 'Keep an eye on the forecast as conditions may change.' : 'A quick look at the conditions, with the next hours in view.'}</div><div className="current-footer"><span><Droplets size={15} />{current?.humidity != null ? `${current.humidity}% humidity` : 'Humidity unavailable'}</span><span><Wind size={15} />{formatWind(current?.wind) ?? 'Wind unavailable'}{current?.windDirection != null ? ` ${windDirection(current.windDirection)}` : ''}</span></div></article>

                <article className="outlook-card"><div className="card-heading"><div><span className="section-kicker">PLAN YOUR DAY</span><h2>Weather outlook</h2></div><span className="outlook-mark"><Compass size={20} /></span></div>{insights.length ? <div className="insight-list">{insights.map((insight) => { const Icon = insight.icon === 'umbrella' ? Umbrella : insight.icon === 'wind' ? Wind : insight.icon === 'rain' ? CloudRain : Sun; return <div className={`insight insight-${insight.severity}`} key={insight.id}><span className="insight-icon"><Icon size={18} /></span><div><strong>{insight.title}</strong><p>{insight.message}</p></div></div> })}</div> : <div className="empty-insights"><span className="empty-sun"><Sun size={27} /></span><div><strong>Nothing unusual in the forecast</strong><p>We’ll surface a useful note when the forecast supports one.</p></div></div>}<p className="forecast-note">Forecasts can change as conditions develop.</p></article>
              </section>

              <section className="content-grid">
                <article className="panel hourly-panel"><div className="panel-heading"><div><span className="section-kicker">UP NEXT</span><h2>Next 24 hours</h2></div><span className="subtle-tag">Temperature trend</span></div><div className="chart-wrap" role="img" aria-label="Temperature trend for the next 24 hours. Hourly values are listed below."><Suspense fallback={<div className="chart-placeholder" />}><HourlyTemperatureChart hours={hourly} unit={unit} /></Suspense></div><div className="hourly-scroll" aria-label="Hourly forecast list">{hourly.map((hour) => { const desc = weatherDescription(hour.code, hour.isDay); return <div className="hour-item" key={hour.time}><span>{hour.label}</span><WeatherGlyph kind={desc.icon} size={19} /><strong>{hour.shownTemp == null ? '—' : `${hour.shownTemp}°`}</strong><small>{formatProbability(hour.precipitationProbability) ?? '—'}</small></div> })}</div><div className="hourly-legend"><span>Time</span><span>Temperature</span><span>Precipitation chance</span></div></article>

                <article className="panel daily-panel"><div className="panel-heading"><div><span className="section-kicker">AHEAD</span><h2>7-day forecast</h2></div><span className="subtle-tag">Local time</span></div><div className="daily-list">{weather.days.map((day, index) => { const desc = weatherDescription(day.code); return <div className={`daily-row ${index === 0 ? 'today' : ''}`} key={day.date}><span className="daily-day">{localDay(day.date, index === 0)}{index === 0 && <small>Today</small>}</span><WeatherGlyph kind={desc.icon} size={19} /><span className="daily-condition">{desc.label}</span><span className="daily-rain">{formatProbability(day.precipitationProbability) ?? ''}</span><span className="daily-low">{formatTemperature(day.low, unit) ?? '—'}</span><span className="daily-high">{formatTemperature(day.high, unit) ?? '—'}</span></div> })}</div></article>
              </section>

              <section className="highlights-section"><div className="panel-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>Today’s details</h2></div></div><div className="metrics-grid"><Metric icon={Droplets} label="Humidity" value={current?.humidity != null ? `${current.humidity}%` : null} hint="Relative humidity" /><Metric icon={Wind} label="Wind" value={formatWind(current?.wind)} hint={current?.windDirection != null ? `${windDirection(current.windDirection)} direction` : 'Current conditions'} /><Metric icon={Sunrise} label="Sunrise" value={today?.sunrise ? localTime(today.sunrise) : null} hint="Local time" /><Metric icon={Sunset} label="Sunset" value={today?.sunset ? localTime(today.sunset) : null} hint="Local time" /><Metric icon={Sun} label="UV index" value={Number.isFinite(today?.uv) ? today.uv.toFixed(1) : null} hint="Daily maximum" /><Metric icon={Droplets} label="Precipitation" value={Number.isFinite(today?.precipitation) ? `${today.precipitation.toFixed(1)} mm` : null} hint={formatProbability(today?.precipitationProbability) ? `${formatProbability(today.precipitationProbability)} chance` : 'Today’s total'} /><Metric icon={ArrowUp} label="High" value={formatTemperature(today?.high, unit)} hint="Forecast high" /><Metric icon={ArrowDown} label="Low" value={formatTemperature(today?.low, unit)} hint="Forecast low" /></div></section>
            </>}
        </>}
    </main>
    <footer className="footer"><span>Weather for clearer everyday plans.</span><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> · Data licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></span></footer>
  </div>
}

export default App
