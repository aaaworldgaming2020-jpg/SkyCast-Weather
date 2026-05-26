/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherData, AirQualityData, CityGeocoding, WeatherAlert } from '../types';

/**
 * Fetch real-time weather details for a given coordinate using Open-Meteo core forecast API.
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch Air Quality index coordinates from Open-Meteo Air Quality atmospheric API.
 */
export async function fetchAirQualityData(lat: number, lon: number): Promise<AirQualityData> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch AQI data: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Queries coordinates for a given cities name using the free Open-Meteo Geocoding API.
 */
export async function searchCities(query: string): Promise<CityGeocoding[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding search failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.results || [];
}

/**
 * Maps Open-Meteo WMO weather codes to readable weather condition descriptions and styles.
 */
export interface WeatherCondition {
  label: string;
  icon: string;
  gradientClass: string;
  bgAnim: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  glowColor: string;
}

export function getWeatherCondition(code: number, isDay: boolean = true): WeatherCondition {
  // Clear Sky
  if (code === 0) {
    return {
      label: isDay ? 'Sunny' : 'Clear Sky',
      icon: isDay ? 'Sun' : 'Moon',
      gradientClass: isDay 
        ? 'from-amber-400 via-orange-400 to-sky-500' 
        : 'from-slate-900 via-indigo-950 to-slate-950',
      bgAnim: isDay ? 'sunny' : 'cloudy',
      glowColor: 'amber-400',
    };
  }
  
  // Mainly Clear / Cloudy
  if (code >= 1 && code <= 3) {
    return {
      label: code === 1 ? 'Mainly Clear' : code === 2 ? 'Partly Cloudy' : 'Overcast',
      icon: isDay ? 'CloudSun' : 'CloudMoon',
      gradientClass: isDay
        ? 'from-sky-400 via-blue-400 to-blue-500'
        : 'from-slate-800 via-slate-900 to-indigo-950',
      bgAnim: 'cloudy',
      glowColor: 'blue-300',
    };
  }

  // Foggy
  if (code === 45 || code === 48) {
    return {
      label: 'Foggy Mist',
      icon: 'CloudFog',
      gradientClass: 'from-slate-400 via-zinc-400 to-slate-500',
      bgAnim: 'cloudy',
      glowColor: 'zinc-200',
    };
  }

  // Drizzle / Rain
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const isHeavy = code === 65 || code === 82;
    return {
      label: isHeavy ? 'Heavy Rain' : 'Moderate Rain',
      icon: isHeavy ? 'CloudLightning' : 'CloudRain',
      gradientClass: isDay 
        ? 'from-blue-600 via-slate-500 to-slate-700' 
        : 'from-slate-950 via-slate-900 to-blue-950',
      bgAnim: 'rainy',
      glowColor: 'blue-400',
    };
  }

  // Snow
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return {
      label: 'Snowing',
      icon: 'CloudSnow',
      gradientClass: isDay
        ? 'from-sky-200 via-slate-300 to-zinc-400'
        : 'from-slate-900 via-slate-800 to-zinc-950',
      bgAnim: 'snowy',
      glowColor: 'sky-100',
    };
  }

  // Thunderstorms
  if (code >= 95 && code <= 99) {
    return {
      label: 'Severe Thunderstorm',
      icon: 'CloudLightning',
      gradientClass: 'from-zinc-900 via-indigo-950 to-zinc-950',
      bgAnim: 'stormy',
      glowColor: 'yellow-400',
    };
  }

  // Fallback
  return {
    label: 'Unknown',
    icon: 'Cloud',
    gradientClass: 'from-slate-600 to-slate-800',
    bgAnim: 'cloudy',
    glowColor: 'slate-300',
  };
}

/**
 * Dynamically computes alerts based on weather properties for realistic client-side alerts feedback
 */
export function generateDynamicAlerts(weather: WeatherData, aqi: AirQualityData | null): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const current = weather.current;
  const todayDaily = weather.daily;

  // 1. Extreme Heatwave
  if (current.temperature_2m > 36) {
    alerts.push({
      id: 'heat_1',
      type: 'heatwave',
      title: 'Extreme Heatwave Advisory',
      description: `Current temperature is extremely high at ${current.temperature_2m}°C. Stay inside, keep hydrated and avoid direct sunlight exposure.`,
      severity: 'severe',
      time: 'Immediate',
    });
  } else if (current.temperature_2m > 32) {
    alerts.push({
      id: 'heat_2',
      type: 'heatwave',
      title: 'Heat Wave Alert',
      description: `Higher temperatures detected (${current.temperature_2m}°C). Keep well-hydrated.`,
      severity: 'moderate',
      time: 'Today',
    });
  }

  // 2. Heavy Thunderstorms & Massive Rain
  if (current.weather_code >= 95) {
    alerts.push({
      id: 'storm_1',
      type: 'storm',
      title: 'Severe Thunderstorm Warning',
      description: 'Active visual lightning hazards, dense wind cells, and heavy localized precipitation. Avoid operating outdoor appliances.',
      severity: 'severe',
      time: 'Immediate',
    });
  } else if (current.precipitation > 2.0 || current.weather_code === 65) {
    alerts.push({
      id: 'rain_1',
      type: 'rain',
      title: 'Heavy Rain Warning',
      description: 'Precipitation readings indicate structural flash-flooding risks in lower elevations. Bring umbrella.',
      severity: 'major',
      time: 'Next 3 hours',
    });
  }

  // 3. Strong Wind Warning
  if (current.wind_speed_10m > 35) {
    alerts.push({
      id: 'wind_1',
      type: 'wind',
      title: 'High Wind Velocity Alert',
      description: `Wind gusts up to ${current.wind_speed_10m} km/h recorded. Loose outdoors items should be secured immediately.`,
      severity: 'major',
      time: 'Ongoing',
    });
  } else if (current.wind_speed_10m > 24) {
    alerts.push({
      id: 'wind_2',
      type: 'wind',
      title: 'Breezy Winds Alert',
      description: `Fresh breeze lines at ${current.wind_speed_10m} km/h. Perfect for outdoor winds sports.`,
      severity: 'minor',
      time: 'Today',
    });
  }

  // 4. UV Index Warnings
  const maxUv = todayDaily.uv_index_max[0] || 0;
  if (maxUv >= 8) {
    alerts.push({
      id: 'uv_1',
      type: 'uv',
      title: 'Extreme UV Radiation Warning',
      description: `UV indexes reaching critical peaks of ${maxUv}. SPF 50+ sunscreen, hats, and sunglasses are highly recommended.`,
      severity: 'major',
      time: '11:00 AM - 4:00 PM',
    });
  }

  // 5. Air Quality Index Alerts
  if (aqi) {
    const usAqi = aqi.current.us_aqi;
    if (usAqi > 150) {
      alerts.push({
        id: 'aqi_1',
        type: 'cold', // repurposed for poor AQI
        title: 'Unhealthy Air Quality Index',
        description: `Critical PM2.5 concentrations observed (US-AQI: ${usAqi}). Sensitive groups should wear face filtrations outdoors.`,
        severity: 'major',
        time: 'Immediate',
      });
    }
  }

  return alerts;
}

/**
 * Maps US AQI integer bands to clear, human-understandable qualitative categories, descriptions and styles.
 */
export interface AqiDefinition {
  value: number;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export function getAqiDefinition(usAqiValue: number): AqiDefinition {
  if (usAqiValue <= 50) {
    return {
      value: usAqiValue,
      label: 'Good',
      color: 'text-emerald-400 border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      description: 'Excellent atmospheric filtration. Perfectly safe for standard physical exercises exteriorly.',
    };
  }
  if (usAqiValue <= 100) {
    return {
      value: usAqiValue,
      label: 'Moderate',
      color: 'text-yellow-400 border-yellow-500/30',
      bgColor: 'bg-yellow-500/10',
      description: 'Acceptable indices. Highly sensitive persons may suffer subtle throat reactions or sneezing.',
    };
  }
  if (usAqiValue <= 150) {
    return {
      value: usAqiValue,
      label: 'Sensitive Warning',
      color: 'text-orange-400 border-orange-500/30',
      bgColor: 'bg-orange-500/10',
      description: 'Irritations possible. Sensitive users might experience lung tightness or allergic asthmas.',
    };
  }
  return {
    value: usAqiValue,
    label: 'Hazardous',
    color: 'text-red-400 border-red-500/30',
    bgColor: 'bg-red-500/10',
    description: 'Active particulate density. Advised to stay insulated indoors with filtration systems online.',
  };
}
