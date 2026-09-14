'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '@/lib/map-store';
import { createPinIcon, createUserLocationIcon, createRouteEndpointIcon } from '@/lib/marker-icons';
import { CATEGORIES } from '@/lib/categories';
import { SearchResult } from '@/lib/map-types';

// Fix default marker icon path (we use custom icons anyway, but this avoids console errors)
delete (L.Icon.Default.prototype as any)._getIconUrl;

const TILE_LAYERS = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    labels: false,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    labels: true, // overlay place labels on top
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    labels: false,
  },
  hybrid: {
    // Same as satellite but we keep the constant labels overlay
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    labels: true,
  },
} as const;

// Esri reference layer that draws boundaries + place labels on top of satellite imagery
const LABELS_OVERLAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function MapEffects() {
  const map = useMap();
  const flyTo = useMapStore(s => s.flyTo);
  const flyToZoom = useMapStore(s => s.flyToZoom);
  const clearFlyTo = useMapStore(s => s.clearFlyTo);
  const setSelectedPlace = useMapStore(s => s.setSelectedPlace);
  const setMapHandle = useMapStore(s => s.setMapHandle);

  useEffect(() => {
    setMapHandle(map);
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setMapHandle(null);
    };
  }, [map, setMapHandle]);

  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], flyToZoom ?? Math.max(map.getZoom(), 14), {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      const t = setTimeout(() => clearFlyTo(), 1300);
      return () => clearTimeout(t);
    }
  }, [flyTo, flyToZoom, map, clearFlyTo]);

  useMapEvents({
    click: () => {
      setSelectedPlace(null);
    },
  });

  return null;
}

export default function MapView() {
  const layer = useMapStore(s => s.layer);
  const userLocation = useMapStore(s => s.userLocation);
  const selectedPlace = useMapStore(s => s.selectedPlace);
  const setSelectedPlace = useMapStore(s => s.setSelectedPlace);
  const flyToTarget = useMapStore(s => s.flyToTarget);
  const nearbyPlaces = useMapStore(s => s.nearbyPlaces);
  const searchResults = useMapStore(s => s.searchResults);
  const activeCategory = useMapStore(s => s.activeCategory);
  const route = useMapStore(s => s.route);
  const origin = useMapStore(s => s.origin);
  const destination = useMapStore(s => s.destination);
  const directionsMode = useMapStore(s => s.directionsMode);

  const mapRef = useRef<L.Map | null>(null);

  const tileConfig = TILE_LAYERS[layer];
  const showLabelsOverlay = tileConfig.labels;

  const initialCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [40.7589, -73.9851];

  const handleMarkerClick = (place: SearchResult) => {
    setSelectedPlace(place);
  };

  // Click on user location marker → zoom in maximally to see it clearly
  const handleUserLocationClick = () => {
    if (userLocation) {
      flyToTarget(userLocation, 18);
    }
  };

  // Click on route endpoint → zoom in to show context
  const handleEndpointClick = (place: SearchResult | null) => {
    if (place) {
      flyToTarget({ lat: place.lat, lng: place.lng }, 17);
    }
  };

  let poisToShow: SearchResult[] = [];
  if (!directionsMode) {
    if (searchResults.length > 0) {
      poisToShow = searchResults;
    } else if (activeCategory && nearbyPlaces.length > 0) {
      poisToShow = nearbyPlaces;
    }
  }

  const categoryConfig = activeCategory
    ? CATEGORIES.find(c => c.id === activeCategory)
    : null;

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      zoomControl={false}
      attributionControl
      className="h-full w-full"
      ref={(m) => {
        if (m) mapRef.current = m;
      }}
    >
      <TileLayer
        key={layer}
        url={tileConfig.url}
        attribution={tileConfig.attribution}
        maxZoom={tileConfig.maxZoom}
      />

      {/* Labels overlay for satellite / hybrid so users can still see place names */}
      {showLabelsOverlay && (
        <TileLayer
          key={`labels-${layer}`}
          url={LABELS_OVERLAY_URL}
          attribution="Labels &copy; Esri"
          maxZoom={19}
          opacity={0.9}
        />
      )}

      <MapEffects />

      {/* User location — clickable to zoom in */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={createUserLocationIcon()}
          zIndexOffset={1000}
          eventHandlers={{
            click: handleUserLocationClick,
          }}
        />
      )}

      {/* POI markers */}
      {!directionsMode &&
        poisToShow.map((place) => {
          const isSel = selectedPlace?.id === place.id;
          const color = categoryConfig?.color || '#ea4335';
          const emoji = categoryConfig?.emoji || '📍';
          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createPinIcon(color, emoji, isSel)}
              zIndexOffset={isSel ? 500 : 0}
              eventHandlers={{
                click: () => handleMarkerClick(place),
              }}
            />
          );
        })}

      {/* Standalone selected place marker (e.g. user picked a search result that's not in poisToShow) */}
      {!directionsMode && selectedPlace && !poisToShow.find(p => p.id === selectedPlace.id) && (
        <Marker
          position={[selectedPlace.lat, selectedPlace.lng]}
          icon={createPinIcon('#ea4335', '📍', true)}
          zIndexOffset={500}
          eventHandlers={{
            click: () => handleMarkerClick(selectedPlace),
          }}
        />
      )}

      {/* Route polyline (white outline + blue main line) */}
      {route && route.geometry.length > 0 && (
        <>
          <Polyline
            positions={route.geometry}
            pathOptions={{
              color: 'white',
              weight: 9,
              opacity: 1,
              className: 'gm-route-line',
            }}
          />
          <Polyline
            positions={route.geometry}
            pathOptions={{
              color: '#1a73e8',
              weight: 6,
              opacity: 1,
              className: 'gm-route-line',
            }}
          />
        </>
      )}

      {/* Directions endpoints — clickable to zoom in */}
      {directionsMode && origin && (
        <Marker
          position={[origin.lat, origin.lng]}
          icon={createRouteEndpointIcon('origin')}
          eventHandlers={{
            click: () => handleEndpointClick(origin),
          }}
        />
      )}
      {directionsMode && destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={createRouteEndpointIcon('destination')}
          eventHandlers={{
            click: () => handleEndpointClick(destination),
          }}
        />
      )}
    </MapContainer>
  );
}
