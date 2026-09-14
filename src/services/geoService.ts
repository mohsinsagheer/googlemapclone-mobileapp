import { Platform } from 'react-native';
import { SearchResult, RouteInfo, TravelMode, LatLng, LanguagePreference } from '../types/map-types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const OSRM_BASE = 'https://router.project-osrm.org';

const USER_AGENT = 'MapAppMobile/1.0 (React-Native)';

function getFetchHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  // Only set User-Agent on native to avoid browser forbidden header and CORS preflight issues
  if (Platform.OS !== 'web') {
    headers['User-Agent'] = USER_AGENT;
  }
  return headers;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  name?: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
}

function categoryFromClass(cls: string, type: string): string {
  const map: Record<string, string> = {
    amenity: 'Place',
    shop: 'Shop',
    tourism: 'Attraction',
    leisure: 'Leisure',
    historic: 'Historic',
    natural: 'Natural',
    highway: 'Road',
    place: 'Place',
    building: 'Building',
    office: 'Office',
    healthcare: 'Healthcare',
    education: 'Education',
    aeroway: 'Airport',
    railway: 'Railway',
    public_transport: 'Transport',
  };
  return map[cls] || cls.charAt(0).toUpperCase() + cls.slice(1);
}

function pickName(r: NominatimResult, lang: LanguagePreference): string {
  if (lang === 'en') {
    if (r.namedetails?.['name:en']) return r.namedetails['name:en'];
    if (r.namedetails?.name) return r.namedetails.name;
  }
  return r.name || r.display_name.split(',')[0] || 'Unknown';
}

function buildSearchResult(r: NominatimResult, lang: LanguagePreference): SearchResult {
  const name = pickName(r, lang);
  const parts = r.display_name.split(',').map((s) => s.trim());
  const address = parts.slice(1).join(', ');
  return {
    id: `n-${r.place_id}`,
    name,
    address,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    category: categoryFromClass(r.class, r.type),
    display_name: r.display_name,
    type: r.type,
    importance: r.importance,
  };
}

export async function geocodeSearch(query: string, lang: LanguagePreference = 'en'): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const langHeader = lang === 'en' ? 'en' : 'local';
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=10&addressdetails=1&namedetails=1`;

  try {
    const res = await fetch(url, {
      headers: getFetchHeaders({
        'Accept-Language': langHeader,
        Accept: 'application/json',
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    return data.map((r) => buildSearchResult(r, lang));
  } catch (err) {
    console.warn('geocodeSearch failed:', err);
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: LanguagePreference = 'en'
): Promise<SearchResult | null> {
  const langHeader = lang === 'en' ? 'en' : 'local';
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1`;

  try {
    const res = await fetch(url, {
      headers: getFetchHeaders({
        'Accept-Language': langHeader,
        Accept: 'application/json',
      }),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as NominatimResult;
    if (!r || !r.lat) return null;
    return buildSearchResult(r, lang);
  } catch {
    return null;
  }
}

export async function findNearbyPlaces(
  lat: number,
  lng: number,
  query: string,
  lang: LanguagePreference = 'en',
  overpassTags?: string[],
  radiusMeters = 2500,
  limit = 40
): Promise<SearchResult[]> {
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}`;

  let filters: string[];
  if (overpassTags && overpassTags.length > 0) {
    filters = overpassTags;
  } else {
    filters = query.split(/\s+/).filter(Boolean).map((k) => `name~${k}`);
  }

  const tagBrackets = filters.map((f) => {
    const eqIdx = f.indexOf('=');
    if (eqIdx > 0) {
      const k = f.slice(0, eqIdx);
      const v = f.slice(eqIdx + 1);
      return `["${k}"="${v}"]`;
    }
    const tildeIdx = f.indexOf('~');
    if (tildeIdx > 0) {
      const k = f.slice(0, tildeIdx);
      const v = f.slice(tildeIdx + 1);
      return `["${k}"~"${v}", i]`;
    }
    return `["${f}"]`;
  });

  const unionParts = tagBrackets
    .flatMap((bracket) => [`node${bracket}(${bbox})`, `way${bracket}(${bbox})`])
    .join(';\n      ');

  const overpassQl = `[out:json][timeout:15];
    (
      ${unionParts};
    );
    out center 80;`;

  let data: any = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getFetchHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: 'data=' + encodeURIComponent(overpassQl),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch {
      // try next endpoint
    }
  }

  if (!data || !data.elements || data.elements.length === 0) {
    return nominatimNearbyFallback(lat, lng, query, lang, limit, radiusMeters);
  }

  type OverpassElement = {
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  };
  const elements = (data.elements || []) as OverpassElement[];

  const results: SearchResult[] = elements
    .map((el): SearchResult | null => {
      const elat = el.lat ?? el.center?.lat;
      const elon = el.lon ?? el.center?.lon;
      if (elat == null || elon == null) return null;
      const tags = el.tags || {};

      let name: string;
      if (lang === 'en') {
        name = tags['name:en'] || tags['name'] || tags.brand || '';
      } else {
        name = tags.name || tags['name:en'] || tags.brand || '';
      }
      if (!name) {
        const cat = tags.amenity || tags.shop || tags.tourism || tags.leisure || 'place';
        name = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
      }

      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:neighbourhood'],
        tags['addr:suburb'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state'],
        tags['addr:postcode'],
        tags['addr:country'],
      ].filter(Boolean);
      const category = tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.office || 'place';

      return {
        id: `o-${el.type}-${el.id}`,
        name,
        address: addressParts.join(', ') || `${elat.toFixed(5)}, ${elon.toFixed(5)}`,
        lat: elat,
        lng: elon,
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        phone: tags['phone'] || tags['contact:phone'] || tags['contact:mobile'],
        website: tags['website'] || tags['contact:website'] || tags['url'],
        openingHours: tags['opening_hours'],
        icon: tags.amenity ? '📍' : '🏢',
      };
    })
    .filter((r): r is SearchResult => r !== null);

  const withDistance = results.map((r) => ({
    ...r,
    distance: haversine(lat, lng, r.lat, r.lng),
  }));
  withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  return withDistance.slice(0, limit);
}

async function nominatimNearbyFallback(
  lat: number,
  lng: number,
  query: string,
  lang: LanguagePreference,
  limit: number,
  radiusMeters = 3500
): Promise<SearchResult[]> {
  const langHeader = lang === 'en' ? 'en' : 'local';
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
  const minLon = (lng - lngDelta).toFixed(5);
  const maxLon = (lng + lngDelta).toFixed(5);
  const minLat = (lat - latDelta).toFixed(5);
  const maxLat = (lat + latDelta).toFixed(5);
  const viewbox = `${minLon}%2C${maxLat}%2C${maxLon}%2C${minLat}`;

  const cleanQuery = query.trim();
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
    cleanQuery
  )}&limit=${limit}&addressdetails=1&namedetails=1&viewbox=${viewbox}&bounded=0`;

  try {
    const res = await fetch(url, {
      headers: getFetchHeaders({
        'Accept-Language': langHeader,
        Accept: 'application/json',
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    const results = data.map((r) => {
      const item = buildSearchResult(r, lang);
      item.distance = haversine(lat, lng, item.lat, item.lng);
      return item;
    });
    results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return results;
  } catch {
    return [];
  }
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const MODE_DURATION_MULTIPLIER: Record<TravelMode, number> = {
  driving: 1.0,
  cycling: 2.3,
  walking: 7.0,
  transit: 1.4,
};

export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode
): Promise<RouteInfo | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url, {
      headers: getFetchHeaders({
        Accept: 'application/json',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const r = data.routes[0];
    const geometry: [number, number][] = (r.geometry.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]]
    );

    const duration = r.duration * MODE_DURATION_MULTIPLIER[mode];

    const steps: RouteInfo['steps'] = (r.legs || []).flatMap((leg: any) =>
      (leg.steps || []).map((s: any) => ({
        instruction: buildInstruction(s),
        distance: s.distance,
        duration: s.duration * MODE_DURATION_MULTIPLIER[mode],
        maneuver: s.maneuver?.type,
      }))
    );

    return {
      distance: r.distance,
      duration,
      geometry,
      steps,
      mode,
    };
  } catch (e) {
    console.warn('getRoute error:', e);
    return null;
  }
}

function buildInstruction(step: any): string {
  const maneuver = step.maneuver;
  const type = maneuver?.type || 'continue';
  const modifier = maneuver?.modifier;
  const name = step.name || 'the road';
  const instructions: Record<string, string> = {
    depart: `Head ${modifier || ''} on ${name}`.trim(),
    arrive: 'You have arrived at your destination',
    turn: `Turn ${modifier || ''} onto ${name}`.trim(),
    'new name': `Continue onto ${name}`,
    merge: `Merge ${modifier || ''} onto ${name}`.trim(),
    'on ramp': `Take the ramp ${modifier || ''} onto ${name}`.trim(),
    'off ramp': `Take exit ${modifier || ''} toward ${name}`.trim(),
    fork: `Keep ${modifier || ''} at the fork`,
    'end of road': `Turn ${modifier || ''} at the end of ${name}`.trim(),
    continue: `Continue ${modifier || 'straight'} on ${name}`,
    roundabout: `Enter roundabout and exit onto ${name}`,
    rotary: `Enter rotary and exit onto ${name}`,
    'roundabout turn': `At roundabout, turn ${modifier || ''} onto ${name}`.trim(),
    notification: `Continue on ${name}`,
  };
  return instructions[type] || `Continue on ${name}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs} hr`;
  return `${hrs} hr ${remMins} min`;
}
