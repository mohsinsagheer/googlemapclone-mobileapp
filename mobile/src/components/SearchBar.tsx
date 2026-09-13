import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  X,
  ArrowLeft,
  Navigation,
  MapPin,
  Bookmark,
  Languages,
} from 'lucide-react-native';
import { useMapStore } from '../store/mapStore';
import { geocodeSearch } from '../services/geoService';
import { SearchResult } from '../types/map-types';

export default function SearchBar() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

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
    setSavedPlacesModalVisible,
    savedPlaces,
    directionsMode,
  } = useMapStore();

  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const results = await geocodeSearch(searchQuery, language);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, language, setSearchResults, setSearching]);

  const handleSelect = (place: SearchResult) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchResults([]);
    setFocused(false);
    Keyboard.dismiss();
    flyToTarget({ lat: place.lat, lng: place.lng }, 16);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
  };

  const handleDirections = () => {
    const current = useMapStore.getState().selectedPlace;
    if (current) {
      setDestination(current);
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

  if (directionsMode) return null;

  const showDropdown = (focused || searchQuery.length > 0) && searchResults.length > 0;

  return (
    <View
      style={[
        styles.wrapper,
        {
          top: insets.top + (Platform.OS === 'ios' ? 6 : 10),
          width: isTablet ? Math.min(width * 0.55, 520) : width - 24,
          left: isTablet ? 20 : 12,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Floating Pill Search Bar */}
      <View style={[styles.barContainer, focused && styles.barContainerFocused]}>
        {focused ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setFocused(false);
              Keyboard.dismiss();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#3c4043" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn}>
            <Search size={20} color="#5f6368" />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Search here"
          placeholderTextColor="#70757a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />

        {searching && (
          <ActivityIndicator size="small" color="#1a73e8" style={styles.spinner} />
        )}

        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleClear}>
            <X size={18} color="#5f6368" />
          </TouchableOpacity>
        )}

        {/* Language Toggle Pill */}
        <TouchableOpacity
          style={styles.langPill}
          onPress={toggleLanguage}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Languages size={14} color="#1a73e8" />
          <Text style={styles.langText}>{language === 'en' ? 'EN' : 'LOC'}</Text>
        </TouchableOpacity>

        {/* Saved Places Shortcut */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setSavedPlacesModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Bookmark size={18} color={savedPlaces.length > 0 ? '#1a73e8' : '#5f6368'} />
        </TouchableOpacity>

        {/* Quick Directions Button */}
        <TouchableOpacity
          style={styles.directionsPill}
          onPress={handleDirections}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Navigation size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Autocomplete Results Dropdown */}
      {showDropdown && (
        <View style={styles.dropdown}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.resultIconWrapper}>
                  <MapPin size={18} color="#ea4335" />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.address || item.display_name}
                  </Text>
                </View>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 320 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 100,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  barContainerFocused: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  iconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  spinner: {
    marginRight: 6,
  },
  actionBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    gap: 4,
  },
  langText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a73e8',
  },
  directionsPill: {
    backgroundColor: '#1a73e8',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f3f4',
  },
  resultIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fce8e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#70757a',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '500',
  },
});
