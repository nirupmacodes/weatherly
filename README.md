# Weatherly

Weatherly is a client-side weather companion built with React and Vite. Search a city or explicitly share your current location, then get current conditions, a 24-hour trend, a seven-day forecast, saved places, and cautious forecast-based planning notes.

## Run locally

Requires Node.js 20.19+ (or 22.12+) and npm.

```powershell
npm install
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

## Scripts

- `npm run dev` — start the development server.
- `npm test` — run unit and UI tests.
- `npm run build` — create the production bundle in `dist/`.
- `npm run preview` — serve the production bundle locally.

## Architecture

- `src/services/openMeteoClient.js` contains the geocoding and single-request forecast clients plus defensive response mapping.
- `src/app/App.jsx` composes the location search, current conditions, outlook, hourly chart, daily forecast, saved locations, and unit control.
- `src/features/insights.js` derives deterministic, explainable outlook notes from available hourly forecast fields. Its thresholds are product heuristics, not guarantees.
- `src/utils/weather.js` holds WMO descriptions, destination-local time labels, and unit formatting.
- `src/utils/storage.js` stores versioned preferences, the last location, and up to eight favorites. Invalid or unavailable local storage falls back safely.
- TanStack Query caches forecasts by coordinates and debounced geocoding by normalized query. Changing temperature units only changes presentation.

Weather and geocoding are fetched directly from Open-Meteo; no backend, account system, API key, or secret is required. Geolocation runs only after the user selects **Use my location**. Stored preferences stay in this browser.

## Data and attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This MVP assumes non-commercial use of Open-Meteo’s free API. Review [Open-Meteo’s terms](https://open-meteo.com/en/terms) and obtain the appropriate plan/license before commercializing the app. Forecasts can change and do not include an uptime or accuracy guarantee.

Forecast requests use the documented `/v1/forecast` current, hourly, and daily fields with canonical Celsius, km/h, millimetres, and `timezone=auto`. City lookup uses Open-Meteo’s Geocoding API. See the [forecast API documentation](https://open-meteo.com/en/docs) and [geocoding API documentation](https://open-meteo.com/en/docs/geocoding-api).

## Deploy

Build with `npm run build` and deploy the generated `dist/` directory to Vercel, Netlify, Cloudflare Pages, or another static host. The app has no client-side routes, environment variables, or server runtime.
