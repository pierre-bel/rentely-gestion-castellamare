import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { differenceInDays } from "date-fns";
import ListingPopupCard from "./ListingPopupCard";
import type { DateRange } from "react-day-picker";

interface SearchResultsMapProps {
  listings: any[];
  dateRange?: DateRange;
}

// Create a simple price badge marker using semantic tokens
const createPriceIcon = (price: number) =>
  L.divIcon({
    html: `
      <div style="
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        padding: 6px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 13px;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
      ">$${price}</div>
    `,
    className: "price-marker",
    iconSize: [60, 32],
    iconAnchor: [30, 16],
  });

const isValidCoord = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n);
};

const SearchResultsMap = ({ listings, dateRange }: SearchResultsMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [40.7128, -74.006], // default NYC
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      // Cleanup on unmount
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear previous markers
    markersLayerRef.current.clearLayers();

    // Filter listings with valid coordinates ONLY
    const withCoords = (listings || []).filter(
      (l) => isValidCoord(l.latitude) && isValidCoord(l.longitude)
    );

    // Add markers with custom popup card
    const bounds = L.latLngBounds([]);
    
    // Calculate nights for price display
    const nights = dateRange?.from && dateRange?.to 
      ? differenceInDays(dateRange.to, dateRange.from)
      : 0;
    
    withCoords.forEach((l) => {
      const lat = typeof l.latitude === "number" ? l.latitude : parseFloat(l.latitude);
      const lng = typeof l.longitude === "number" ? l.longitude : parseFloat(l.longitude);
      const basePrice = Number(l.base_price) || 0;
      
      // Show total price if dates selected, otherwise show per-night price
      const displayPrice = nights > 0 ? basePrice * nights : basePrice;

      const marker = L.marker([lat, lng], { icon: createPriceIcon(displayPrice) });

      // Create a div element for the popup content
      const popupDiv = document.createElement("div");
      
      // Render the React component into the div
      const root = createRoot(popupDiv);
      root.render(<ListingPopupCard listing={l} dateRange={dateRange} />);

      // Bind the popup with the React component
      marker.bindPopup(popupDiv, {
        maxWidth: 240,
        className: "listing-popup"
      });

      // Cleanup React root when marker is removed
      marker.on('remove', () => root.unmount());

      marker.addTo(markersLayerRef.current as L.LayerGroup);
      bounds.extend([lat, lng]);
    });

    // Fit map to markers if any, else set to a sensible default
    if (withCoords.length > 0) {
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
    } else {
      mapRef.current.setView([40.7128, -74.006], 11);
    }
  }, [listings, dateRange]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default SearchResultsMap;
