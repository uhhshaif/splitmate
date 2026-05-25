'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem } from '@/lib/store';

// Fix Leaflet marker icon issue in Next.js/Webpack environment
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface TripMapProps {
  itinerary: ItineraryItem[];
}

export default function TripMap({ itinerary }: TripMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Filter items with valid coordinates
  const itemsWithCoords = itinerary.filter(
    (item): item is ItineraryItem & { coords: [number, number] } =>
      Array.isArray(item.coords) &&
      item.coords.length === 2 &&
      typeof item.coords[0] === 'number' &&
      typeof item.coords[1] === 'number'
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default center (Barcelona, fallback or first item coordinate)
    const defaultCenter: [number, number] = [41.3851, 2.1734];
    const initialCenter = itemsWithCoords.length > 0 ? itemsWithCoords[0].coords : defaultCenter;
    const initialZoom = itemsWithCoords.length > 0 ? 13 : 2;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    });

    mapRef.current = map;

    // Premium CartoDB Dark Matter tile layer for dark mode look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers and route line when itinerary coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear old route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (itemsWithCoords.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    // Custom emerald icon for map pins
    const emeraldIcon = L.divIcon({
      className: 'custom-emerald-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-8 w-8 animate-ping rounded-full bg-emerald-500/35 opacity-75"></div>
          <div class="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-[10px] font-black text-white shadow-lg border border-white/20">
            📌
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Create markers for each itinerary item
    itemsWithCoords.forEach((item, index) => {
      const { coords, activity, time, location } = item;
      latLngs.push(coords);

      const marker = L.marker(coords, { icon: emeraldIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 text-zinc-900 font-sans min-w-[150px]">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                ${time}
              </span>
            </div>
            <h4 class="font-extrabold text-sm text-zinc-900 leading-tight">${activity}</h4>
            ${location ? `<p class="text-xs text-zinc-500 mt-1 flex items-center gap-0.5">📍 ${location}</p>` : ''}
          </div>
        `, {
          closeButton: false,
          className: 'custom-leaflet-popup'
        });

      markersRef.current.push(marker);
    });

    // Draw routing/journey connection path
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#10b981', // emerald-500
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10',
        lineCap: 'round',
      }).addTo(map);

      routeLineRef.current = polyline;

      // Fit map bounds to encompass all pins
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 14);
    }
  }, [itinerary]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-950/20 shadow-inner">
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      
      {/* Global CSS injection for Leaflet customization */}
      <style jsx global>{`
        .leaflet-container {
          background: #09090b !important;
          font-family: inherit;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(0, 0, 0, 0.05);
          padding: 0 !important;
          overflow: hidden;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: #ffffff !important;
          box-shadow: none !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #18181b !important;
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-bar a:hover {
          background-color: #27272a !important;
          color: #10b981 !important;
        }
      `}</style>
    </div>
  );
}
