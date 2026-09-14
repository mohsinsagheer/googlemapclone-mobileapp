'use client';

import { create } from 'zustand';
import { LatLng, SearchResult, RouteInfo, TravelMode, SavedPlace, MapLayerType, LanguagePreference } from './map-types';

interface MapState {
  // user location
  userLocation: LatLng | null;
  userLocationLoading: boolean;
  userLocationError: string | null;
  setUserLocation: (loc: LatLng | null) => void;
  setUserLocationLoading: (loading: boolean) => void;
  setUserLocationError: (err: string | null) => void;

  // map layer
  layer: MapLayerType;
  setLayer: (l: MapLayerType) => void;

  // language preference for place names
  language: LanguagePreference;
  setLanguage: (l: LanguagePreference) => void;
  toggleLanguage: () => void;

  // selected place (place details panel)
  selectedPlace: SearchResult | null;
  setSelectedPlace: (p: SearchResult | null) => void;

  // search query and results
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (r: SearchResult[]) => void;
  searching: boolean;
  setSearching: (b: boolean) => void;

  // nearby POIs (for category chips)
  nearbyPlaces: SearchResult[];
  setNearbyPlaces: (p: SearchResult[]) => void;
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;

  // directions mode
  directionsMode: boolean;
  setDirectionsMode: (b: boolean) => void;
  origin: SearchResult | null;
  setOrigin: (o: SearchResult | null) => void;
  destination: SearchResult | null;
  setDestination: (d: SearchResult | null) => void;
  travelMode: TravelMode;
  setTravelMode: (m: TravelMode) => void;
  route: RouteInfo | null;
  setRoute: (r: RouteInfo | null) => void;
  routeLoading: boolean;
  setRouteLoading: (b: boolean) => void;

  // saved places
  savedPlaces: SavedPlace[];
  toggleSavedPlace: (p: SearchResult) => void;
  isSaved: (id: string) => boolean;

  // view helper — fly to a coordinate (broadcast to map)
  flyTo: LatLng | null;
  flyToZoom: number | null;
  flyToTarget: (loc: LatLng, zoom?: number) => void;
  clearFlyTo: () => void;

  // imperative map handle (set once MapContainer mounts)
  mapHandle: any | null;
  setMapHandle: (m: any | null) => void;

  // imperative zoom controls
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
}

const STORAGE_KEY = 'gm-clone-saved-places';

function loadSaved(): SavedPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPlace[]) : [];
  } catch {
    return [];
  }
}

function persistSaved(places: SavedPlace[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // ignore
  }
}

export const useMapStore = create<MapState>((set, get) => ({
  userLocation: null,
  userLocationLoading: false,
  userLocationError: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  setUserLocationLoading: (loading) => set({ userLocationLoading: loading }),
  setUserLocationError: (err) => set({ userLocationError: err }),

  layer: 'default',
  setLayer: (l) => set({ layer: l }),

  language: 'en',
  setLanguage: (l) => set({ language: l }),
  toggleLanguage: () => set((s) => ({ language: s.language === 'en' ? 'local' : 'en' })),

  selectedPlace: null,
  setSelectedPlace: (p) => set({ selectedPlace: p }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchResults: [],
  setSearchResults: (r) => set({ searchResults: r }),
  searching: false,
  setSearching: (b) => set({ searching: b }),

  nearbyPlaces: [],
  setNearbyPlaces: (p) => {
    if (typeof window !== 'undefined') (window as any).__lastNearbyCount = p.length;
    set({ nearbyPlaces: p });
  },
  activeCategory: null,
  setActiveCategory: (id) => set({ activeCategory: id }),

  directionsMode: false,
  setDirectionsMode: (b) => set({ directionsMode: b }),
  origin: null,
  setOrigin: (o) => set({ origin: o }),
  destination: null,
  setDestination: (d) => set({ destination: d }),
  travelMode: 'driving',
  setTravelMode: (m) => set({ travelMode: m }),
  route: null,
  setRoute: (r) => set({ route: r }),
  routeLoading: false,
  setRouteLoading: (b) => set({ routeLoading: b }),

  savedPlaces: loadSaved(),
  toggleSavedPlace: (p) => {
    const current = get().savedPlaces;
    const existing = current.find(sp => sp.id === p.id);
    let next: SavedPlace[];
    if (existing) {
      next = current.filter(sp => sp.id !== p.id);
    } else {
      next = [{ ...p, savedAt: Date.now() }, ...current];
    }
    persistSaved(next);
    set({ savedPlaces: next });
  },
  isSaved: (id) => get().savedPlaces.some(sp => sp.id === id),

  flyTo: null,
  flyToZoom: null,
  flyToTarget: (loc, zoom) => set({ flyTo: loc, flyToZoom: zoom ?? null }),
  clearFlyTo: () => set({ flyTo: null, flyToZoom: null }),

  mapHandle: null,
  setMapHandle: (m) => {
    if (typeof window !== 'undefined') (window as any).__mapHandle = m;
    set({ mapHandle: m });
  },

  zoomIn: () => {
    const m = get().mapHandle;
    if (m) m.zoomIn();
  },
  zoomOut: () => {
    const m = get().mapHandle;
    if (m) m.zoomOut();
  },
  resetNorth: () => {
    const m = get().mapHandle;
    if (m) {
      // reset bearing to 0
      try { m.setBearing?.(0); } catch { /* not supported */ }
    }
  },
}));
