let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

declare global {
  interface Window {
    google: any;
    _gmapsReady?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) { resolve(); return; }
    callbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    window._gmapsReady = () => {
      scriptLoaded = true;
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_gmapsReady`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export interface RouteData {
  polyline: string;
  distanceKm: number;
  durationMinutes: number;
}

export async function getRouteData(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
): Promise<RouteData | null> {
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';
  if (!apiKey) return null;
  await loadGoogleMaps(apiKey);
  return new Promise((resolve) => {
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (result: any, status: any) => {
        if (status === 'OK') {
          const leg = result.routes[0]?.legs[0];
          resolve({
            polyline: result.routes[0].overview_polyline.points,
            distanceKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
            durationMinutes: Math.round(leg.duration.value / 60),
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

export function buildGoogleMapsUrl(
  pickupAddress: string, deliveryAddress: string,
  pickupLat?: number | null, pickupLng?: number | null,
  deliveryLat?: number | null, deliveryLng?: number | null,
): string {
  const origin = pickupLat && pickupLng
    ? `${pickupLat},${pickupLng}`
    : encodeURIComponent(pickupAddress);
  const destination = deliveryLat && deliveryLng
    ? `${deliveryLat},${deliveryLng}`
    : encodeURIComponent(deliveryAddress);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}
