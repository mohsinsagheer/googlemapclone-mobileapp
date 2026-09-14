import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LatLng,
  SearchResult,
  RouteInfo,
  TravelMode,
  SavedPlace,
  MapLayerType,
  LanguagePreference,
} from '../types/map-types';

const STORAGE_KEY = '@map_app_saved_places';

interface MapState {
  // User location
  userLocation: LatLng | null;
  userLocationLoading: boolean;
  userLocationError: string | null;
  setUserLocation: (loc: LatLng | null) => void;
  setUserLocationLoading: (loading: boolean) => void;
  setUserLocationError: (err: string | null) => void;

  // Current map camera center (updated on pan/zoom)
  mapCenter: LatLng;
  setMapCenter: (loc: LatLng) => void;

  // Map layer
  layer: MapLayerType;
  setLayer: (l: MapLayerType) => void;

  // Language preference
  language: LanguagePreference;
  setLanguage: (l: LanguagePreference) => void;
  toggleLanguage: () => void;

  // Selected place
  selectedPlace: SearchResult | null;
  setSelectedPlace: (p: SearchResult | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (r: SearchResult[]) => void;
  searching: boolean;
  setSearching: (b: boolean) => void;

  // Nearby POIs
  nearbyPlaces: SearchResult[];
  setNearbyPlaces: (p: SearchResult[]) => void;
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
  nearbyLoading: boolean;
  setNearbyLoading: (b: boolean) => void;

  // Directions
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

  // Saved Places
  savedPlaces: SavedPlace[];
  savedPlacesModalVisible: boolean;
  setSavedPlacesModalVisible: (b: boolean) => void;
  loadSavedPlaces: () => Promise<void>;
  toggleSavedPlace: (p: SearchResult) => Promise<void>;
  isSaved: (id: string) => boolean;

  // Camera flyTo
  flyTo: LatLng | null;
  flyToZoom: number | null;
  flyToTarget: (loc: LatLng, zoom?: number) => void;
  clearFlyTo: () => void;

  // Imperative zoom/reset triggers
  zoomTrigger: number; // increment to trigger zoom in
  zoomOutTrigger: number; // increment to trigger zoom out
  resetNorthTrigger: number;
  triggerZoomIn: () => void;
  triggerZoomOut: () => void;
  triggerResetNorth: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  userLocation: null,
  userLocationLoading: false,
  userLocationError: null,
  setUserLocation: (loc) => set((s) => ({ userLocation: loc, mapCenter: loc || s.mapCenter })),
  setUserLocationLoading: (loading) => set({ userLocationLoading: loading }),
  setUserLocationError: (err) => set({ userLocationError: err }),

  mapCenter: { lat: 40.7589, lng: -73.9851 },
  setMapCenter: (loc) => set({ mapCenter: loc }),

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
  setNearbyPlaces: (p) => set({ nearbyPlaces: p }),
  activeCategory: null,
  setActiveCategory: (id) => set({ activeCategory: id }),
  nearbyLoading: false,
  setNearbyLoading: (b) => set({ nearbyLoading: b }),

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

  savedPlaces: [],
  savedPlacesModalVisible: false,
  setSavedPlacesModalVisible: (b) => set({ savedPlacesModalVisible: b }),

  loadSavedPlaces: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const places = JSON.parse(json) as SavedPlace[];
        set({ savedPlaces: places });
      }
    } catch (e) {
      console.warn('Failed to load saved places from AsyncStorage', e);
    }
  },

  toggleSavedPlace: async (p) => {
    const current = get().savedPlaces;
    const existing = current.find((sp) => sp.id === p.id);
    let next: SavedPlace[];
    if (existing) {
      next = current.filter((sp) => sp.id !== p.id);
    } else {
      next = [{ ...p, savedAt: Date.now() }, ...current];
    }
    set({ savedPlaces: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist saved places', e);
    }
  },

  isSaved: (id) => get().savedPlaces.some((sp) => sp.id === id),

  flyTo: null,
  flyToZoom: null,
  flyToTarget: (loc, zoom) => set({ flyTo: loc, flyToZoom: zoom ?? null }),
  clearFlyTo: () => set({ flyTo: null, flyToZoom: null }),

  zoomTrigger: 0,
  zoomOutTrigger: 0,
  resetNorthTrigger: 0,
  triggerZoomIn: () => set((s) => ({ zoomTrigger: s.zoomTrigger + 1 })),
  triggerZoomOut: () => set((s) => ({ zoomOutTrigger: s.zoomOutTrigger + 1 })),
  triggerResetNorth: () => set((s) => ({ resetNorthTrigger: s.resetNorthTrigger + 1 })),
}));
