'use client';

import { useState } from 'react';
import {
  Navigation,
  Save,
  Share2,
  Phone,
  Globe,
  Clock,
  MapPin,
  Star,
  X,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { useMapStore } from '@/lib/map-store';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/lib/geo-service';
import { toast } from 'sonner';

export default function PlaceDetailsSheet() {
  const {
    selectedPlace,
    setSelectedPlace,
    toggleSavedPlace,
    isSaved,
    setDirectionsMode,
    setDestination,
    setOrigin,
    userLocation,
    flyToTarget,
    savedPlaces,
    setActiveCategory,
    setSearchQuery,
  } = useMapStore();

  const [showSavedList, setShowSavedList] = useState(false);

  // If no selected place — show a compact "saved" pill at the bottom
  if (!selectedPlace) {
    if (savedPlaces.length === 0) return null;
    return (
      <div className="absolute left-3 right-3 bottom-20 sm:bottom-24 z-[1000] flex justify-center pointer-events-none lg:left-auto lg:right-3 lg:bottom-3 lg:justify-end">
        <button
          onClick={() => setShowSavedList(true)}
          className="pointer-events-auto flex items-center gap-2 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition active:scale-95"
        >
          <Bookmark className="w-4 h-4 text-blue-600" />
          Saved
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
            {savedPlaces.length}
          </span>
        </button>
      </div>
    );
  }

  const place = selectedPlace;
  const saved = isSaved(place.id);

  const handleDirections = () => {
    setDestination(place);
    if (userLocation && !useMapStore.getState().origin) {
      setOrigin({
        id: 'user',
        name: 'Your location',
        address: 'Current location',
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
    }
    setDirectionsMode(true);
  };

  const handleSave = () => {
    toggleSavedPlace(place);
    toast.success(saved ? 'Removed from saved' : 'Place saved');
  };

  const handleShare = async () => {
    const url = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: place.name,
          text: place.address,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch {
      // user cancelled or no share API
    }
  };

  return (
    <>
      <div
        className={cn(
          'absolute left-0 right-0 bottom-0 z-[1000] bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.12)] sheet-transition',
          'max-h-[70vh] overflow-y-auto',
          // On desktop: render as a sidebar card on the left
          'lg:left-4 lg:bottom-4 lg:top-[170px] lg:right-auto lg:w-[380px] lg:rounded-2xl lg:shadow-[0_4px_16px_rgba(0,0,0,0.18)] lg:max-h-[calc(100vh-200px)]'
        )}
      >
        {/* Grabber — only on mobile (sidebar doesn't need grabber) */}
        <div className="sticky top-0 bg-white pt-2.5 pb-1 flex justify-center rounded-t-2xl lg:hidden">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-6 pt-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-xl font-semibold text-gray-900 leading-tight flex-1">
              {place.name}
            </h2>
            <button
              onClick={() => setSelectedPlace(null)}
              className="p-1.5 -mt-1 -mr-1 rounded-full hover:bg-gray-100 transition flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {place.category && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {place.category}
              </span>
              {place.rating != null && (
                <span className="flex items-center gap-1 text-sm text-gray-700">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {place.rating.toFixed(1)}
                  {place.reviewsCount != null && (
                    <span className="text-gray-500">({place.reviewsCount})</span>
                  )}
                </span>
              )}
            </div>
          )}

          {place.address && (
            <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
              <span>{place.address}</span>
            </p>
          )}

          {/* Action buttons row */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleDirections}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-blue-700 transition active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-medium transition active:scale-95',
                saved
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
            >
              {saved ? <Bookmark className="w-4 h-4 fill-current" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 rounded-full py-2.5 px-4 text-sm font-medium hover:bg-gray-200 transition active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Details list */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {place.phone}
              </a>
            )}
            {place.website && (
              <a
                href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-sm text-blue-600 hover:underline truncate"
              >
                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{place.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {place.openingHours && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <Clock className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span className="whitespace-pre-line">{place.openingHours}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Mini "View larger map" link */}
          <button
            onClick={() => {
              flyToTarget({ lat: place.lat, lng: place.lng }, 17);
            }}
            className="mt-4 text-xs text-blue-600 hover:underline"
          >
            Center map on this place
          </button>
        </div>
      </div>

      {/* Saved list overlay */}
      {showSavedList && (
        <SavedPlacesOverlay
          onClose={() => setShowSavedList(false)}
          onSelect={(p) => {
            setSelectedPlace(p);
            setSearchQuery(p.name);
            setActiveCategory(null);
            flyToTarget({ lat: p.lat, lng: p.lng }, 15);
            setShowSavedList(false);
          }}
        />
      )}
    </>
  );
}

function SavedPlacesOverlay({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: any) => void;
}) {
  const { savedPlaces, toggleSavedPlace } = useMapStore();

  return (
    <div
      className="absolute inset-0 z-[1100] bg-black/30 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Saved places</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {savedPlaces.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <Bookmark className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              No saved places yet.
              <br />
              Tap Save on any place to bookmark it.
            </div>
          ) : (
            savedPlaces.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
              >
                <button
                  onClick={() => onSelect(p)}
                  className="flex-1 flex items-start gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-sm text-gray-500 truncate">{p.address}</div>
                  </div>
                </button>
                <button
                  onClick={() => toggleSavedPlace(p)}
                  className="p-2 rounded-full hover:bg-gray-100 transition flex-shrink-0"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
