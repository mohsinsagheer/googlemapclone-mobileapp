'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/lib/map-store';
import { CATEGORIES } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CategoryChips() {
  const {
    activeCategory,
    setActiveCategory,
    setNearbyPlaces,
    userLocation,
    flyToTarget,
    setSelectedPlace,
    directionsMode,
    searchResults,
    mapHandle,
    language,
  } = useMapStore();

  const scrollerRef = useRef<HTMLDivElement>(null);

  // Whenever a category is selected, fetch nearby POIs.
  // We re-run when nearbyTrigger changes to allow re-fetching even when other
  // dependencies (userLocation, mapHandle, language) haven't changed.
  const [nearbyTrigger, setNearbyTrigger] = useState(0);
  useEffect(() => {
    if (!activeCategory) {
      setNearbyPlaces([]);
      return;
    }
    const category = CATEGORIES.find(c => c.id === activeCategory);
    if (!category) return;

    // Determine the search center: prefer user location, fall back to map center,
    // fall back to a sane default (NYC).
    let center = userLocation;
    if (!center && mapHandle) {
      try {
        const c = mapHandle.getCenter();
        center = { lat: c.lat, lng: c.lng };
      } catch {
        // map not ready
      }
    }
    if (!center) {
      center = { lat: 40.7589, lng: -73.9851 }; // default to NYC
    }

    // IMPORTANT: use a ref so the cleanup function only cancels THIS run, not
    // subsequent runs triggered by state changes (which were causing the result
    // to be discarded — see `if (cancelled) return` below).
    const runId = Date.now() + Math.random();
    (window as any).__lastNearbyRun = { runId, activeCategory, center };
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          lat: String(center!.lat),
          lng: String(center!.lng),
          q: category.query,
          lang,
        });
        if (category.overpass && category.overpass.length > 0) {
          params.set('tags', category.overpass.join(','));
        }
        const res = await fetch(`/api/nearby?${params.toString()}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        // Always apply the result if the user is still on the same category.
        const currentActive = useMapStore.getState().activeCategory;
        if (currentActive !== activeCategory) return;
        if (Array.isArray(data)) {
          if (typeof window !== 'undefined') {
            (window as any).__lastNearbyCount = data.length;
          }
          setNearbyPlaces(data);
          if (data.length === 0) {
            toast.info(`No ${category.label.toLowerCase()} found nearby`);
          } else {
            flyToTarget({ lat: center!.lat, lng: center!.lng }, 15);
          }
        } else {
          toast.error(data.error || 'Could not load nearby places');
        }
      } catch (e) {
        if (!cancelled) {
          toast.error('Could not load nearby places');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, nearbyTrigger, userLocation, mapHandle, language, setNearbyPlaces, flyToTarget, setActiveCategory]);

  const handleChipClick = (id: string) => {
    if (activeCategory === id) {
      setActiveCategory(null);
    } else {
      setSelectedPlace(null);
      setActiveCategory(id);
      setNearbyTrigger(t => t + 1); // force re-fetch even on re-click
    }
  };

  // Hide chips in directions mode OR when search results are present
  if (directionsMode || searchResults.length > 0) return null;

  return (
    <div className="absolute left-0 right-0 top-[68px] sm:top-[76px] z-[900] pointer-events-none">
      <div
        ref={scrollerRef}
        className="flex gap-2 px-3 sm:px-4 overflow-x-auto no-scrollbar pointer-events-auto pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleChipClick(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition active:scale-95 shadow-sm',
                active
                  ? 'gm-chip-active text-white shadow-md'
                  : 'bg-white text-gray-800 hover:bg-gray-50'
              )}
              style={active ? { backgroundColor: cat.color } : undefined}
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
