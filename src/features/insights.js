import { localTime } from '../utils/weather.js'

// Heuristics are intentionally cautious, tunable indicators, not meteorological guarantees.
export const RAIN_THRESHOLD = 50
export const DRY_WINDOW_THRESHOLD = 20
export const STRONG_WIND_KMH = 45
export const MIN_TEMPERATURE_SWING_C = 3

export function deriveInsights(weather) {
  const hours = weather?.hours ?? []
  const start = hours.findIndex((hour) => hour.time >= weather?.current?.time)
  const upcoming = start < 0 ? [] : hours.slice(start, start + 12)
  const insights = []
  const wet = upcoming.filter((hour) => Number.isFinite(hour.precipitationProbability) && hour.precipitationProbability >= RAIN_THRESHOLD)
  if (wet.length) {
    const first = wet[0]
    insights.push({ id: 'rain', severity: 'notice', title: 'Keep an eye on the sky', message: `Rain is possible around ${localTime(first.time)} (${Math.round(first.precipitationProbability)}% chance).`, icon: 'rain', relevantTime: first.time })
    insights.push({ id: 'umbrella', severity: 'action', title: 'An umbrella may help', message: `At least one upcoming hour has a ${RAIN_THRESHOLD}% or higher chance of precipitation.`, icon: 'umbrella', relevantTime: first.time })
  } else if (upcoming.some((hour) => Number.isFinite(hour.precipitationProbability))) {
    insights.push({ id: 'rain-low', severity: 'calm', title: 'A mostly dry stretch ahead', message: 'No significant rain is indicated in the next few hours.', icon: 'sun', relevantTime: upcoming[0]?.time })
  }
  const candidate = upcoming.find((hour, i) => Number.isFinite(hour.precipitationProbability) && hour.precipitationProbability <= DRY_WINDOW_THRESHOLD
    && upcoming[i + 1] && Number.isFinite(upcoming[i + 1].precipitationProbability) && upcoming[i + 1].precipitationProbability <= DRY_WINDOW_THRESHOLD
    && Number.isFinite(hour.temperature) && Number.isFinite(hour.wind))
  if (candidate && !wet.some((hour) => hour.time === candidate.time)) insights.push({ id: 'outdoor', severity: 'calm', title: 'A possible outdoor window', message: `Forecast rain chances stay low from ${localTime(candidate.time)} for at least two hours.`, icon: 'sun', relevantTime: candidate.time })
  const validTemp = upcoming.filter((hour) => Number.isFinite(hour.temperature))
  if (validTemp.length >= 4) {
    const warmest = validTemp.reduce((best, item) => item.temperature > best.temperature ? item : best)
    const coolest = validTemp.reduce((best, item) => item.temperature < best.temperature ? item : best)
    if (warmest.temperature - coolest.temperature >= MIN_TEMPERATURE_SWING_C) insights.push({ id: 'temperature', severity: 'calm', title: 'Warmest part of the day', message: `Temperatures are forecast to peak near ${localTime(warmest.time)}.`, icon: 'sun', relevantTime: warmest.time })
  }
  const windy = upcoming.find((hour) => Number.isFinite(hour.wind) && hour.wind >= STRONG_WIND_KMH)
  if (windy) insights.push({ id: 'wind', severity: 'notice', title: 'Breezy conditions possible', message: `Winds may reach ${Math.round(windy.wind)} km/h around ${localTime(windy.time)}.`, icon: 'wind', relevantTime: windy.time })
  return insights.slice(0, 3)
}
