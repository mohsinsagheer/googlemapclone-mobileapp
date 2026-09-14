'use client';

import { useState } from 'react';
import { Plus, Minus, Locate, Layers, Compass } from 'lucide-react';
import { useMapStore } from '@/lib/map-store';
import { cn } from '@/lib/utils';
import { MapLayerType } from '@/lib/map-types';

const LAYER_OPTIONS: { id: MapLayerType; label: string; description: string }[] = [
  { id: 'default', label: 'Map', description: 'Standard street map' },
  { id: 'satellite', label: 'Satellite', description: 'Imagery only' },
  { id: 'hybrid', label: 'Hybrid', description: 'Satellite + labels' },
  { id: 'terrain', label: 'Terrain', description: 'Topographic' },
];

export default function MapControls() {
  const {
    layer,
    setLayer,
    userLocation,
    setUserLocation,
    setUserLocationLoading,
    setUserLocationError,
    flyToTarget,
    zoomIn,
    zoomOut,
    resetNorth,
  } = useMapStore();

  const [showLayers, setShowLayers] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setUserLocationError('Geolocation not supported by this browser');
      return;
    }
    setUserLocationLoading(true);
    setUserLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setUserLocationLoading(false);
        flyToTarget(loc, 16);
      },
      (err) => {
        setUserLocationError(err.message || 'Could not get location');
        setUserLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="absolute right-3 bottom-32 sm:bottom-36 z-[1000] flex flex-col items-end gap-2 pointer-events-none lg:bottom-3">
      {showLayers && (
        <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] p-2 mb-1 sheet-transition min-w-[180px]">
          {LAYER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setLayer(opt.id);
                setShowLayers(false);
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm w-full transition',
                layer === opt.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-800'
              )}
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div>{opt.label}</div>
                <div className="text-[10px] text-gray-400 font-normal">{opt.description}</div>
              </div>
              {layer === opt.id && (
                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => setShowLayers(s => !s)}
          className={cn(
            'w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center transition active:scale-95',
            showLayers && 'ring-2 ring-blue-500'
          )}
          aria-label="Map layers"
        >
          <Layers className="w-5 h-5 text-gray-700" />
        </button>

        <button
          onClick={locateMe}
          className={cn(
            'w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center transition active:scale-95',
            userLocation && 'ring-2 ring-blue-500'
          )}
          aria-label="My location"
        >
          <Locate className={cn('w-5 h-5', userLocation ? 'text-blue-600' : 'text-gray-700')} />
        </button>

        <div className="bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">
          <button
            onClick={zoomIn}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition active:scale-95"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
          <div className="h-px bg-gray-200 mx-2" />
          <button
            onClick={zoomOut}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition active:scale-95"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <button
          onClick={resetNorth}
          className="w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center transition active:scale-95"
          aria-label="Reset north"
        >
          <Compass className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
