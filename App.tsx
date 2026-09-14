import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

import { useMapStore } from './src/store/mapStore';
import MapEngine from './src/components/MapEngine';
import SearchBar from './src/components/SearchBar';
import CategoryChips from './src/components/CategoryChips';
import MapControls from './src/components/MapControls';
import PlaceDetailsSheet from './src/components/PlaceDetailsSheet';
import DirectionsModal from './src/components/DirectionsModal';
import SavedPlacesModal from './src/components/SavedPlacesModal';
import NearbyPlacesCarousel from './src/components/NearbyPlacesCarousel';

function MainScreen() {
  const {
    setUserLocation,
    setUserLocationLoading,
    selectedPlace,
    activeCategory,
    directionsMode,
    loadSavedPlaces,
  } = useMapStore();

  // On mount, load persisted saved places and attempt silent initial location check
  useEffect(() => {
    loadSavedPlaces();

    (async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {
              // Silently fall back to default
            },
            { timeout: 8000 }
          );
          return;
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setUserLocationLoading(true);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
          setUserLocationLoading(false);
        }
      } catch (err) {
        setUserLocationLoading(false);
        // Silently fall back to default map view
      }
    })();
  }, [loadSavedPlaces, setUserLocation, setUserLocationLoading]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Interactive Map View with Leaflet & Tiles */}
      <MapEngine />

      {/* Top Search Pill */}
      <SearchBar />

      {/* Horizontal Category Chips */}
      <CategoryChips />

      {/* Floating Right Map Controls */}
      <MapControls />

      {/* Place Details Bottom Sheet */}
      <PlaceDetailsSheet />

      {/* Horizontal Nearby Places Carousel */}
      <NearbyPlacesCarousel />

      {/* Turn-by-Turn Directions Panel */}
      <DirectionsModal />

      {/* Saved Places Modal */}
      <SavedPlacesModal />

      {/* Subtle Bottom Nudge Hint when Idle */}
      {!directionsMode && !selectedPlace && !activeCategory && (
        <View style={styles.idleHint} pointerEvents="none">
          <Text style={styles.idleHintText}>
            Tap a pin · search · or pick a category
          </Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8eaed',
  },
  idleHint: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 26 : 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  idleHintText: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '500',
  },
});
