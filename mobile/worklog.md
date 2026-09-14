---
Task ID: maps-clone
Agent: main
Task: Build a mobile-first Google Maps clone as a Next.js web app (publishable / downloadable).

Work Log:
- Initialized fullstack-dev environment (Next.js 16 + Tailwind 4 + shadcn/ui).
- Installed `leaflet`, `react-leaflet`, `@types/leaflet`.
- Implemented mobile-first UI:
  - Full-screen Leaflet map (OpenStreetMap tiles).
  - Pill-style search bar with Nominatim autocomplete (debounced 350ms).
  - 12 category chips (Restaurants, Coffee, Gas, Hotels, Groceries, Pharmacy, ATMs, Parks, Shopping, Hospitals, Transit, Gyms) — fetches nearby POIs via Overpass API with Nominatim fallback.
  - Floating controls (Layers, My-location, Zoom-in/out, Compass) — Google Maps style.
  - Layer switcher: Map / Satellite (Esri) / Terrain (OpenTopoMap).
  - Bottom-sheet place details panel with Directions / Save / Share actions; persisted Saved places in localStorage.
  - Full directions mode: Drive / Transit / Walk / Bike tabs, origin/destination search with autocomplete, swap button, route polyline + ETA + turn-by-turn steps. Routing via OSRM (called from client to bypass Next.js server fetch issues).
- API routes (server-side, with proper User-Agent per Nominatim usage policy):
  - `/api/search` — geocoding
  - `/api/nearby` — Overpass + Nominatim fallback
  - `/api/reverse` — reverse geocoding
  - `/api/route` — OSRM routing (kept for reference; client calls OSRM directly for reliability)
- Bug fixes during verification:
  - `Walk` icon doesn't exist in lucide-react → switched to `Footprints`.
  - `@import "leaflet/dist/leaflet.css"` inside globals.css was stripped by Tailwind 4 processor → moved to a JS import inside MapView.tsx so all of Leaflet's pane-positioning CSS lands in the bundle. Without this fix, marker panes had `position: static` and markers were rendered 4000+px below the viewport.
  - Added `map.invalidateSize()` after mount to handle delayed container sizing.
  - Category chips now fall back to the map's current center when userLocation is unavailable (so chips still work without granting geolocation).
  - Replaced undici fetch (failed with "fetch failed" / AggregateError inside Next.js runtime) with `node:https`-based helper for all server-side map API calls.
- Verified end-to-end with agent-browser (414×896 mobile viewport):
  - Search "Statue of Liberty" → 4 results, click → place details sheet opens.
  - Open Directions → search "Times Square" → route computed (3 min, 1.5 km) with turn-by-turn steps and polyline rendered on map.
  - Layer switcher verified (Map → Satellite → Terrain).
  - Category chip "Restaurants" → 20 markers placed correctly within viewport at NYC.

Stage Summary:
- Final deliverable: a Google-Maps-style mobile web app at `/` (only route).
- Tech: Next.js 16, react-leaflet 5, leaflet 1.9, Tailwind 4, shadcn/ui, Zustand, Nominatim, Overpass, OSRM (no API keys required — all free/open services).
- Lint clean. Dev server compiles. All core interactions verified in browser.
