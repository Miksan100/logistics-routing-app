'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

interface Point { latitude: number; longitude: number; timestamp: string; }

// Decode Google encoded polyline format
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

interface RouteMapProps {
  points?: Point[];
  polyline?: string | null;
}

export default function RouteMap({ points = [], polyline }: RouteMapProps) {
  const gpsPositions: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
  const polylinePositions: [number, number][] = polyline ? decodePolyline(polyline) : [];
  // Prefer live GPS points if we have more than one; fall back to planned route polyline
  const positions = gpsPositions.length > 1 ? gpsPositions : polylinePositions;
  const isPlannedRoute = gpsPositions.length <= 1 && polylinePositions.length > 0;

  const center: [number, number] = positions.length > 0
    ? positions[0]
    : [-30.5595, 22.9375];

  return (
    <div className="space-y-2">
      {isPlannedRoute && (
        <p className="text-xs text-gray-400">Planned route — no live GPS was recorded for this job.</p>
      )}
      <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '12px' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {positions.length > 1 && (
          <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.8} />
        )}
        {gpsPositions.length > 0 && (
          <Marker position={gpsPositions[0]} icon={startIcon}>
            <Popup>Start — {new Date(points[0].timestamp).toLocaleTimeString()}</Popup>
          </Marker>
        )}
        {gpsPositions.length > 1 && (
          <Marker position={gpsPositions[gpsPositions.length - 1]} icon={endIcon}>
            <Popup>End — {new Date(points[points.length - 1].timestamp).toLocaleTimeString()}</Popup>
          </Marker>
        )}
        {isPlannedRoute && polylinePositions.length > 0 && (
          <>
            <Marker position={polylinePositions[0]} icon={startIcon}><Popup>Pickup</Popup></Marker>
            <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon}><Popup>Delivery</Popup></Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
