'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Car,
  Footprints,
  Bike,
  Bus,
  CircleDot,
  MapPin,
  Route,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useMapStore } from '@/lib/map-store';
import { TravelMode, SearchResult } from '@/lib/map-types';
import { formatDistance, formatDuration } from '@/lib/geo-service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MODES: { id: TravelMode; label: string; icon: typeof Car }[] = [
  { id: 'driving', label: 'Drive', icon: Car },
  { id: 'transit', label: 'Transit', icon: Bus },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'cycling', label: 'Bike', icon: Bike },
];

// Average speed multipliers — OSRM public server only supports driving profile,
// so we always query driving and scale by mode to get realistic walk/bike/transit times.
//   driving  ≈ 35 km/h city  → 1.0
//   cycling  ≈ 15 km/h       → ~2.3
//   walking  ≈ 5 km/h        → ~7.0
//   transit  ≈ 25 km/h avg (with stops) → 1.4
const MODE_DURATION_MULTIPLIER: Record<TravelMode, number> = {
  driving: 1.0,
  cycling: 2.3,
  walking: 7.0,
  transit: 1.4,
};

function buildInstructionClient(step: any): string {
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
    rotary: `Enter the rotary and exit onto ${name}`,
    'roundabout turn': `At the roundabout, turn ${modifier} onto ${name}`,
    notification: `Continue on ${name}`,
  };
  return instructions[type] || `Continue on ${name}`;
}

type SheetSize = 'collapsed' | 'half' | 'full';

export default function DirectionsPanel() {
  const {
    directionsMode,
    setDirectionsMode,
    origin,
    setOrigin,
    destination,
    setDestination,
    travelMode,
    setTravelMode,
    route,
    setRoute,
    routeLoading,
    setRouteLoading,
    userLocation,
    selectedPlace,
    flyToTarget,
    mapHandle,
    language,
  } = useMapStore();

  const [editing, setEditing] = useState<'origin' | 'destination' | null>(null);
  const [editQuery, setEditQuery] = useState('');
  const [editResults, setEditResults] = useState<SearchResult[]>([]);
  const [editSearching, setEditSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sheet sizing — draggable
  const [sheetSize, setSheetSize] = useState<SheetSize>('half');
  // Header visibility — hide when user drags the map, show on swipe-up / tap-show
  const [headerVisible, setHeaderVisible] = useState(true);
  // Track if user is dragging the bottom sheet (so we can show header on swipe up)
  const sheetDragStartY = useRef<number | null>(null);
  const headerWasVisibleBeforeDrag = useRef<boolean>(true);

  // Auto-fill destination if a place was selected before opening directions
  useEffect(() => {
    if (directionsMode && !destination && selectedPlace) {
      setDestination(selectedPlace);
    }
    if (directionsMode && !origin && userLocation) {
      setOrigin({
        id: 'user',
        name: 'Your location',
        address: 'Current location',
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
    }
  }, [directionsMode]);

  // Reset state on open
  useEffect(() => {
    if (directionsMode) {
      setSheetSize('half');
      setHeaderVisible(true);
    }
  }, [directionsMode]);

  // Hide header when user drags the map; show it again when user swipes up on the sheet
  useEffect(() => {
    if (!directionsMode || !mapHandle) return;
    const map = mapHandle;
    const onDragStart = () => {
      headerWasVisibleBeforeDrag.current = headerVisible;
      setHeaderVisible(false);
    };
    map.on('dragstart', onDragStart);
    return () => {
      map.off('dragstart', onDragStart);
    };
  }, [directionsMode, mapHandle, headerVisible]);

  // Fetch route whenever origin / destination / mode changes — always uses the
  // driving profile (the only one the public OSRM server supports) and scales
  // duration by mode so walk / bike / transit return realistic different times.
  useEffect(() => {
    if (!directionsMode || !origin || !destination) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setRouteLoading(true);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    const multiplier = MODE_DURATION_MULTIPLIER[travelMode];

    (async () => {
      try {
        const res = await fetch(osrmUrl);
        if (!res.ok) throw new Error('Routing failed');
        const data = await res.json();
        if (cancelled) return;
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          toast.error('No route found');
          setRoute(null);
          return;
        }
        const r = data.routes[0];
        const duration = r.duration * multiplier;
        const geometry: [number, number][] = (r.geometry?.coordinates || []).map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const steps: any[] = (r.legs || []).flatMap((leg: any) =>
          (leg.steps || []).map((s: any) => ({
            instruction: buildInstructionClient(s),
            distance: s.distance,
            duration: s.duration * multiplier,
            maneuver: s.maneuver?.type,
          }))
        );
        const routeInfo = {
          distance: r.distance,
          duration,
          geometry,
          steps,
          mode: travelMode,
        };
        if (!cancelled) {
          setRoute(routeInfo);
          if (geometry.length > 0) {
            flyToTarget({ lat: geometry[0][0], lng: geometry[0][1] }, 13);
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error('Could not compute route');
          setRoute(null);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [directionsMode, origin, destination, travelMode, setRoute, setRouteLoading, flyToTarget]);

  // Search within edit mode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!editQuery.trim()) {
      setEditResults([]);
      setEditSearching(false);
      return;
    }
    setEditSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(editQuery)}&lang=${language}`);
        if (res.ok) setEditResults(await res.json());
      } catch {
        // ignore
      } finally {
        setEditSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editQuery, language]);

  if (!directionsMode) return null;

  const handleClose = () => {
    setDirectionsMode(false);
    setRoute(null);
    setOrigin(null);
    setDestination(null);
    setEditing(null);
  };

  const handleSwap = () => {
    if (origin && destination) {
      const o = origin;
      setOrigin(destination);
      setDestination(o);
    }
  };

  const startEdit = (which: 'origin' | 'destination') => {
    setEditing(which);
    setEditQuery('');
    setEditResults([]);
  };

  const selectEditResult = (place: SearchResult) => {
    if (editing === 'origin') setOrigin(place);
    else if (editing === 'destination') setDestination(place);
    setEditing(null);
    setEditQuery('');
    setEditResults([]);
  };

  // Sheet size cycling (collapsed → half → full → half)
  const cycleSheetSize = () => {
    setSheetSize(s => (s === 'collapsed' ? 'half' : s === 'half' ? 'full' : 'half'));
  };

  // Drag handlers on the sheet grabber — drag up to expand / show header, drag down to collapse
  const onSheetPointerDown = (e: React.PointerEvent) => {
    sheetDragStartY.current = e.clientY;
    headerWasVisibleBeforeDrag.current = headerVisible;
  };
  const onSheetPointerMove = (e: React.PointerEvent) => {
    if (sheetDragStartY.current == null) return;
    const delta = sheetDragStartY.current - e.clientY;
    if (Math.abs(delta) > 40) {
      if (delta > 0) {
        // Drag up → expand sheet + show header
        setSheetSize(prev => (prev === 'collapsed' ? 'half' : 'full'));
        setHeaderVisible(true);
      } else {
        // Drag down → collapse sheet
        setSheetSize(prev => (prev === 'full' ? 'half' : 'collapsed'));
      }
      sheetDragStartY.current = null;
    }
  };
  const onSheetPointerUp = () => {
    sheetDragStartY.current = null;
  };

  // Sheet height based on size state — responsive
  const sheetHeightClass =
    sheetSize === 'collapsed'
      ? 'max-h-[20vh]'
      : sheetSize === 'half'
      ? 'max-h-[55vh]'
      : 'max-h-[88vh]';

  return (
    <>
      {/* === Top header (origin / destination inputs + travel mode tabs) ===
          Responsive: full-width on mobile, sidebar card on desktop.
          Hidden when user drags the map — reappears on swipe-up or button tap. */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-[1100] transition-transform duration-300',
          'lg:left-4 lg:top-4 lg:right-auto lg:w-[380px]',
          headerVisible ? 'translate-y-0' : '-translate-y-[110%]'
        )}
      >
        <div className="bg-white lg:rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] pointer-events-auto">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 transition active:scale-95 flex-shrink-0"
              aria-label="Close directions"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="font-semibold text-gray-900 flex-1">Directions</h2>
            {!headerVisible && (
              <button
                onClick={() => setHeaderVisible(true)}
                className="text-xs text-blue-600 font-medium px-2 py-1"
              >
                Show
              </button>
            )}
          </div>

          {/* Origin / destination inputs */}
          <div className="px-3 pb-2">
            <div className="bg-gray-50 rounded-2xl p-2 relative">
              <div className="flex items-center gap-2 px-2 py-2 relative">
                <CircleDot className="w-4 h-4 text-gray-500 flex-shrink-0" />
                {editing === 'origin' ? (
                  <input
                    autoFocus
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setEditing(null), 200)}
                    placeholder="Choose starting point"
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                  />
                ) : (
                  <button
                    onClick={() => startEdit('origin')}
                    className="flex-1 text-left text-sm truncate text-gray-700"
                  >
                    {origin ? origin.name : 'Choose starting point'}
                  </button>
                )}
                {origin && editing !== 'origin' && (
                  <button
                    onClick={() => setOrigin(null)}
                    className="p-1 rounded-full hover:bg-gray-200 transition"
                    aria-label="Clear origin"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              <div className="h-px bg-gray-200 ml-8" />

              <div className="flex items-center gap-2 px-2 py-2 relative">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                {editing === 'destination' ? (
                  <input
                    autoFocus
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setEditing(null), 200)}
                    placeholder="Choose destination"
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                  />
                ) : (
                  <button
                    onClick={() => startEdit('destination')}
                    className="flex-1 text-left text-sm truncate text-gray-700"
                  >
                    {destination ? destination.name : 'Choose destination'}
                  </button>
                )}
                {destination && editing !== 'destination' && (
                  <button
                    onClick={() => setDestination(null)}
                    className="p-1 rounded-full hover:bg-gray-200 transition"
                    aria-label="Clear destination"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Swap button */}
              <button
                onClick={handleSwap}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition active:scale-95"
                aria-label="Swap origin and destination"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-700" />
              </button>

              {/* Edit-mode results dropdown */}
              {editing && (editResults.length > 0 || editSearching) && (
                <div className="absolute left-2 right-2 top-full mt-1 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] overflow-hidden max-h-60 overflow-y-auto z-10">
                  {editSearching && (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Searching...
                    </div>
                  )}
                  {editResults.map((r) => (
                    <button
                      key={r.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectEditResult(r)}
                      className="search-result-item w-full flex items-start gap-3 px-4 py-2.5 text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{r.name}</div>
                        <div className="text-xs text-gray-500 truncate">{r.address}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Travel mode tabs */}
          <div className="flex items-center gap-1 px-3 pb-3">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = travelMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setTravelMode(m.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition',
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating "show header" button when header is hidden */}
      {!headerVisible && (
        <button
          onClick={() => setHeaderVisible(true)}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1101] lg:left-[400px] lg:translate-x-0 flex items-center gap-1.5 bg-white px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:bg-gray-50 transition active:scale-95"
          aria-label="Show search bar"
        >
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">Show search</span>
        </button>
      )}

      {/* === Bottom sheet: route summary + turn-by-turn ===
          Draggable via grabber; scrollable inside; responsive. */}
      {origin && destination && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.18)] sheet-transition',
            'lg:left-4 lg:right-auto lg:bottom-4 lg:w-[380px] lg:rounded-2xl lg:shadow-[0_4px_16px_rgba(0,0,0,0.18)]',
            sheetHeightClass,
            'flex flex-col overflow-hidden'
          )}
        >
          {/* Drag grabber (click to cycle size; drag to expand/collapse) */}
          <div
            className="pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing flex flex-col items-center flex-shrink-0"
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerUp}
            onPointerCancel={onSheetPointerUp}
            onClick={cycleSheetSize}
          >
            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              {sheetSize === 'full' ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
              <span className="text-[10px] uppercase tracking-wide">
                {sheetSize === 'collapsed' ? 'Tap to expand' : sheetSize === 'half' ? 'Tap for full' : 'Tap to collapse'}
              </span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-4 pb-6 flex-1">
            {routeLoading ? (
              <div className="flex items-center gap-3 text-sm text-gray-500 py-6">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                Calculating route...
              </div>
            ) : route ? (
              <div>
                {/* Route summary */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Route className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl font-semibold text-gray-900">
                        {formatDuration(route.duration)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({formatDistance(route.distance)})
                      </span>
                      <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                        {route.mode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Fastest route, usual traffic
                    </div>
                  </div>
                  {/* Hide-header toggle button — quick way to peek at the map */}
                  <button
                    onClick={() => setHeaderVisible(v => !v)}
                    className="p-2 rounded-full hover:bg-gray-100 transition flex-shrink-0"
                    aria-label={headerVisible ? 'Hide search bar' : 'Show search bar'}
                    title={headerVisible ? 'Hide search bar' : 'Show search bar'}
                  >
                    {headerVisible ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Turn-by-turn directions */}
                {route.steps.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                      Turn-by-turn directions
                    </div>
                    <ol className="space-y-2.5">
                      {route.steps.slice(0, 50).map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900">{step.instruction}</div>
                            {(step.distance > 0 || step.duration > 0) && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {step.distance > 0 && formatDistance(step.distance)}
                                {step.distance > 0 && step.duration > 0 && ' · '}
                                {step.duration > 0 && formatDuration(step.duration)}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 flex items-center gap-2 py-6">
                <Search className="w-4 h-4" />
                No route found. Try a different mode or destination.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
