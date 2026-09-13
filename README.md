# Maps — A Google Maps–style Mobile Web App

A mobile-first maps app built with Next.js 16, react-leaflet, and free OpenStreetMap data.
No API keys required — uses Nominatim (geocoding), Overpass (POIs), OSRM (routing),
and OpenStreetMap / Esri / OpenTopoMap tiles.

## Features

- Full-screen interactive map with pan / zoom / pinch
- Search any place worldwide (autocomplete)
- 12 category chips: Restaurants, Coffee, Gas, Hotels, Groceries, Pharmacy, ATMs, Parks, Shopping, Hospitals, Transit, Gyms
- Place details bottom sheet: name, address, phone, website, opening hours, Save / Share / Directions
- Directions mode with Drive / Transit / Walk / Bike tabs, route polyline, ETA, and turn-by-turn steps
- 3 map layers: Map (streets), Satellite (aerial), Terrain (topographic)
- Saved places persisted to localStorage
- My-location button with high-accuracy GPS
- Mobile-first responsive design (works on phone, tablet, desktop)

## Local development

```bash
bun install
bun run dev   # http://localhost:3000
```

Lint:

```bash
bun run lint
```

## Build for production

```bash
bun run build
bun run start
```

The build outputs a standalone Next.js server in `.next/standalone/`.

## Deploy / Publish

This is a standard Next.js 16 app — you can publish it to any Node host:

- **Vercel** — push to GitHub, import the repo at vercel.com
- **Netlify** — Next.js adapter, build command `next build`
- **Cloudflare Pages** — `@cloudflare/next-on-pages` adapter
- **Self-host** — `bun run build` then `bun run start` (or use the standalone output in `.next/standalone/`)

### React Native Responsive Mobile App (iOS / Android / Web)

A complete standalone React Native mobile app powered by **Expo** is located in `mobile/`:

```bash
# From workspace root:
npm run mobile         # Starts Expo dev server
npm run mobile:android # Launch on Android
npm run mobile:ios     # Launch on iOS (macOS)
npm run mobile:web     # Launch in web browser

# Or navigate directly:
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your physical phone (iPhone or Android) for instant on-device testing. See [mobile/README.md](file:///home/mohsinsagheer/Map-App/mobile/README.md) for complete details.

## Project structure

```
src/
  app/
    page.tsx                      # Main map page (mobile-first layout)
    layout.tsx                   # Root layout with viewport meta
    globals.css                  # Tailwind + custom Leaflet overrides
    api/
      search/route.ts            # Nominatim geocoding
      nearby/route.ts            # Overpass + Nominatim POIs
      reverse/route.ts           # Reverse geocoding
      route/route.ts             # OSRM routing
  components/
    maps/
      MapView.tsx                # Leaflet MapContainer + markers + polylines
    maps-ui/
      SearchBar.tsx              # Top pill search with autocomplete
      CategoryChips.tsx          # Horizontal chip row for nearby POIs
      MapControls.tsx            # Floating right-side controls
      PlaceDetailsSheet.tsx      # Bottom sheet for selected place
      DirectionsPanel.tsx        # Full directions UI
  lib/
    map-types.ts                 # Shared TypeScript types
    categories.ts                # Category definitions
    map-store.ts                 # Zustand store
    geo-service.ts               # Server-side geocoding / routing helpers
    marker-icons.ts              # Custom Leaflet divIcons (Google-Maps style)
```

## Data sources (all free, no API key needed)

| Service     | URL                                  | Used for         |
|-------------|--------------------------------------|------------------|
| OpenStreetMap tiles | tile.openstreetmap.org        | Default map layer |
| Esri World Imagery  | server.arcgisonline.com      | Satellite layer   |
| OpenTopoMap         | tile.opentopomap.org          | Terrain layer     |
| Nominatim           | nominatim.openstreetmap.org  | Geocoding / search |
| Overpass API        | overpass-api.de              | Nearby POIs       |
| OSRM                | router.project-osrm.org      | Routing / directions |

**Rate limits:** All services above are free public endpoints with fair-use policies.
For production at scale, self-host OSRM / Nominatim / tile server, or switch to
Google Maps Platform / Mapbox APIs (would require API keys).
