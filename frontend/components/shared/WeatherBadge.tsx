'use client';
import { useEffect, useState } from 'react';
import { Cloud, Loader2 } from 'lucide-react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  iconUrl?: string;
}

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
  label?: string;
}

export default function WeatherBadge({ lat, lng, label }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';

  useEffect(() => {
    if (!lat || !lng || !apiKey) return;
    setLoading(true); setError(false); setWeather(null);
    fetch(
      `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`
    )
      .then((r) => r.json())
      .then((data) => {
        const c = data.currentConditions;
        if (!c) { setError(true); return; }
        setWeather({
          temperature: Math.round(c.temperature?.degrees ?? c.temperature ?? 0),
          feelsLike: Math.round(c.feelsLikeTemperature?.degrees ?? c.feelsLikeTemperature ?? 0),
          condition: c.weatherCondition?.description?.text ?? c.weatherCondition ?? '',
          humidity: Math.round(c.relativeHumidity ?? 0),
          windSpeed: Math.round(c.wind?.speed?.value ?? c.windSpeed ?? 0),
          iconUrl: c.weatherCondition?.iconBaseUri ? `${c.weatherCondition.iconBaseUri}4x.png` : undefined,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (!lat || !lng) return null;
  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
      <Loader2 className="w-3 h-3 animate-spin" /> Loading weather…
    </div>
  );
  if (error || !weather) return null;

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
