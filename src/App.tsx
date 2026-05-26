/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useId, useTransition } from 'react';
import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudFog, CloudRain, CloudLightning, CloudSnow,
  Wind, Droplets, Search, Map, Settings, Trash2, Heart, Navigation,
  ArrowUp, ArrowDown, HelpCircle, Sparkles, AlertTriangle, Compass, Eye, EyeOff, LayoutGrid, Chrome, Play, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WeatherData, AirQualityData, CityGeocoding, WeatherAlert } from './types';
import {
  fetchWeatherData,
  fetchAirQualityData,
  searchCities,
  getWeatherCondition,
  generateDynamicAlerts,
  getAqiDefinition
} from './api/openMeteo';

import { WeatherBackground } from './components/WeatherBackground';
import { RadarMap } from './components/RadarMap';
import { CodeExplorer } from './components/CodeExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'guide'>('app');
  const [appNav, setAppNav] = useState<'home' | 'forecast' | 'radar' | 'search' | 'settings'>('home');

  // Weather States
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [activeCity, setActiveCity] = useState<{ name: string; lat: number; lon: number }>({
    name: 'London',
    lat: 51.5085,
    lon: -0.1257
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityGeocoding[]>([]);
  const [favorites, setFavorites] = useState<Array<{ name: string; lat: number; lon: number }>>([
    { name: 'London', lat: 51.5085, lon: -0.1257 },
    { name: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503 }
  ]);

  const [isCelsius, setIsCelsius] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);

  // Logs / Diagnostics Stream for Developer HUD
  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const elementId = useId();

  // Helper to add log
  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [{ time: timestamp, msg, type }, ...prev.slice(0, 39)]);
  };

  // Load favorites from local storage
  useEffect(() => {
    const stored = localStorage.getItem('skycast_favs');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        addLog('Error reading favorites cache, purging...', 'error');
      }
    }
    addLog('SkyCast diagnostics core booted successfully.', 'success');
  }, []);

  // Sync favorites
  const persistFavorites = (updated: typeof favorites) => {
    setFavorites(updated);
    localStorage.setItem('skycast_favs', JSON.stringify(updated));
  };

  // Main weather loading effect
  useEffect(() => {
    let active = true;
    async function initWeather() {
      setLoading(true);
      setErrorMsg(null);
      addLog(`Initiating Open-Meteo weather fetch for [${activeCity.name}]...`, 'info');

      try {
        const weatherData = await fetchWeatherData(activeCity.lat, activeCity.lon);
        if (!active) return;
        
        let aqiData: AirQualityData | null = null;
        try {
          aqiData = await fetchAirQualityData(activeCity.lat, activeCity.lon);
        } catch (aqiErr) {
          addLog('AQI sub-API timeout. Falling back to default baseline.', 'warn');
        }

        setWeather(weatherData);
        setAirQuality(aqiData);
        
        const dynamicAlerts = generateDynamicAlerts(weatherData, aqiData);
        setWeatherAlerts(dynamicAlerts);

        addLog(`Completed weather parse for ${activeCity.name}. UTC time confirmed.`, 'success');
        if (dynamicAlerts.length > 0) {
          addLog(`Active meteorological hazards: ${dynamicAlerts.map(a => a.title).join(', ')}`, 'warn');
        }
      } catch (err: any) {
        if (!active) return;
        setErrorMsg(err.message || 'Network error fetching forecast feeds');
        addLog(`Weather fetch failed: ${err.message}`, 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initWeather();
    return () => { active = false; };
  }, [activeCity]);

  // Geolocation trigger
  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      addLog('GPS API missing or blocked in active frame.', 'error');
      alert('Local GPS detection not supported in this frame context. Try searching manually!');
      return;
    }

    addLog('Requesting current physical GPS coordinates...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setActiveCity({ name: 'My Location', lat: latitude, lon: longitude });
        setGpsEnabled(true);
        addLog(`GPS lock established: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`, 'success');
      },
      (err) => {
        addLog(`GPS access rejected: ${err.message}`, 'error');
        setErrorMsg('Could not fetch device GPS. Please search for a city manually instead!');
      }
    );
  };

  // Search cities handler
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchCities(val);
      setSearchResults(results);
    } catch (e) {
      addLog(`City geocoding error: ${e}`, 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectCity = (city: CityGeocoding) => {
    setActiveCity({
      name: `${city.name}, ${city.country_code.toUpperCase()}`,
      lat: city.latitude,
      lon: city.longitude
    });
    setAppNav('home');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Toggle favorite
  const isFavorite = (name: string) => favorites.some(fav => fav.name === name);

  const toggleFavorite = () => {
    if (isFavorite(activeCity.name)) {
      const filtered = favorites.filter(fav => fav.name !== activeCity.name);
      persistFavorites(filtered);
      addLog(`Removed [${activeCity.name}] from cached cities.`, 'info');
    } else {
      const updated = [...favorites, activeCity];
      persistFavorites(updated);
      addLog(`Bookmarked [${activeCity.name}] globally.`, 'success');
    }
  };

  // Render icons helper
  const renderWeatherIcon = (iconName: string, sizeClass = "w-6 h-6", colorOverride = "text-white") => {
    const iconMap: Record<string, any> = {
      Sun: Sun,
      Moon: Moon,
      Cloud: Cloud,
      CloudSun: CloudSun,
      CloudMoon: CloudMoon,
      CloudFog: CloudFog,
      CloudRain: CloudRain,
      CloudLightning: CloudLightning,
      CloudSnow: CloudSnow
    };
    const Component = iconMap[iconName] || Cloud;
    return <Component className={`${sizeClass} ${colorOverride}`} />;
  };

  // Celsius to Fahrenheit conversion helper
  const formatTemp = (tempC: number) => {
    const value = isCelsius ? tempC : (tempC * 9) / 5 + 32;
    return `${Math.round(value)}°${isCelsius ? 'C' : 'F'}`;
  };

  // Open-Meteo code attributes
  const currentCondition = weather
    ? getWeatherCondition(weather.current.weather_code, weather.current.is_day === 1)
    : getWeatherCondition(0, true);

  return (
    <div key={elementId} className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans">
      {/* 1. Sleek Modern Dashboard Top Navigation bar (Universal Studio Layout) */}
      <header className="border-b border-slate-900/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-sky-400 to-indigo-600 p-2 rounded-xl shadow-lg ring-1 ring-white/10">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-mono font-semibold tracking-widest text-sky-400 uppercase">
              STUDIO BUILD
            </span>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-none mt-0.5">
              SkyCast Weather <span className="text-[10px] bg-slate-800 text-slate-400 font-mono font-medium px-2 py-0.5 rounded-full border border-slate-700/50">v1.2.0</span>
            </h1>
          </div>
        </div>

        {/* Global Tab controls: App Simulator vs Source Code vs Play Store Guide */}
        <div className="flex bg-slate-900/70 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all select-none ${
              activeTab === 'app'
                ? 'bg-sky-500 text-white shadow shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Chrome className="w-3.5 h-3.5" />
            Live App view
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all select-none ${
              activeTab === 'code'
                ? 'bg-sky-500 text-white shadow shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Kotlin Project Explorer
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all select-none ${
              activeTab === 'guide'
                ? 'bg-sky-500 text-white shadow shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Play Store & Setup Guide
          </button>
        </div>
      </header>

      {/* Main Workspace Body layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TAB 1: App Live view containing side-by-side interactive panels */}
        {activeTab === 'app' && (
          <>
            {/* Interactive Beagle Mobile Phone Bezel Frame (lg:col-span-5) */}
            <section className="lg:col-span-5 flex justify-center sticky top-24">
              <div className="relative w-[345px] h-[705px] bg-[#111624] rounded-[48px] p-3.5 border-[6px] border-[#20273a] shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col">
                {/* Android Phone Speaker bezel line */}
                <div className="absolute top-0 left-0 w-full flex justify-center z-50">
                  <div className="w-32 h-6 bg-black rounded-b-2xl flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800"></div>
                    <div className="w-14 h-1 bg-slate-800 rounded-full"></div>
                  </div>
                </div>

                {/* Simulated Android Top Status Grid bar */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2 text-[10px] font-mono text-slate-400 select-none z-40 bg-slate-900/10 backdrop-blur-md rounded-t-3xl">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 rotate-45" />
                    <span>5G LTE</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Dynamic Screen contents inside mobile card bezel frame */}
                <div className="flex-1 rounded-3xl overflow-hidden relative flex flex-col bg-[#0b0f19] border border-white/5 select-none">
                  {/* Weather dynamic canvas particle backgrounds behind text templates */}
                  {weather ? (
                    <WeatherBackground type={currentCondition.bgAnim} />
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-full bg-slate-950 z-0"></div>
                  )}

                  {/* Top Location header (shown on home tab) */}
                  <div className="p-4 flex items-center justify-between z-10 relative bg-gradient-to-b from-black/50 via-black/20 to-transparent">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={requestGPSLocation}
                        className="p-1.5 bg-white/10 border border-white/10 rounded-full text-slate-200 hover:bg-white/20 transition-all select-none"
                        title="Auto Location Request"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <p className="text-[10px] font-mono tracking-widest text-[#94a3b8] uppercase leading-none">
                          SKYCAST METRIC
                        </p>
                        <h2 className="text-sm font-bold tracking-tight text-white leading-tight mt-0.5 truncate max-w-[155px]">
                          {activeCity.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={toggleFavorite}
                        className="p-1.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 text-rose-500 rounded-full transition-transform active:scale-90"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorite(activeCity.name) ? 'fill-rose-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => setIsCelsius(!isCelsius)}
                        className="px-2.5 py-1 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 text-white font-mono text-xs rounded-full"
                        title="Toggle temperature format"
                      >
                        {isCelsius ? '°F' : '°C'}
                      </button>
                    </div>
                  </div>

                  {/* Screen Content Switcher */}
                  <div className="flex-1 overflow-y-auto z-10 p-4 scrollbar-none pb-20 relative">
                    {loading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
                        <p className="text-xs font-mono text-slate-400">CONNECTING SKYCAST DATA feeds...</p>
                      </div>
                    ) : errorMsg ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                        <span className="text-xs font-semibold text-slate-200 uppercase tracking-widest font-mono">
                          CONNECTION ERROR
                        </span>
                        <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                          {errorMsg}
                        </p>
                        <button
                          onClick={() => setActiveCity({ name: 'London', lat: 51.5085, lon: -0.1257 })}
                          className="mt-4 px-3 py-1.5 bg-white/10 text-[10px] font-mono rounded hover:bg-white/20"
                        >
                          RESET BASELINE
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* 1. App Tab 1: HOME PANEL */}
                        {appNav === 'home' && weather && (
                          <div className="space-y-4">
                            {/* Current Temp and Icon Grid Banner */}
                            <div className="text-center py-4 flex flex-col items-center">
                              <div className="relative mb-2">
                                <div className={`absolute inset-0 bg-${currentCondition.glowColor}/30 blur-2xl rounded-full`}></div>
                                <div className="relative">
                                  {renderWeatherIcon(currentCondition.icon, 'w-16 h-16', `text-${currentCondition.glowColor}`)}
                                </div>
                              </div>
                              <h3 className="text-xs font-mono font-medium text-white/90 uppercase tracking-wider">
                                {currentCondition.label}
                              </h3>
                              <h1 className="text-5xl font-extrabold tracking-tighter text-white mt-1 select-all">
                                {formatTemp(weather.current.temperature_2m)}
                              </h1>
                              <p className="text-xs text-slate-300 mt-1.5 flex items-center gap-1 bg-black/35 px-2.5 py-0.5 rounded-full border border-white/5">
                                Apparent Feels: <b>{formatTemp(weather.current.apparent_temperature)}</b>
                              </p>
                            </div>

                            {/* Live Alerts banner slider */}
                            {weatherAlerts.length > 0 && (
                              <div className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl backdrop-blur-sm select-text">
                                <div className="flex items-center gap-1.5 text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                                    METEOROLOGICAL ALERTS ({weatherAlerts.length})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  {weatherAlerts[0].description}
                                </p>
                              </div>
                            )}

                            {/* Grid details (Humidity, Wind, Air Quality Index) */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Wind detail */}
                              <div className="bg-black/45 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                                <div className="p-2 bg-sky-500/10 rounded-lg">
                                  <Wind className="w-4 h-4 text-sky-400" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9px] font-mono text-slate-400 block tracking-tight">WIND SPEED</span>
                                  <span className="text-xs font-bold text-slate-200">
                                    {weather.current.wind_speed_10m} km/h
                                  </span>
                                </div>
                              </div>

                              {/* Humidity detail */}
                              <div className="bg-black/45 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                  <Droplets className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9px] font-mono text-slate-400 block tracking-tight">HUMIDITY</span>
                                  <span className="text-xs font-bold text-slate-200">
                                    {weather.current.relative_humidity_2m}%
                                  </span>
                                </div>
                              </div>

                              {/* air quality card details */}
                              {airQuality && (
                                <div className="col-span-2 bg-black/45 border border-white/5 p-3 rounded-xl select-text">
                                  {(() => {
                                    const def = getAqiDefinition(airQuality.current.us_aqi);
                                    return (
                                      <div className="flex items-start justify-between gap-2.5">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-mono text-slate-400">ATMOSPHERIC AQI</span>
                                            <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${def.bgColor} ${def.color} border`}>
                                              {def.label}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 leading-tight">
                                            {def.description}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-xl font-extrabold text-[#f1f5f9]">
                                            {airQuality.current.us_aqi}
                                          </span>
                                          <span className="text-[8px] font-mono text-slate-500 block">PM2.5 INDEX</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Extra widgets: UV index, sunrise / sunset details */}
                            <div className="bg-black/45 border border-white/5 p-3 rounded-xl space-y-2">
                              <span className="text-[9px] font-mono text-slate-400 tracking-wider uppercase block">
                                Sun Alignment & Solar Path
                              </span>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                                <div className="flex items-center justify-between bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 text-[10px]">Sunrise</span>
                                  <span className="font-mono text-emerald-400 font-semibold">
                                    {weather.daily.sunrise[0]?.split('T')[1]?.substring(0, 5) || ""}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-slate-500 text-[10px]">Sunset</span>
                                  <span className="font-mono text-orange-400 font-semibold">
                                    {weather.daily.sunset[0]?.split('T')[1]?.substring(0, 5) || ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. App Tab 2: FORECAST DETAIL PANEL */}
                        {appNav === 'forecast' && weather && (
                          <div className="space-y-4 select-text">
                            {/* Horizontal sliding hourly list */}
                            <div className="space-y-1.5">
                              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                Hourly Progress (Next 24h)
                              </h4>
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                                {weather.hourly.time.slice(0, 24).map((time, idx) => {
                                  const tempValue = weather.hourly.temperature_2m[idx];
                                  const probability = weather.hourly.precipitation_probability[idx];
                                  const wCode = weather.hourly.weather_code[idx];
                                  const cond = getWeatherCondition(wCode, true);
                                  const hourLabel = time.split('T')[1].substring(0, 5);

                                  return (
                                    <div
                                      key={time}
                                      className="min-w-[64px] bg-black/45 border border-white/5 p-2 rounded-xl text-center space-y-1 backdrop-blur-sm shadow shadow-black flex flex-col items-center"
                                    >
                                      <span className="text-[9px] font-mono text-slate-400 block">{hourLabel}</span>
                                      {renderWeatherIcon(cond.icon, "w-4.5 h-4.5", `text-${cond.glowColor}`)}
                                      <span className="text-xs font-bold text-white block">{formatTemp(tempValue)}</span>
                                      {probability > 10 && (
                                        <span className="text-[8px] font-mono text-sky-400 block font-semibold">{probability}% Rain</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 7-Day Extended forecast layouts */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                Extended 7-Day Outlook
                              </h4>
                              <div className="space-y-2">
                                {weather.daily.time.map((day, idx) => {
                                  const maxT = weather.daily.temperature_2m_max[idx];
                                  const minT = weather.daily.temperature_2m_min[idx];
                                  const code = weather.daily.weather_code[idx];
                                  const condition = getWeatherCondition(code, true);

                                  // Simple readable date formatter
                                  const d = new Date(day);
                                  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                  const dayNumber = d.getDate();

                                  return (
                                    <div
                                      key={day}
                                      className="flex items-center justify-between bg-black/45 border border-white/5 p-2.5 rounded-xl text-xs backdrop-blur-sm"
                                    >
                                      <div className="flex items-center gap-3 w-[85px]">
                                        <span className="font-semibold text-slate-200">{weekday}</span>
                                        <span className="font-mono text-slate-500 text-[10px]">{dayNumber}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 grow justify-center">
                                        {renderWeatherIcon(condition.icon, "w-4.5 h-4.5", `text-${condition.glowColor}`)}
                                        <span className="text-[10px] text-slate-400 truncate max-w-[85px]">
                                          {condition.label}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-end gap-2.5 font-mono text-[10px] w-[95px]">
                                        <span className="text-emerald-400 font-semibold">{formatTemp(minT)}</span>
                                        <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
                                          <div className="absolute top-0 left-[25%] right-[25%] h-full bg-slate-400 rounded-full"></div>
                                        </div>
                                        <span className="text-orange-400 font-semibold">{formatTemp(maxT)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. App Tab 3: DOPPLER RADAR MAP PANEL */}
                        {appNav === 'radar' && (
                          <div className="space-y-4">
                            <RadarMap
                              latitude={activeCity.lat}
                              longitude={activeCity.lon}
                              cityName={activeCity.name}
                            />
                            <div className="bg-black/45 border border-white/5 p-3 rounded-xl text-xs space-y-1.5">
                              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest font-semibold">
                                radar instruction
                              </span>
                              <p className="text-slate-400 leading-normal text-[10.5px]">
                                Click the <b>INJECT CELL</b> button below to inject procedurally drifting meteorological storms into the Doppler sweep zone! Change the zoom levels to adjust tracking ranges.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 4. App Tab 4: SEARCH SEARCH PANEL */}
                        {appNav === 'search' && (
                          <div className="space-y-4">
                            {/* Search bar inputs */}
                            <div className="relative">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search cities name... (e.g. Paris)"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-10 text-xs font-mono outline-none text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all select-all focus:select-none"
                              />
                            </div>

                            {/* Autocomplete query responses */}
                            <AnimatePresence>
                              {searchResults.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="bg-[#0f1422] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 shadow-2xl z-50 absolute left-4 right-4"
                                >
                                  {searchResults.map((city) => (
                                    <button
                                      key={city.id}
                                      onClick={() => selectCity(city)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <span className="font-semibold text-slate-200">{city.name}</span>
                                        {city.admin1 && (
                                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                            ({city.admin1})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-sky-400 px-1.5 py-0.5 bg-sky-950/40 border border-sky-500/20 rounded">
                                        {city.country_code.toUpperCase()}
                                      </span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Favorites List layout */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                                Bookmarked Cities
                              </h4>

                              {favorites.length === 0 ? (
                                <p className="text-[11px] font-mono text-slate-500 p-4 border border-dashed border-white/5 rounded-xl text-center">
                                  No saved cities in cached memory. Click the heart inside search parameters!
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {favorites.map((fav) => (
                                    <div
                                      key={fav.name}
                                      className="flex items-center justify-between bg-black/45 hover:bg-black/65 border border-white/5 p-2.5 rounded-xl text-xs transition-colors"
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveCity({ name: fav.name, lat: fav.lat, lon: fav.lon });
                                          setAppNav('home');
                                        }}
                                        className="grow text-left font-semibold text-slate-200"
                                      >
                                        {fav.name}
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          const filtered = favorites.filter(f => f.name !== fav.name);
                                          persistFavorites(filtered);
                                          addLog(`Removed bookmark: ${fav.name}`, 'info');
                                        }}
                                        className="p-1 text-slate-500 hover:text-rose-500 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded transition-colors"
                                        title="Delete favorite"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. App Tab 5: SETTINGS SETTINGS PANEL */}
                        {appNav === 'settings' && (
                          <div className="space-y-4 text-xs select-text">
                            <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                              App Configurations
                            </h4>

                            <div className="bg-black/45 border border-white/5 p-3 rounded-xl space-y-3">
                              {/* Toggle Temperature unit config */}
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-200">Measurement Scale</span>
                                  <p className="text-[10px] text-slate-400">Toggle meteorological output standards.</p>
                                </div>
                                <button
                                  onClick={() => setIsCelsius(!isCelsius)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-sky-400 font-mono font-medium border border-white/5 text-[10.5px]"
                                >
                                  {isCelsius ? 'METRIC (°C)' : 'IMPERIAL (°F)'}
                                </button>
                              </div>

                              <hr className="border-white/5" />

                              {/* Toggle Geo config */}
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-200">System GPS Services</span>
                                  <p className="text-[10px] text-slate-400">Trigger standard core Geolocation pulls.</p>
                                </div>
                                <button
                                  onClick={requestGPSLocation}
                                  className="px-3 py-1 bg-emerald-900/20 hover:bg-emerald-950/40 border border-emerald-500/20 rounded-md text-emerald-400 font-mono font-medium text-[10.5px]"
                                >
                                  RE-TRIGGER GPS
                                </button>
                              </div>
                            </div>

                            {/* Shortcut Developer Code view button */}
                            <div className="bg-gradient-to-tr from-sky-400/10 to-indigo-600/10 border border-sky-400/20 p-3.5 rounded-xl space-y-2">
                              <h5 className="font-bold text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-sky-400" />
                                Inspect Android codebase
                              </h5>
                              <p className="text-[10.5px] text-slate-300 leading-relaxed">
                                Curious to run SkyCast Weather natively on your Android Emulator or physical phone? Access our complete Kotlin Jetpack Compose MVVM source codes directory in the secondary dashboard menu.
                              </p>
                              <button
                                onClick={() => setActiveTab('code')}
                                className="w-full mt-1.5 py-1.5 bg-sky-500 hover:bg-sky-600 font-medium rounded-lg text-white font-mono text-[10.5px] shadow-md shadow-sky-500/10"
                              >
                                OPEN KOTLIN REPOSITORY
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Android Core Bottom Navigation Tab Bar (z-index overlays) */}
                  <div className="absolute bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-md border-t border-white/5 py-1 z-30 flex justify-around">
                    <button
                      onClick={() => setAppNav('home')}
                      className={`flex flex-col items-center py-1.5 px-3 transition-colors ${
                        appNav === 'home' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <CloudSun className="w-4.5 h-4.5" />
                      <span className="text-[8px] font-mono mt-0.5">Home</span>
                    </button>
                    
                    <button
                      onClick={() => setAppNav('forecast')}
                      className={`flex flex-col items-center py-1.5 px-3 transition-colors ${
                        appNav === 'forecast' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <LayoutGrid className="w-4.5 h-4.5" />
                      <span className="text-[8px] font-mono mt-0.5">Forecast</span>
                    </button>

                    <button
                      onClick={() => setAppNav('radar')}
                      className={`flex flex-col items-center py-1.5 px-3 transition-colors ${
                        appNav === 'radar' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Compass className="w-4.5 h-4.5 animate-spin-slow" />
                      <span className="text-[8px] font-mono mt-0.5">Radar</span>
                    </button>

                    <button
                      onClick={() => setAppNav('search')}
                      className={`flex flex-col items-center py-1.5 px-3 transition-colors ${
                        appNav === 'search' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Search className="w-4.5 h-4.5" />
                      <span className="text-[8px] font-mono mt-0.5">Search</span>
                    </button>

                    <button
                      onClick={() => setAppNav('settings')}
                      className={`flex flex-col items-center py-1.5 px-3 transition-colors ${
                        appNav === 'settings' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Settings className="w-4.5 h-4.5" />
                      <span className="text-[8px] font-mono mt-0.5">Settings</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Android Home pill gesture controller */}
                <div 
                  className="w-full flex justify-center py-2 shrink-0 cursor-pointer"
                  onClick={() => setAppNav('home')}
                >
                  <div className="w-24 h-1 bg-slate-700/80 rounded-full hover:bg-slate-500 transition-colors"></div>
                </div>
              </div>
            </section>

            {/* Right Pane: Developer Live diagnostics panel (col-span-7) */}
            <section className="lg:col-span-7 space-y-6">
              {/* Features and Core specifications checklist cards */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4 select-text">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    SkyCast Weather - Interactive Feature Console
                  </h3>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  You are evaluating a fully realized, live weather client. It is configured to run zero-key Open-Meteo REST parameters and features dynamic canvas particle animations mapping the active weather condition code!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-start gap-2.5 bg-slate-950/20 border border-slate-800/40 p-2 rounded-xl">
                    <span className="p-1 bg-sky-500/10 rounded-lg text-sky-400 shrink-0">1</span>
                    <span className="leading-tight"><b>Dynamic Particles background</b> reacts to active weather code state directly.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-950/20 border border-slate-800/40 p-2 rounded-xl">
                    <span className="p-1 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">2</span>
                    <span className="leading-tight"><b>Doppler sweep weather Radar Radar</b> can procedurally spawn drifting cells.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-950/20 border border-slate-800/40 p-2 rounded-xl">
                    <span className="p-1 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">3</span>
                    <span className="leading-tight"><b>Cities Search geocoding</b> leverages real-time global autocomplete indexing API.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-950/20 border border-slate-800/40 p-2 rounded-xl">
                    <span className="p-1 bg-orange-500/10 rounded-lg text-orange-400 shrink-0">4</span>
                    <span className="leading-tight"><b>Hilt-ViewModel-MVVM source code</b> matches production Android architectures!</span>
                  </div>
                </div>
              </div>

              {/* Realtime API diagnostics logger logs (Highly interactive geeky telemetry logs) */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[280px]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/45 border-b border-slate-800/60 font-mono text-[10px] tracking-wider text-slate-400 select-none">
                  <span>SKYCAST CONSOLE WORKSPACE RECON (TELEMETRY)</span>
                  <div className="flex items-center gap-1.5 animate-pulse text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>ACTIVE POLLING</span>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2.5 bg-slate-950/60 scrollbar-thin select-text">
                  {logs.map((log, idx) => {
                    const typeColors = {
                      info: 'text-sky-300',
                      success: 'text-emerald-400',
                      warn: 'text-amber-400',
                      error: 'text-rose-500 font-bold'
                    };
                    return (
                      <div key={idx} className="flex items-start gap-2.5 border-b border-white/5 pb-1.5 leading-snug">
                        <span className="text-slate-500 shrink-0">[{log.time}]</span>
                        <span className={typeColors[log.type]}>
                          {log.msg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: Android MVVM Kotlin Repository Files Explorer (Full Grid layout) */}
        {activeTab === 'code' && (
          <div className="col-span-12 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Android Jetpack Compose Code Hub
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect the precise Kotlin code files conforming to MVVM guidelines and Google Material Design 3 guidelines.
                </p>
              </div>
            </div>
            <CodeExplorer />
          </div>
        )}

        {/* TAB 3: Android Setup README Guidlines, release instructions & option lists */}
        {activeTab === 'guide' && (
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-xs select-text">
            {/* Play store release checklist panel */}
            <div className="md:col-span-5 bg-slate-900/95 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4 leading-relaxed">
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Google Play Store Release Checklist
                </h3>
              </div>
              
              <ul className="space-y-3.5 font-mono text-[11px] text-slate-300">
                <li className="flex gap-2.5 pb-2 border-b border-white/5">
                  <span className="text-emerald-400">✓</span>
                  <div>
                    <h5 className="font-semibold text-slate-200">Generate Keystore signing asset</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Generate a highly guarded upload.jks keystore to sign release App Bundles securely.</p>
                  </div>
                </li>
                <li className="flex gap-2.5 pb-2 border-b border-white/5">
                  <span className="text-emerald-400">✓</span>
                  <div>
                    <h5 className="font-semibold text-slate-200">Configure Proguard Optimization</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Integrate standard R8/Proguard rules on Jetpack Compose and Retrofit assemblies to compress resources.</p>
                  </div>
                </li>
                <li className="flex gap-2.5 pb-2 border-b border-white/5">
                  <span className="text-emerald-400">✓</span>
                  <div>
                    <h5 className="font-semibold text-slate-200">Audit Android App permissions</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Verify that GPS permissions are declared explicitly with accurate rationale models inside developer panels.</p>
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <span className="text-emerald-400">✓</span>
                  <div>
                    <h5 className="font-semibold text-slate-200">Compile signed Release AAB bundlers</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Run the Android Gradle task <i>shell_exec: ./gradlew bundleRelease</i> to produce the target release packages.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Android Studio Gradle run instructions */}
            <div className="md:col-span-7 bg-slate-900/95 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4 leading-relaxed">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Android Studio Complete Setup Guide
                </h3>
              </div>

              <div className="space-y-3.5 text-slate-300 text-xs font-mono bg-slate-950/70 p-4 border border-slate-800/40 rounded-xl">
                <div>
                  <h4 className="text-slate-100 font-semibold text-[13px] mb-1">1. Create a New Native Android Project</h4>
                  <p className="text-slate-400">Open Android Studio (Iguana / Hedgehog or later), click "<b>New Project</b>" & select "<b>Empty Activity (with Jetpack Compose)</b>". Set application namespace to <code>com.skycast.weather</code>.</p>
                </div>
                
                <div>
                  <h4 className="text-slate-100 font-semibold text-[13px] mb-1">2. Add Project Level Modules</h4>
                  <p className="text-slate-400">Match folders inside Android Studio with files found in the <b>Kotlin Project Explorer</b> tab of this dashboard! Paste Retrofit, ViewModel and View models cleanly.</p>
                </div>

                <div>
                  <h4 className="text-slate-100 font-semibold text-[13px] mb-1">3. Bind Dependencies in build.gradle.kts</h4>
                  <p className="text-slate-400">Include Retrofit, Gson converters, Location components, and Coroutines references in your dependencies section. Press "<b>Sync Project with Gradle Files</b>" inside Android Studio!</p>
                </div>

                <div>
                  <h4 className="text-slate-100 font-semibold text-[13px] mb-1">4. Execute and Compile</h4>
                  <p className="text-slate-400">Plug in your Android target device or boot up the virtual device Emulator. Press "<b>Run</b>" (Shift + F10) to initiate debugging sessions! Play with live weather forecast pulls.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern footer section */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-5 text-center text-[10px] font-mono text-slate-500 px-6">
        SkyCast Weather • Developed using Google AI Studio Build Node Workspaces
      </footer>
    </div>
  );
}
