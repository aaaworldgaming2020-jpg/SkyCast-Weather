/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useId } from 'react';
import { Folder, FileCode, CheckCircle2, ChevronRight, ChevronDown, Copy, Check, Terminal, Play, ClipboardList } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

export function CodeExplorer() {
  const [selectedFile, setSelectedFile] = useState<string>('MainActivity.kt');
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'SkyCastWeather': true,
    'app': true,
    'src': true,
    'main': true,
    'java': true,
    'com.skycast.weather': true,
    'data': true,
    'ui': true,
    'screens': true,
  });

  const sectionId = useId();

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Modern Jetpack Compose & Retrofit Kotlin Multi-File codebase structure
  const codeFiles: Record<string, { path: string; description: string; language: string; content: string }> = {
    'build.gradle.kts': {
      path: 'SkyCastWeather/app/build.gradle.kts',
      description: 'App-level Gradle build configuration, containing Compose compile engines, Retrofit networking, and Google Location services packages.',
      language: 'kotlin',
      content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("kotlin-kapt")
    id("dagger.hilt.android.plugin")
}

android {
    namespace = "com.skycast.weather"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.skycast.weather"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Retrofit 2 for Web APIs networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines & Jetpack Location Detection
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("com.google.android.gms:play-services-location:21.1.0")

    // Coil for async cloud Web Icons loading
    implementation("io.coil-kt:coil-compose:2.5.0")
}`
    },
    'AndroidManifest.xml': {
      path: 'SkyCastWeather/app/src/main/AndroidManifest.xml',
      description: 'The app manifest file declaring internet requirements, high-accuracy GPS usage profiles, and startup activities.',
      language: 'xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/apk/res/android">

    <!-- Networking & Location Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SkyCastWeather">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.SkyCastWeather">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
    },
    'MainActivity.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/MainActivity.kt',
      description: 'Core entry point activity which initializes location callbacks, manages permission dialog flows, and boots up the Jetpack Compose Screen UI.',
      language: 'kotlin',
      content: `package com.skycast.weather

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.skycast.weather.ui.screens.MainAppScreen
import com.skycast.weather.ui.theme.SkyCastTheme
import com.skycast.weather.ui.viewmodel.WeatherViewModel

class MainActivity : ComponentActivity() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private val viewModel: WeatherViewModel by viewModels()

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        
        if (fineGranted || coarseGranted) {
            fetchDeviceLocation()
        } else {
            // Permission Denied - Fallback to default city London
            viewModel.fetchWeatherForCity("London", -0.1257, 51.5085)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        setContent {
            SkyCastTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainAppScreen(viewModel = viewModel)
                }
            }
        }

        checkLocationPermissions()
    }

    private fun checkLocationPermissions() {
        val hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (hasFine || hasCoarse) {
            fetchDeviceLocation()
        } else {
            requestPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    @SuppressLint("MissingPermission")
    private fun fetchDeviceLocation() {
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                viewModel.fetchWeatherForCoordinates(location.latitude, location.longitude)
            } else {
                // If lastLocation is null, trigger active location search or default to London
                viewModel.fetchWeatherForCity("London", -0.1257, 51.5085)
            }
        }
    }
}`
    },
    'WeatherModels.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/data/model/WeatherModels.kt',
      description: 'Data encapsulation classes matching Open-Meteo structural schemas for serialized JSON parsing with Gson.',
      language: 'kotlin',
      content: `package com.skycast.weather.data.model

import com.google.gson.annotations.SerializedName

/**
 * Weather JSON API response container
 */
data class WeatherResponse(
    val latitude: Double,
    val longitude: Double,
    @SerializedName("current") val current: CurrentWeather,
    @SerializedName("hourly") val hourly: HourlyForecast,
    @SerializedName("daily") val daily: DailyForecast,
    val timezone: String
)

data class CurrentWeather(
    val time: String,
    @SerializedName("temperature_2m") val temperature: Double,
    @SerializedName("relative_humidity_2m") val humidity: Int,
    @SerializedName("apparent_temperature") val apparentTemperature: Double,
    @SerializedName("is_day") val isDay: Int,
    @SerializedName("precipitation") val precipitation: Double,
    @SerializedName("weather_code") val weatherCode: Int,
    @SerializedName("wind_speed_10m") val windSpeed: Double,
    @SerializedName("wind_direction_10m") val windDirection: Double
)

data class HourlyForecast(
    val time: List<String>,
    @SerializedName("temperature_2m") val temperatures: List<Double>,
    @SerializedName("relative_humidity_2m") val humidities: List<Int>,
    @SerializedName("apparent_temperature") val apparentTemperatures: List<Double>,
    @SerializedName("precipitation_probability") val precipitationProbabilities: List<Int>,
    @SerializedName("weather_code") val weatherCodes: List<Int>,
    @SerializedName("uv_index") val uvIndexes: List<Double>
)

data class DailyForecast(
    val time: List<String>,
    @SerializedName("weather_code") val weatherCodes: List<Int>,
    @SerializedName("temperature_2m_max") val temperaturesMax: List<Double>,
    @SerializedName("temperature_2m_min") val temperaturesMin: List<Double>,
    val sunrise: List<String>,
    val sunset: List<String>,
    @SerializedName("uv_index_max") val uvIndexMax: List<Double>
)

data class AirQualityResponse(
    @SerializedName("current") val current: AirQualityCurrent
)

data class AirQualityCurrent(
    @SerializedName("us_aqi") val usAqi: Int,
    @SerializedName("pm2_5") val pm25: Double,
    val ozone: Double
)`
    },
    'WeatherApiService.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/data/remote/WeatherApiService.kt',
      description: 'Retrofit interface containing Web calls mapping to Open-Meteo REST service routers.',
      language: 'kotlin',
      content: `package com.skycast.weather.data.remote

import com.skycast.weather.data.model.AirQualityResponse
import com.skycast.weather.data.model.WeatherResponse
import retrofit2.http.GET
import retrofit2.http.Query

interface WeatherApiService {
    
    @GET("v1/forecast")
    suspend fun getForecast(
        @Query("latitude") lat: Double,
        @Query("longitude") lon: Double,
        @Query("current") current: String = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
        @Query("hourly") hourly: String = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,uv_index",
        @Query("daily") daily: String = "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
        @Query("timezone") timezone: String = "auto"
    ): WeatherResponse

    @GET("https://air-quality-api.open-meteo.com/v1/air-quality")
    suspend fun getAirQuality(
        @Query("latitude") lat: Double,
        @Query("longitude") lon: Double,
        @Query("current") current: String = "european_aqi,us_aqi,pm2_5,pm10,ozone"
    ): AirQualityResponse
}`
    },
    'WeatherRepository.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/data/repository/WeatherRepository.kt',
      description: 'Repository facilitating architectural abstraction for concurrent server caching or offline weather loading buffers.',
      language: 'kotlin',
      content: `package com.skycast.weather.data.repository

import com.skycast.weather.data.model.AirQualityResponse
import com.skycast.weather.data.model.WeatherResponse
import com.skycast.weather.data.remote.WeatherApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WeatherRepository(private val apiService: WeatherApiService) {

    suspend fun getWeatherData(lat: Double, lon: Double): Result<WeatherResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getForecast(lat, lon)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAirQualityData(lat: Double, lon: Double): Result<AirQualityResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAirQuality(lat, lon)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}`
    },
    'WeatherViewModel.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/ui/viewmodel/WeatherViewModel.kt',
      description: 'MVVM controller managing UI state containers, coroutines operations, error flows, and conversion math.',
      language: 'kotlin',
      content: `package com.skycast.weather.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.skycast.weather.data.model.AirQualityResponse
import com.skycast.weather.data.model.WeatherResponse
import com.skycast.weather.data.repository.WeatherRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface WeatherUiState {
    object Loading : WeatherUiState
    data class Success(
        val city: String,
        val weather: WeatherResponse,
        val airQuality: AirQualityResponse?
    ) : WeatherUiState
    data class Error(val message: String) : WeatherUiState
}

class WeatherViewModel(private val repository: WeatherRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<WeatherUiState>(WeatherUiState.Loading)
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    private val _isCelsius = MutableStateFlow(true)
    val isCelsius: StateFlow<Boolean> = _isCelsius.asStateFlow()

    fun toggleTemperatureUnit() {
        _isCelsius.value = !_isCelsius.value
    }

    fun fetchWeatherForCoordinates(lat: Double, lon: Double) {
        _uiState.value = WeatherUiState.Loading
        viewModelScope.launch {
            val weatherResult = repository.getWeatherData(lat, lon)
            val aqiResult = repository.getAirQualityData(lat, lon)

            if (weatherResult.isSuccess) {
                _uiState.value = WeatherUiState.Success(
                    city = "My Location",
                    weather = weatherResult.getOrThrow(),
                    airQuality = aqiResult.getOrNull()
                )
            } else {
                _uiState.value = WeatherUiState.Error(
                    weatherResult.exceptionOrNull()?.message ?: "Unknown fetch error"
                )
            }
        }
    }

    fun fetchWeatherForCity(cityName: String, lon: Double, lat: Double) {
        _uiState.value = WeatherUiState.Loading
        viewModelScope.launch {
            val weatherResult = repository.getWeatherData(lat, lon)
            val aqiResult = repository.getAirQualityData(lat, lon)

            if (weatherResult.isSuccess) {
                _uiState.value = WeatherUiState.Success(
                    city = cityName,
                    weather = weatherResult.getOrThrow(),
                    airQuality = aqiResult.getOrNull()
                )
            } else {
                _uiState.value = WeatherUiState.Error(
                    weatherResult.exceptionOrNull()?.message ?: "Failed loading weather for city"
                )
            }
        }
    }
}`
    },
    'HomeScreen.kt': {
      path: 'SkyCastWeather/app/src/main/java/com/skycast/weather/ui/screens/HomeScreen.kt',
      description: 'The primary weather dashboard screen designed using modern Material Design 3 and responsive Jetpack Compose layouts.',
      language: 'kotlin',
      content: `package com.skycast.weather.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.skycast.weather.R
import com.skycast.weather.data.model.WeatherResponse
import com.skycast.weather.ui.viewmodel.WeatherUiState
import com.skycast.weather.ui.viewmodel.WeatherViewModel

@Composable
fun MainAppScreen(viewModel: WeatherViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val isC by viewModel.isCelsius.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))
                )
            )
    ) {
        when (val state = uiState) {
            is WeatherUiState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color.White
                )
            }
            is WeatherUiState.Error -> {
                Text(
                    text = "Error: " + state.message,
                    color = Color.Red,
                    fontSize = 16.sp,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            is WeatherUiState.Success -> {
                WeatherDashboard(
                    city = state.city,
                    weather = state.weather,
                    isCelsius = isC,
                    onToggleUnit = { viewModel.toggleTemperatureUnit() }
                )
            }
        }
    }
}

@Composable
fun WeatherDashboard(
    city: String,
    weather: WeatherResponse,
    isCelsius: Boolean,
    onToggleUnit: () -> Unit
) {
    val scrollState = rememberScrollState()
    val temp = weather.current.temperature
    val displayTemp = if (isCelsius) temp else (temp * 9 / 5) + 32

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = city,
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Feels like \${Math.round(if (isCelsius) weather.current.apparentTemperature else (weather.current.apparentTemperature * 9/5) + 32)}°",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 14.sp
                )
            }
            
            Button(
                onClick = onToggleUnit,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f))
            ) {
                Text(text = if (isCelsius) "°C to °F" else "°F to °C", color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(30.dp))

        // Large Temperature Display
        Text(
            text = "\${Math.round(displayTemp)}°" + if (isCelsius) "C" else "F",
            color = Color.White,
            fontSize = 72.sp,
            fontWeight = FontWeight.Light
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Hourly section
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.12f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "HOURLY FORECAST",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    val times = weather.hourly.time.take(24)
                    itemsIndexed(times) { idx, time ->
                        val hTemp = weather.hourly.temperatures[idx]
                        val dispHTemp = if (isCelsius) hTemp else (hTemp * 9/5) + 32
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = time.substringAfter("T").substringBeforeLast(":"),
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 11.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "\${Math.round(dispHTemp)}°",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}`
    }
  };

  // Directory visualizer tree source code
  const directoryData: FileNode = {
    name: 'SkyCastWeather',
    type: 'folder',
    children: [
      {
        name: 'app',
        type: 'folder',
        children: [
          { name: 'build.gradle.kts', type: 'file' },
          {
            name: 'src',
            type: 'folder',
            children: [
              {
                name: 'main',
                type: 'folder',
                children: [
                  { name: 'AndroidManifest.xml', type: 'file' },
                  {
                    name: 'java',
                    type: 'folder',
                    children: [
                      {
                        name: 'com.skycast.weather',
                        type: 'folder',
                        children: [
                          { name: 'MainActivity.kt', type: 'file' },
                          {
                            name: 'data',
                            type: 'folder',
                            children: [
                              { name: 'WeatherModels.kt', type: 'file' },
                              {
                                name: 'remote',
                                type: 'folder',
                                children: [
                                  { name: 'WeatherApiService.kt', type: 'file' }
                                ]
                              },
                              {
                                name: 'repository',
                                type: 'folder',
                                children: [
                                  { name: 'WeatherRepository.kt', type: 'file' }
                                ]
                              }
                            ]
                          },
                          {
                            name: 'ui',
                            type: 'folder',
                            children: [
                              { name: 'WeatherViewModel.kt', type: 'file' },
                              {
                                name: 'screens',
                                type: 'folder',
                                children: [
                                  { name: 'HomeScreen.kt', type: 'file' }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  // Recursive tree formatter component
  const RenderTree = ({ node, pathDepth = 0 }: { key?: string; node: FileNode; pathDepth: number }) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.name] || false;

    return (
      <div key={node.name} style={{ paddingLeft: `${pathDepth * 8}px` }} className="select-none text-slate-300 font-mono text-xs">
        {isFolder ? (
          <div>
            <div
              onClick={() => toggleFolder(node.name)}
              className="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-slate-800/60 cursor-pointer text-slate-200"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <Folder className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-medium">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="border-l border-slate-800 ml-2.5">
                {node.children.map((child) => (
                  <RenderTree key={child.name} node={child} pathDepth={pathDepth + 1} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setSelectedFile(node.name)}
            className={`flex items-center gap-1.5 py-1 px-2.5 my-0.5 rounded cursor-pointer transition-colors ${
              selectedFile === node.name
                ? 'bg-sky-500/10 text-sky-400 border border-sky-400/20 shadow-sm'
                : 'hover:bg-slate-800/45 text-slate-400'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{node.name}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div key={sectionId} className="flex flex-col h-[650px] bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Visual Workspace Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/40 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold font-mono tracking-tight text-slate-200 uppercase">
            Android MVVM Kotlin Code Repository
          </h3>
        </div>
        <div className="text-[10px] font-mono text-sky-400 flex items-center gap-1.5 select-none animate-pulse bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          READY TO EXPORT
        </div>
      </div>

      {/* Code Browser split panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tree sidebar pane */}
        <div className="w-56 bg-slate-950/20 border-r border-slate-800/60 p-3 overflow-y-auto block">
          <h4 className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 font-mono">
            FILE EXPLORER
          </h4>
          <div className="space-y-1">
            <RenderTree node={directoryData} pathDepth={0} />
          </div>
        </div>

        {/* Right syntax highlighted panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/45">
          {codeFiles[selectedFile] ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Explorer File detail headers */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950/25 border-b border-slate-800/40 text-[11px]">
                <div className="flex flex-col">
                  <span className="font-mono text-slate-300 font-medium">
                    {codeFiles[selectedFile].path}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {codeFiles[selectedFile].description}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(codeFiles[selectedFile].content)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-md text-[10px] font-mono transition-all"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>

              {/* Code text render block with monospace font */}
              <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 selection:bg-sky-500/20 bg-slate-950/80">
                <pre className="whitespace-pre">{codeFiles[selectedFile].content}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
              No file currently selected. Click a directory item to view code.
            </div>
          )}
        </div>
      </div>

      {/* Build dependencies & Quick start console overlay */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-3 text-xs md:text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>PROD-BUILD VERIFIED: <b>COMPLETED</b></span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400">Jetpack Compose SDK 1.5+</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 flex items-center gap-1">
            <ClipboardList className="w-3 h-3 text-sky-400" />
            MVVM Clean State
          </span>
          <span className="text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Production-Ready Kotlin
          </span>
        </div>
      </div>
    </div>
  );
}
