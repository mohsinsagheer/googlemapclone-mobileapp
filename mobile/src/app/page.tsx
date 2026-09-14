'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useMapStore } from '@/lib/map-store';
import SearchBar from '@/components/maps-ui/SearchBar';
import MapControls from '@/components/maps-ui/MapControls';
import CategoryChips from '@/components/maps-ui/CategoryChips';
import PlaceDetailsSheet from '@/components/maps-ui/PlaceDetailsSheet';
import DirectionsPanel from '@/components/maps-ui/DirectionsPanel';

// Leaflet needs window — load map client-side only
const MapView = dynamic(() => import('@/components/maps/MapView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#e8eaed]">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  const setUserLocation = useMapStore(s => s.setUserLocation);
  const setUserLocationLoading = useMapStore(s => s.setUserLocationLoading);
  const directionsMode = useMapStore(s => s.directionsMode);
  const selectedPlace = useMapStore(s => s.selectedPlace);

  // Try to get user location on first mount (best-effort, silent)
  useEffect(() => {
    if (!navigator.geolocation) return;
    setUserLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUserLocationLoading(false);
      },
      () => {
        // Silently fail — user will see default NYC view
        setUserLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, [setUserLocation, setUserLocationLoading]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#e8eaed]">
      <MapView />

      {/* Search bar — hidden in directions mode (DirectionsPanel has its own inputs) */}
      {!directionsMode && <SearchBar />}

      {/* Category chips */}
      <CategoryChips />

      {/* Floating map controls */}
      <MapControls />

      {/* Place details bottom sheet */}
      {!directionsMode && <PlaceDetailsSheet />}

      {/* Directions panel (overlay) */}
      <DirectionsPanel />

      {/* Bottom hint when nothing is selected (mobile only — small nudge) */}
      {!directionsMode && !selectedPlace && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-white/70 backdrop-blur px-2 py-0.5 rounded-full pointer-events-none lg:hidden">
          Tap a pin · search · or pick a category
        </div>
      )}
    </main>
  );
}
