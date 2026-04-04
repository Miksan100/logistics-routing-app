'use client';
import { useEffect, useState } from 'react';
import { Cloud, Loader2 } from 'lucide-react';

declare global { interface Window { google: any; _gmapsReady?: () => void; } }

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  iconUrl?: string;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  label?: string;
}

let sdkLoaded = typeof window !== 'undefined' && !!window.google?.maps;
let sdkLoading = false;
const sdkQueue: (() => void)[] = [];

function ensureSdk(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (sdkLoaded) { resolve(); return; }
    sdkQueue.push(resolve);
    if (sdkLoading) return;
    // SDK may already be loading from another module — wait for the callback
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      sdkLoading = true;
      const prev = window._gmapsReady;
      window._gmapsReady = () => {
        sdkLoaded = true;
        if (prev) prev();
        sdkQueue.forEach(cb => cb());
        sdkQueue.length = 0;
      };
      return;
    }
    sdkLoading = true;
    window._gmapsReady = () => {
      sdkLoaded = true;
      sdkQueue.forEach(cb => cb());
      sdkQueue.length = 0;
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_gmapsReady`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  });
}

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  await ensureSdk(apiKey);
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const r = await fetch(`${apiBase}/weather?lat=${lat}&lng=${lng}`, {
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? (sessionStorage.getItem('logistics_token') || sessionStorage.getItem('fl_vendor_token') || '') : ''}`,
    },
  });
  if (!r.ok) return null;
  const data = await r.json();
  const c = data.currentConditions;
  if (!c) return null;
  return {
    temperature: Math.round(c.temperature?.degrees ?? c.temperature ?? 0),
    feelsLike: Math.round(c.feelsLikeTemperature?.degrees ?? c.feelsLikeTemperature ?? 0),
    condition: c.weatherCondition?.description?.text ?? c.weatherCondition ?? '',
    humidity: Math.round(c.relativeHumidity ?? 0),
    windSpeed: Math.round(c.wind?.speed?.value ?? c.windSpeed ?? 0),
    iconUrl: c.weatherCondition?.iconBaseUri ? `${c.weatherCondition.iconBaseUri}4x.png` : undefined,
  };
}

export default function WeatherBadge({ lat, lng, address, label }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    setLoading(true); setWeather(null);

    (async () => {
      try {
        let resolvedLat = lat ?? null;
        let resolvedLng = lng ?? null;

        // Fall back to geocoding the address if no coordinates
        if ((!resolvedLat || !resolvedLng) && address) {
          const coords = await geocodeAddress(address, apiKey);
          if (coords) { resolvedLat = coords.lat; resolvedLng = coords.lng; }
        }

        if (!resolvedLat || !resolvedLng) return;
        const data = await fetchWeather(resolvedLat, resolvedLng);
        if (!cancelled) setWeather(data);
      } catch {
        // silently hide on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [lat, lng, address]);

  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
      <Loader2 className="w-3 h-3 animate-spin" /> Loading weather…
    </div>
  );
  if (!weather) return null;

  return (
    <div className="mt-2 flex items-center gap-2 p-2.5 bg-sky-50 border border-sky-100 rounded-lg">
      {weather.iconUrl ? (
        <img src={weather.iconUrl} alt={weather.condition} className="w-8 h-8" />
      ) : (
        <Cloud className="w-5 h-5 text-sky-400" />
      )}
      <div className="flex-1 min-w-0">
        {label && <p className="text-xs text-sky-600 font-medium mb-0.5">{label}</p>}
        <p className="text-sm font-semibold text-gray-800">{weather.temperature}°C — {weather.condition}</p>
        <p className="text-xs text-gray-500">Feels {weather.feelsLike}°C · {weather.humidity}% humidity · {weather.windSpeed} km/h wind</p>
      </div>
    </div>
  );
}
