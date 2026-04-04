'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Navigation } from 'lucide-react';

interface NavigationMapProps {
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  driverLat?: number | null;
  driverLng?: number | null;
}

interface DirectionStep {
  instructions: string;
  distance: string;
}

declare global {
  interface Window {
    google: any;
    initNavigationMap?: () => void;
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string, callback: () => void) {
  if (scriptLoaded) { callback(); return; }
  callbacks.push(callback);
  if (scriptLoading) return;
  scriptLoading = true;
  window.initNavigationMap = () => {
    scriptLoaded = true;
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
  };
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initNavigationMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default function NavigationMap({
  pickupAddress, deliveryAddress,
  pickupLat, pickupLng, deliveryLat, deliveryLng, driverLat, driverLng,
}: NavigationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [routeError, setRouteError] = useState('');
  const [steps, setSteps] = useState<DirectionStep[]>([]);
  const [routeSummary, setRouteSummary] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey) {
      setRouteError('Google Maps API key is not configured.');
      return;
    }
    loadGoogleMaps(apiKey, initMap);
    return () => {
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
    };
  }, []);

  // Update driver marker when position changes
  useEffect(() => {
    if (!mapInstanceRef.current || driverLat == null || driverLng == null) return;
    const pos = { lat: driverLat, lng: driverLng };
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: 'Your location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 10,
      });
    }
  }, [driverLat, driverLng]);

  function initMap() {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: -26.2041, lng: 28.0473 },
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
    });
    mapInstanceRef.current = map;

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 5 },
    });

    const origin = (pickupLat && pickupLng)
      ? { lat: pickupLat, lng: pickupLng }
      : pickupAddress;
    const destination = (deliveryLat && deliveryLng)
      ? { lat: deliveryLat, lng: deliveryLng }
      : deliveryAddress;

    directionsService.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (result: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteSummary(`${leg.distance?.text} · ${leg.duration?.text}`);
            setSteps(leg.steps.map((s: any) => ({
              instructions: s.instructions.replace(/<[^>]*>/g, ''),
              distance: s.distance?.text || '',
            })));
          }
        } else {
          const messages: Record<string, string> = {
            NOT_FOUND: 'One or more addresses could not be found. Check the job addresses.',
            ZERO_RESULTS: 'No driving route found between these addresses.',
            REQUEST_DENIED: 'Directions API request denied — check that billing is enabled in Google Cloud and the Directions API is active.',
            OVER_DAILY_LIMIT: 'Google Maps API daily limit reached.',
            OVER_QUERY_LIMIT: 'Google Maps API query limit reached.',
            INVALID_REQUEST: 'Invalid route request — addresses may be missing or malformed.',
          };
          setRouteError(messages[status] || `Could not load route (${status}).`);
        }
      }
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-gray-200"
        style={{ height: '300px' }}
      />

      {routeError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{routeError}</span>
        </div>
      )}

      {routeSummary && (
        <div className="flex items-center gap-2 px-1 text-sm text-gray-500">
          <Navigation className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-700">{routeSummary}</span>
        </div>
      )}

      {steps.length > 0 && (
        <div className="card divide-y divide-gray-100 !p-0 overflow-hidden">
          <p className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Turn-by-turn directions</p>
          <div className="max-h-48 overflow-y-auto">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">{step.instructions}</p>
                  {step.distance && <p className="text-xs text-gray-400 mt-0.5">{step.distance}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
