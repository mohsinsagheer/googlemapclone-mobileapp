import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Navigation,
  Bookmark,
  Share2,
  Phone,
  Globe,
  Clock,
  MapPin,
  X,
} from 'lucide-react-native';
import { useMapStore } from '../store/mapStore';
import { formatDistance, haversine } from '../services/geoService';

export default function PlaceDetailsSheet() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    selectedPlace,
    setSelectedPlace,
    toggleSavedPlace,
    isSaved,
    setDirectionsMode,
    setDestination,
    setOrigin,
    userLocation,
    directionsMode,
  } = useMapStore();

  if (!selectedPlace || directionsMode) return null;

  const place = selectedPlace;
  const saved = isSaved(place.id);

  const distMeters = userLocation
    ? haversine(userLocation.lat, userLocation.lng, place.lat, place.lng)
    : place.distance;

  const handleDirections = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

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

  const handleSaveToggle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await toggleSavedPlace(place);
  };

  const handleShare = async () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const osmUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`;
    try {
      await Share.share({
        title: place.name,
        message: `${place.name}\n${place.address}\n${osmUrl}`,
        url: osmUrl,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleCall = () => {
    if (place.phone) {
      const cleanPhone = place.phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`);
    }
  };

  const handleOpenWebsite = () => {
    if (place.website) {
      const url = place.website.startsWith('http')
        ? place.website
        : `https://${place.website}`;
      Linking.openURL(url);
    }
  };

  return (
    <View
      style={[
        styles.sheetWrapper,
        isTablet ? styles.tabletCard : styles.mobileSheet,
        {
          paddingBottom: isTablet ? 20 : insets.bottom + 12,
        },
      ]}
    >
      {/* Mobile Drag Indicator */}
      {!isTablet && <View style={styles.dragHandle} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.placeName} numberOfLines={2}>
              {place.name}
            </Text>
            <View style={styles.badgeRow}>
              {place.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{place.category}</Text>
                </View>
              )}
              {distMeters != null && (
                <Text style={styles.distanceText}>
                  {formatDistance(distMeters)} away
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedPlace(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color="#5f6368" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          <TouchableOpacity style={styles.primaryAction} onPress={handleDirections}>
            <Navigation size={18} color="#ffffff" />
            <Text style={styles.primaryActionText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, saved && styles.secondaryActionActive]}
            onPress={handleSaveToggle}
          >
            <Bookmark
              size={18}
              color={saved ? '#1a73e8' : '#3c4043'}
              fill={saved ? '#1a73e8' : 'transparent'}
            />
            <Text
              style={[
                styles.secondaryActionText,
                saved && styles.secondaryActionTextActive,
              ]}
            >
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryAction} onPress={handleShare}>
            <Share2 size={18} color="#3c4043" />
            <Text style={styles.secondaryActionText}>Share</Text>
          </TouchableOpacity>

          {place.phone && (
            <TouchableOpacity style={styles.secondaryAction} onPress={handleCall}>
              <Phone size={18} color="#3c4043" />
              <Text style={styles.secondaryActionText}>Call</Text>
            </TouchableOpacity>
          )}

          {place.website && (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleOpenWebsite}
            >
              <Globe size={18} color="#3c4043" />
              <Text style={styles.secondaryActionText}>Website</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Details List */}
        <View style={styles.detailsList}>
          <View style={styles.detailItem}>
            <MapPin size={18} color="#5f6368" style={styles.detailIcon} />
            <Text style={styles.detailText}>{place.address}</Text>
          </View>

          {place.phone && (
            <TouchableOpacity style={styles.detailItem} onPress={handleCall}>
              <Phone size={18} color="#5f6368" style={styles.detailIcon} />
              <Text style={[styles.detailText, styles.linkText]}>
                {place.phone}
              </Text>
            </TouchableOpacity>
          )}

          {place.website && (
            <TouchableOpacity
              style={styles.detailItem}
              onPress={handleOpenWebsite}
            >
              <Globe size={18} color="#5f6368" style={styles.detailIcon} />
              <Text
                style={[styles.detailText, styles.linkText]}
                numberOfLines={1}
              >
                {place.website}
              </Text>
            </TouchableOpacity>
          )}

          {place.openingHours && (
            <View style={styles.detailItem}>
              <Clock size={18} color="#5f6368" style={styles.detailIcon} />
              <Text style={styles.detailText}>{place.openingHours}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    zIndex: 95,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  mobileSheet: {
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '65%',
  },
  tabletCard: {
    left: 20,
    bottom: 30,
    width: 380,
    borderRadius: 20,
    padding: 20,
    maxHeight: 520,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dadce0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  scrollContainer: {
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    color: '#70757a',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  secondaryActionActive: {
    backgroundColor: '#e8f0fe',
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  secondaryActionText: {
    color: '#3c4043',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryActionTextActive: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  detailsList: {
    paddingTop: 12,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#3c4043',
    lineHeight: 20,
  },
  linkText: {
    color: '#1a73e8',
  },
});
