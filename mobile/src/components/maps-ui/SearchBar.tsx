'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin, Clock, Navigation, ArrowLeft, Languages } from 'lucide-react';
import { useMapStore } from '@/lib/map-store';
import { SearchResult } from '@/lib/map-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searching,
    setSearching,
    setSelectedPlace,
    flyToTarget,
    setDirectionsMode,
    setDestination,
    setOrigin,
    userLocation,
    language,
    toggleLanguage,
  } = useMapStore();

  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&lang=${language}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, language, setSearchResults, setSearching]);

  const handleSelect = (place: SearchResult) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchResults([]);
    flyToTarget({ lat: place.lat, lng: place.lng }, 15);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    inputRef.current?.focus();
  };

  const handleDirections = () => {
    // Use selected place or current search as destination
    const selected = useMapStore.getState().selectedPlace;
    if (selected) {
      setDestination(selected);
    }
    if (userLocation) {
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

  const showResults = (focused || searchQuery) && searchResults.length > 0;

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] pt-3 px-3 sm:pt-4 sm:px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div
          className={cn(
            'flex items-center gap-2 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] pl-3 pr-1.5 py-1.5 transition-all',
            focused && 'shadow-[0_4px_12px_rgba(0,0,0,0.22)]'
          )}
        >
          {focused ? (
            <button
              onClick={() => {
                setFocused(false);
                handleClear();
                inputRef.current?.blur();
              }}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          ) : (
            <Search className="w-5 h-5 text-gray-600 flex-shrink-0" />
          )}

          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              setFocused(true);
            }}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setFocused(false), 180);
            }}
            placeholder="Search here"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-gray-500 text-gray-900 min-w-0"
            autoComplete="off"
            spellCheck={false}
          />

          {searching && (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
          )}

          {!searching && searchQuery && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition flex-shrink-0"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {!searchQuery && !focused && (
            <>
              <button
                onClick={() => {
                  toggleLanguage();
                  toast.success(
                    language === 'en'
                      ? 'Switched to local language'
                      : 'Switched to English'
                  );
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 transition flex-shrink-0"
                aria-label="Toggle language"
                title={language === 'en' ? 'Showing English names — tap for local' : 'Showing local names — tap for English'}
              >
                <Languages className="w-4 h-4 text-gray-700" />
                <span className="text-xs font-semibold text-gray-700">
                  {language === 'en' ? 'EN' : '本地'}
                </span>
              </button>
              <button
                onClick={handleDirections}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition flex-shrink-0"
                aria-label="Directions"
              >
                <Navigation className="w-5 h-5 text-blue-600" />
              </button>
            </>
          )}
        </div>

        {showResults && (
          <div className="mt-2 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] overflow-hidden max-h-[60vh] overflow-y-auto">
            {searchResults.map((place) => (
              <button
                key={place.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(place)}
                className="search-result-item w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 transition"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{place.name}</div>
                  <div className="text-sm text-gray-500 truncate">{place.address}</div>
                  {place.category && (
                    <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{place.category}</div>
                  )}
                </div>
                <div className="text-gray-300 flex-shrink-0 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick suggestions when focused but no query */}
        {focused && !searchQuery && (
          <div className="mt-2 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] overflow-hidden">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (userLocation) {
                  flyToTarget(userLocation, 16);
                  inputRef.current?.blur();
                  setFocused(false);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Your location</div>
                <div className="text-sm text-gray-500">
                  {userLocation ? 'Center map on you' : 'Location not available'}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
