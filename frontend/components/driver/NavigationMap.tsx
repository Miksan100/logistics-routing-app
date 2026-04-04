'use client';
import { useEffect, useRef } from 'react';

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
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';

  useEffect(() => {
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
      });
    }
  }, [driverLat, driverLng]);

  function initMap() {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg default
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
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        }
      }
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-gray-200"
      style={{ height: '340px' }}
    />
  );
}
