import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, MapPin, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMapStore } from '../store/mapStore';
import { CATEGORIES } from '../constants/categories';
import { formatDistance, haversine } from '../services/geoService';
import { SearchResult } from '../types/map-types';

export default function NearbyPlacesCarousel() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    activeCategory,
    setActiveCategory,
    nearbyPlaces,
    setNearbyPlaces,
    nearbyLoading,
    selectedPlace,
    setSelectedPlace,
    flyToTarget,
    userLocation,
    directionsMode,
    setDestination,
    setOrigin,
    setDirectionsMode,
  } = useMapStore();

  // Don't display carousel if no active category, in directions mode, or a place details sheet is already open
  if (!activeCategory || directionsMode || selectedPlace) {
    return null;
  }

  const category = CATEGORIES.find((c) => c.id === activeCategory);
  if (!category) return null;

  const handleClose = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveCategory(null);
    setNearbyPlaces([]);
  };

  const handleSelectPlace = (place: SearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedPlace(place);
    flyToTarget({ lat: place.lat, lng: place.lng }, 16);
  };

  const handleQuickDirections = (place: SearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setDestination(place);
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

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + (Platform.OS === 'ios' ? 16 : 20),
          width: isTablet ? Math.min(width * 0.7, 600) : width,
          left: isTablet ? 20 : 0,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{category.emoji}</Text>
          <Text style={styles.title}>
            {category.label}{' '}
            {!nearbyLoading && nearbyPlaces.length > 0
              ? `(${nearbyPlaces.length})`
              : ''}
          </Text>
          {nearbyLoading && (
            <ActivityIndicator
              size="small"
              color="#1a73e8"
              style={styles.loadingSpinner}
            />
          )}
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color="#5f6368" />
        </TouchableOpacity>
      </View>

      {/* Loading placeholder or Empty state or Carousel */}
      {nearbyLoading ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>Searching nearby {category.label.toLowerCase()}...</Text>
        </View>
      ) : nearbyPlaces.length === 0 ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            No {category.label.toLowerCase()} found in this area. Move map or zoom out.
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={nearbyPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          snapToInterval={248}
          decelerationRate="fast"
          renderItem={({ item }) => {
            const dist = userLocation
              ? haversine(userLocation.lat, userLocation.lng, item.lat, item.lng)
              : item.distance;

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleSelectPlace(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.placeName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.infoRow}>
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: `${category.color}15` },
                        ]}
                      >
                        <Text
                          style={[styles.catBadgeText, { color: category.color }]}
                        >
                          {item.category || category.label}
                        </Text>
                      </View>
                      {dist != null && (
                        <Text style={styles.distanceText}>
                          {formatDistance(dist)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.addressRow}>
                  <MapPin size={12} color="#70757a" style={styles.pinIcon} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.dirBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleQuickDirections(item);
                    }}
                  >
                    <Navigation size={13} color="#1a73e8" />
                    <Text style={styles.dirBtnText}>Directions</Text>
                  </TouchableOpacity>
                  <Text style={styles.viewDetailsText}>Tap to view →</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    marginLeft: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#202124',
  },
  loadingSpinner: {
    marginLeft: 4,
  },
  closeBtn: {
    marginLeft: 8,
    padding: 2,
  },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusText: {
    fontSize: 13,
    color: '#5f6368',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  card: {
    width: 238,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  pinIcon: {
    marginRight: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#70757a',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f3f4',
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  dirBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a73e8',
  },
  viewDetailsText: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '500',
  },
});
