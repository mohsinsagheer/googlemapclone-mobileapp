import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useMapStore } from '../store/mapStore';
import { CATEGORIES } from '../constants/categories';
import { findNearbyPlaces } from '../services/geoService';

export default function CategoryChips() {
  const insets = useSafeAreaInsets();
  const {
    activeCategory,
    setActiveCategory,
    setNearbyPlaces,
    userLocation,
    mapCenter,
    flyToTarget,
    setSelectedPlace,
    directionsMode,
    setDirectionsMode,
    searchResults,
    setSearchResults,
    setSearchQuery,
    language,
    nearbyLoading,
    setNearbyLoading,
  } = useMapStore();

  if (directionsMode || searchResults.length > 0) return null;

  const handlePress = async (catId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on web/simulator
    }

    // Reset previous search and selection
    setDirectionsMode(false);
    setSelectedPlace(null);
    setSearchResults([]);
    setSearchQuery('');

    if (activeCategory === catId) {
      setActiveCategory(null);
      setNearbyPlaces([]);
      return;
    }

    setActiveCategory(catId);

    const category = CATEGORIES.find((c) => c.id === catId);
    if (!category) return;

    // Center search around visible mapCenter or user's location
    const center = mapCenter || userLocation || { lat: 40.7589, lng: -73.9851 };

    setNearbyLoading(true);
    try {
      const places = await findNearbyPlaces(
        center.lat,
        center.lng,
        category.query,
        language,
        category.overpass,
        3000,
        40
      );
      // Ensure user is still on this category
      if (useMapStore.getState().activeCategory === catId) {
        setNearbyPlaces(places);
        if (places.length > 0) {
          flyToTarget(center, 15);
        }
      }
    } catch (err) {
      console.warn('Failed to load nearby places', err);
    } finally {
      setNearbyLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === 'ios' ? 58 : 64),
        },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const isLoadingThis = isActive && nearbyLoading;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isActive && styles.chipActive,
                isActive && { borderColor: cat.color },
              ]}
              onPress={() => handlePress(cat.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {cat.label}
              </Text>
              {isLoadingThis && (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  style={styles.chipSpinner}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 90,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8eaed',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chipActive: {
    backgroundColor: '#202124',
    borderColor: '#202124',
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3c4043',
  },
  chipLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  chipSpinner: {
    marginLeft: 6,
    transform: [{ scale: 0.8 }],
  },
});
