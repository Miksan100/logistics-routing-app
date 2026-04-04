'use client';
import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

declare global {
  interface Window { google: any; _gmapsReady?: () => void; }
}

let sdkLoaded = false;
let sdkLoading = false;
const sdkCallbacks: (() => void)[] = [];

function loadSdk(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (sdkLoaded) { resolve(); return; }
    sdkCallbacks.push(resolve);
    if (sdkLoading) return;
    sdkLoading = true;
    window._gmapsReady = () => {
      sdkLoaded = true;
      sdkCallbacks.forEach(cb => cb());
      sdkCallbacks.length = 0;
    };
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener('load', () => { sdkLoaded = true; sdkCallbacks.forEach(cb => cb()); sdkCallbacks.length = 0; }); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_gmapsReady`;
    script.async = true; script.defer = true;
    document.head.appendChild(script);
  });
}

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  label: string;
  value: string;
  details: string;
  onSelect: (result: PlaceResult) => void;
  onDetailsChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}

export default function AddressAutocomplete({ label, value, details, onSelect, onDetailsChange, required, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';

  useEffect(() => {
    loadSdk(apiKey).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry'],
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place?.geometry?.location && place.formatted_address) {
        onSelect({
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });
    autocompleteRef.current = ac;
  }, [ready]);

  return (
    <div className="space-y-2">
      <label className="label">{label}{required && ' *'}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="input-field pl-9"
          defaultValue={value}
          required={required}
          placeholder={placeholder || 'Search for an address…'}
          autoComplete="off"
        />
      </div>
      <input
        className="input-field text-sm"
        placeholder="Unit, complex, building, floor (optional)"
        value={details}
        onChange={(e) => onDetailsChange(e.target.value)}
      />
    </div>
  );
}
