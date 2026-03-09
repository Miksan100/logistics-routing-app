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

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14);
    }
  }, [points, map]);
  return null;
}

export default function RouteMap({ points }: { points: Point[] }) {
  const positions = points.map((p) => [p.latitude, p.longitude] as [number, number]);
  const center: [number, number] = points.length > 0
    ? [points[0].latitude, points[0].longitude]
    : [-30.5595, 22.9375]; // South Africa default

  return (
    <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '12px' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {positions.length > 1 && <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.8} />}
      {points.length > 0 && (
        <Marker position={positions[0]} icon={startIcon}>
          <Popup>Start — {new Date(points[0].timestamp).toLocaleTimeString()}</Popup>
        </Marker>
      )}
      {points.length > 1 && (
        <Marker position={positions[positions.length - 1]} icon={endIcon}>
          <Popup>End — {new Date(points[points.length - 1].timestamp).toLocaleTimeString()}</Popup>
        </Marker>
      )}
      {points.length === 0 && (
        <></>
      )}
    </MapContainer>
  );
}
