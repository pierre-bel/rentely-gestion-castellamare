import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Home } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

// Custom home icon marker
const createHomeIcon = () => {
  const homeIconSvg = renderToString(
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#143F3E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      <Home color="white" size={20} />
    </div>
  );

  return L.divIcon({
    html: homeIconSvg,
    className: 'custom-home-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const LocationMap = ({ latitude, longitude }: LocationMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map ONCE on mount
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Create map with zoom controls
    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([latitude, longitude], 15);
    mapRef.current = map;

    // Add CartoDB Voyager tile layer for clean, light appearance
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Add custom marker
    const homeIcon = createHomeIcon();
    const marker = L.marker([latitude, longitude], { icon: homeIcon }).addTo(map);
    markerRef.current = marker;

    // Cleanup ONLY on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, []); // Empty array = runs once on mount

  // Update map view and marker position when coordinates change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    const newLatLng: L.LatLngExpression = [latitude, longitude];

    // Update map view with smooth animation
    mapRef.current.setView(newLatLng, 15, { animate: true });

    // Update marker position
    markerRef.current.setLatLng(newLatLng);
  }, [latitude, longitude]);

  return (
    <div className="relative z-0 rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <div 
        ref={mapContainerRef} 
        style={{ height: '360px', width: '100%' }}
      />
    </div>
  );
};

export default LocationMap;
