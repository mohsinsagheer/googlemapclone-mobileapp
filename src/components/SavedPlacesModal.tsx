import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, X, Trash2, MapPin, Navigation } from 'lucide-react-native';
import { useMapStore } from '../store/mapStore';
import { SavedPlace } from '../types/map-types';

export default function SavedPlacesModal() {
  const insets = useSafeAreaInsets();
  const {
    savedPlaces,
    savedPlacesModalVisible,
    setSavedPlacesModalVisible,
    setSelectedPlace,
    flyToTarget,
    toggleSavedPlace,
    setDirectionsMode,
    setDestination,
    userLocation,
    setOrigin,
  } = useMapStore();

  const handleSelect = (place: SavedPlace) => {
    setSelectedPlace(place);
    setSavedPlacesModalVisible(false);
    flyToTarget({ lat: place.lat, lng: place.lng }, 16);
  };

  const handleDirections = (place: SavedPlace) => {
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
    setSavedPlacesModalVisible(false);
  };

  const handleDelete = async (place: SavedPlace) => {
    await toggleSavedPlace(place);
  };

  return (
    <Modal
      visible={savedPlacesModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setSavedPlacesModalVisible(false)}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bookmark size={22} color="#1a73e8" fill="#1a73e8" />
              <Text style={styles.title}>Saved Places</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{savedPlaces.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSavedPlacesModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#5f6368" />
            </TouchableOpacity>
          </View>

          {savedPlaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bookmark size={36} color="#9aa0a6" />
              </View>
              <Text style={styles.emptyTitle}>No saved places yet</Text>
              <Text style={styles.emptySubtitle}>
                When you find places you love, tap the bookmark icon to save them for easy access later.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedPlaces}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.placeIconBox}>
                      <MapPin size={18} color="#ea4335" />
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.placeAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                      {item.category && (
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDirections(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Navigation size={18} color="#1a73e8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={18} color="#d93025" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
  },
  countBadge: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a73e8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 12,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  placeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fce8e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  placeAddress: {
    fontSize: 12,
    color: '#70757a',
    marginTop: 2,
  },
  catBadge: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  catBadgeText: {
    fontSize: 10,
    color: '#5f6368',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#70757a',
    textAlign: 'center',
    lineHeight: 20,
  },
});
