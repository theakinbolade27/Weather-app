// Use Open-Meteo: geocode city -> fetch forecast (current + daily + hourly humidity)
const searchForm = document.getElementById('searchForm');
const submitBtn = searchForm.querySelector('button[type="submit"]');
searchForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const city = document.getElementById('q').value.trim();
  if (!city) return;
  let prevBtnText;
  if (submitBtn) {
    prevBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
  }

  try {
    const place = await fetchCoordinates(city);
    const data = await fetchWeather(place.latitude, place.longitude);

    // extract values
    const current = data.current_weather;
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    // find humidity and wind from hourly if possible
    let humidity = 'N/A';
    let windSpeed = current.windspeed; // meters/second as returned by Open-Meteo
    if (hourly.time && hourly.time.length) {
      const idx = hourly.time.indexOf(current.time);
      if (idx >= 0) {
        if (hourly.relativehumidity_2m && hourly.relativehumidity_2m[idx] !== undefined) {
          humidity = hourly.relativehumidity_2m[idx];
        }
        if (hourly.windspeed_10m && hourly.windspeed_10m[idx] !== undefined) {
          windSpeed = hourly.windspeed_10m[idx];
        }
      }
    }

    const mapped = mapWeatherCode(current.weathercode);

    renderCurrentWeather(place, current, humidity, windSpeed, mapped);
    renderForecast(daily, current);
    document.getElementById('q').value = '';
  } catch (err) {
    // show a clear error message for users
    console.error(err);
    alert(err.message || 'Failed to fetch weather data');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = prevBtnText || 'Search';
    }
  }
});

/**
 * mapWeatherCode(code)
 * Convert a WMO weather code into a human readable text and emoji icon.
 * @param {number|string} code - WMO weather code from Open-Meteo
 * @returns {{text: string, icon: string}}
 */
function mapWeatherCode(code) {
  const c = Number(code);
  if (c === 0) return { text: 'Clear sky', icon: '☀' };
  if ([1, 2, 3].includes(c)) return { text: 'Partly cloudy', icon: '⛅' };
  if ([45, 48].includes(c)) return { text: 'Foggy', icon: '🌫' };
  if ([51, 53, 55].includes(c)) return { text: 'Drizzle', icon: '🌦' };
  if ([61, 63, 65].includes(c)) return { text: 'Rain', icon: '🌧' };
  if ([71, 73, 75].includes(c)) return { text: 'Snow', icon: '❄' };
  if ([80, 81, 82].includes(c)) return { text: 'Rain showers', icon: '🌦' };
  if (c === 95) return { text: 'Thunderstorm', icon: '⛈' };
  return { text: 'Unknown', icon: '🌈' };
}

/**
 * fetchCoordinates(city)
 * Fetch the first geocoding result for `city` using Open-Meteo Geocoding API.
 * Throws an Error with a user-friendly message when the city is not found.
 */
async function fetchCoordinates(city) {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  if (!geoRes.ok) throw new Error('Failed to lookup city coordinates');
  const geo = await geoRes.json();
  if (!geo.results || geo.results.length === 0) throw new Error('City not found');
  const place = geo.results[0];
  return {
    name: place.name,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude
  };
}

/**
 * fetchWeather(lat, lon)
 * Fetch weather data from Open-Meteo for the provided coordinates.
 * Returns the JSON response which includes `current_weather`, `daily`, and `hourly`.
 */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weather data');
  const data = await res.json();
  if (!data || !data.current_weather) throw new Error('Weather data unavailable');
  return data;
}

/**
 * renderCurrentWeather(place, current, humidity, windSpeed, mapped)
 * Update page elements with current weather: city name, temperature (°C), description, humidity, wind speed.
 */
function renderCurrentWeather(place, current, humidity, windSpeed, mapped) {
  const displayName = `${place.name}${place.country ? ', ' + place.country : ''}`;
  document.getElementById('cityName').textContent = displayName;
  document.getElementById('temperature').textContent = Math.round(current.temperature) + '°C';
  document.getElementById('description').textContent = `${mapped.text} ${mapped.icon}`;
  document.getElementById('humidity').textContent = (humidity !== 'N/A') ? humidity + '%' : 'N/A';
  // Open-Meteo returns wind speeds in m/s; convert to km/h for display
  document.getElementById('windSpeed').textContent = (windSpeed !== undefined)
    ? Math.round(windSpeed * 3.6) + ' km/h'
    : 'N/A';
  document.getElementById('uvIndex').textContent = 'N/A';
}

/**
 * renderForecast(daily, current)
 * Render a 5-day forecast showing day name, icon, high and low temperatures.
 */
function renderForecast(daily, current) {
  const forecastList = document.querySelector('.forecast-list');
  forecastList.innerHTML = '';
  const days = daily.time && daily.time.length ? Math.min(5, daily.time.length) : 0;
  for (let i = 0; i < days; i++) {
    const dateStr = daily.time[i];
    const dayLabel = (new Date(dateStr)).toLocaleDateString(undefined, { weekday: 'short' });
    const code = Array.isArray(daily.weathercode) ? daily.weathercode[i] : current.weathercode;
    const map = mapWeatherCode(code);
    const high = daily.temperature_2m_max && daily.temperature_2m_max[i] !== undefined ? Math.round(daily.temperature_2m_max[i]) + '°' : '-';
    const low = daily.temperature_2m_min && daily.temperature_2m_min[i] !== undefined ? Math.round(daily.temperature_2m_min[i]) + '°' : '-';

    const row = document.createElement('div');
    row.className = 'forecast-row';
    row.innerHTML = `
      <div class="forecast-day">${dayLabel}</div>
      <div class="forecast-icon">${map.icon}</div>
      <div class="forecast-temp"><span class="high">${high}</span><span class="low">${low}</span></div>
    `;
    forecastList.appendChild(row);
  }
}
