import { SearchResult, RouteInfo, TravelMode, LatLng, LanguagePreference } from './map-types';
import https from 'node:https';
import http from 'node:http';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
// Multiple Overpass endpoints — the main one is rate-limited / sometimes blocked.
// Try them in order until one succeeds.
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OSRM_BASE = 'https://router.project-osrm.org';

// Robust JSON fetch using node:https — works around undici issues in Next.js runtime
function fetchJsonWithRetry(url: string, opts: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: opts.method || 'GET',
        headers: {
          'User-Agent': 'GoogleMapsClone/1.0 (z.ai-sandbox)',
          'Accept': 'application/json',
          ...(opts.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`JSON parse failed: ${(e as Error).message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
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

// Pick the best name from a Nominatim result, honoring the language preference.
function pickName(r: NominatimResult, lang: LanguagePreference): string {
  if (lang === 'en') {
    // Prefer English name if available
    if (r.namedetails?.['name:en']) return r.namedetails['name:en'];
    if (r.namedetails?.name) return r.namedetails.name;
  }
  return r.name || r.display_name.split(',')[0] || 'Unknown';
}

function buildSearchResult(r: NominatimResult, lang: LanguagePreference): SearchResult {
  const name = pickName(r, lang);
  const parts = r.display_name.split(',').map(s => s.trim());
  // For English mode, the address parts should also be more English-friendly — Nominatim
  // already does this when Accept-Language: en is sent.
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
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&namedetails=1`;
  const data = (await fetchJsonWithRetry(url, { headers: { 'Accept-Language': langHeader } })) as NominatimResult[];
  return data.map(r => buildSearchResult(r, lang));
}

export async function reverseGeocode(lat: number, lng: number, lang: LanguagePreference = 'en'): Promise<SearchResult | null> {
  const langHeader = lang === 'en' ? 'en' : 'local';
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1`;
  try {
    const r = (await fetchJsonWithRetry(url, { headers: { 'Accept-Language': langHeader } })) as NominatimResult;
    if (!r || !r.lat) return null;
    return buildSearchResult(r, lang);
  } catch {
    return null;
  }
}

// Find nearby POIs using Overpass API, querying by OSM tag (amenity=, shop=, etc.)
// instead of by name pattern — so we actually find every real POI of that type.
export async function findNearbyPlaces(
  lat: number,
  lng: number,
  query: string,
  lang: LanguagePreference = 'en',
  overpassTags?: string[],
  radiusMeters = 2000,
  limit = 40,
): Promise<SearchResult[]> {
  // Compute a bounding box around the center
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}`;

  // Build the Overpass QL union of tag filters
  // Each tag is like "amenity=restaurant" → ["amenity"="restaurant"]
  let filters: string[];
  if (overpassTags && overpassTags.length > 0) {
    filters = overpassTags;
  } else {
    // Fallback: query by name pattern (degraded experience)
    filters = query.split(/\s+/).filter(Boolean).map(k => `name~${k}`);
  }

  // Convert each filter ("amenity=atm" or "name~restaurant") to its bracket form
  const tagBrackets = filters.map(f => {
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

  // Build a UNION: for each tag, query nodes AND ways in the bbox.
  // Each tag is a separate OR clause inside the (...)
  const unionParts = tagBrackets
    .flatMap(bracket => [
      `node${bracket}(${bbox})`,
      `way${bracket}(${bbox})`,
    ])
    .join(';\n      ');

  const overpassQl = `[out:json][timeout:15];
    (
      ${unionParts};
    );
    out center 80;`;

  let data: any | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      data = await fetchJsonWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(overpassQl),
      });
      break;
    } catch {
      // try next endpoint
    }
  }
  if (!data) {
    // Fallback: use Nominatim structured search as a degraded experience
    return nominatimNearbyFallback(lat, lng, query, lang, limit);
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

      // Pick name based on language preference
      let name: string;
      if (lang === 'en') {
        name = tags['name:en'] || tags['name'] || tags.brand || '';
      } else {
        name = tags.name || tags['name:en'] || tags.brand || '';
      }
      if (!name) {
        // Generate a name from category + street
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

  // Compute distance and sort
  const withDistance = results.map(r => ({
    ...r,
    distance: haversine(lat, lng, r.lat, r.lng),
  }));
  withDistance.sort((a, b) => (a as any).distance - (b as any).distance);

  // Strip distance and limit
  return withDistance.slice(0, limit).map(({ distance: _d, ...rest }) => rest) as SearchResult[];
}

async function nominatimNearbyFallback(
  lat: number,
  lng: number,
  query: string,
  lang: LanguagePreference,
  limit: number,
): Promise<SearchResult[]> {
  const langHeader = lang === 'en' ? 'en' : 'local';
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1&namedetails=1&viewbox=${lng - 0.05}%2C${lat + 0.05}%2C${lng + 0.05}%2C${lat - 0.05}&bounded=1`;
  try {
    const data = (await fetchJsonWithRetry(url, {
      headers: { 'Accept-Language': langHeader },
    })) as NominatimResult[];
    const results = data.map(r => buildSearchResult(r, lang));
    results.sort((a, b) => haversine(lat, lng, a.lat, a.lng) - haversine(lat, lng, b.lat, b.lng));
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

// Average speed multipliers — OSRM's public demo server only supports the driving
// profile (foot/bike return errors or the same car timings), so we always query
// driving and scale by realistic average speeds.
//   driving  ≈ 35 km/h city  → multiplier 1.0
//   cycling  ≈ 15 km/h       → multiplier ~2.3
//   walking  ≈ 5 km/h        → multiplier ~7.0
//   transit  ≈ 25 km/h avg (with stops) → multiplier 1.4
const MODE_DURATION_MULTIPLIER: Record<TravelMode, number> = {
  driving: 1.0,
  cycling: 2.3,
  walking: 7.0,
  transit: 1.4,
};

// Routing via OSRM (always uses driving profile on public server, then scales
// duration by mode to give realistic walk / bike / transit estimates).
export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
): Promise<RouteInfo | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const data = await fetchJsonWithRetry(url);
    if (!data.routes || data.routes.length === 0) return null;

    const r = data.routes[0];
    const geometry: [number, number][] = (r.geometry.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]],
    );

    const duration = r.duration * MODE_DURATION_MULTIPLIER[mode];

    const steps: RouteInfo['steps'] = (r.legs || []).flatMap((leg: any) =>
      (leg.steps || []).map((s: any) => ({
        instruction: buildInstruction(s),
        distance: s.distance,
        duration: s.duration * MODE_DURATION_MULTIPLIER[mode],
        maneuver: s.maneuver?.type,
      })),
    );

    return {
      distance: r.distance,
      duration,
      geometry,
      steps,
      mode,
    };
  } catch {
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
    arrive: 'You have arrived',
    turn: `Turn ${modifier} onto ${name}`,
    'new name': `Continue onto ${name}`,
    merge: `Merge ${modifier} onto ${name}`,
    'on ramp': `Take the ramp ${modifier} onto ${name}`,
    'off ramp': `Take the exit ${modifier} toward ${name}`,
    fork: `Keep ${modifier} at the fork`,
    'end of road': `Turn ${modifier} at the end of ${name}`,
    continue: `Continue ${modifier || 'straight'} on ${name}`,
    roundabout: `Enter the roundabout and exit onto ${name}`,
    'rotary': `Enter the rotary and exit onto ${name}`,
    'roundabout turn': `At the roundabout, turn ${modifier} onto ${name}`,
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
