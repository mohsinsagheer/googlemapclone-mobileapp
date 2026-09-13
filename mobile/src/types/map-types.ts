export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  display_name?: string;
  type?: string;
  importance?: number;
  icon?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  rating?: number;
  reviewsCount?: number;
  photoUrl?: string;
  distance?: number;
}

export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface RouteStep {
  instruction: string;
  distance: number; // in meters
  duration: number; // in seconds
  maneuver?: string;
}

export interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: [number, number][]; // [lat, lng] pairs
  steps: RouteStep[];
  mode: TravelMode;
}

export interface PlaceCategory {
  id: string;
  label: string;
  query: string;
  emoji: string;
  color: string;
  overpass?: string[];
}

export type MapLayerType = 'default' | 'satellite' | 'terrain' | 'hybrid';

export type LanguagePreference = 'local' | 'en';

export interface SavedPlace extends SearchResult {
  savedAt: number;
}
