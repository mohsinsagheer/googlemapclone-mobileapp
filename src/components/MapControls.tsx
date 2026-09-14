import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  Layers,
  Locate,
  Plus,
  Minus,
  Compass,
  Check,
  X,
  Map,
  Globe,
  Mountain,
} from 'lucide-react-native';
import { useMapStore } from '../store/mapStore';
import { MapLayerType } from '../types/map-types';

const LAYER_OPTIONS: { id: MapLayerType; label: string; icon: any }[] = [
  { id: 'default', label: 'Default', icon: Map },
  { id: 'satellite', label: 'Satellite', icon: Globe },
  { id: 'hybrid', label: 'Hybrid', icon: Layers },
  { id: 'terrain', label: 'Terrain', icon: Mountain },
];

export default function MapControls() {
  const insets = useSafeAreaInsets();
  const [layersModalVisible, setLayersModalVisible] = useState(false);

  const {
    layer,
    setLayer,
    userLocation,
    setUserLocation,
    userLocationLoading,
    setUserLocationLoading,
    setUserLocationError,
    flyToTarget,
    triggerZoomIn,
    triggerZoomOut,
    triggerResetNorth,
    selectedPlace,
    directionsMode,
  } = useMapStore();

  const handleLocateMe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable on web
    }

    setUserLocationLoading(true);
    setUserLocationError(null);

    // If on Web, use standard navigator.geolocation for 100% reliable browser support
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setUserLocationLoading(false);
          flyToTarget(coords, 16);
        },
        (err) => {
          setUserLocationLoading(false);
          setUserLocationError(err.message || 'Could not get location');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocationLoading(false);
        setUserLocationError('Location permission denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in settings to center the map on your location.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };

      setUserLocation(coords);
      setUserLocationLoading(false);
      flyToTarget(coords, 16);
    } catch (err: any) {
      console.warn('Geolocation error:', err);
      setUserLocationLoading(false);
      setUserLocationError(err?.message || 'Could not determine location');
    }
  };

  const handleZoomIn = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    triggerZoomIn();
  };

  const handleZoomOut = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    triggerZoomOut();
  };

  const handleResetNorth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    triggerResetNorth();
  };

  // Adjust bottom offset if PlaceDetails sheet is visible
  const bottomOffset =
    insets.bottom +
    (selectedPlace && !directionsMode
      ? Platform.OS === 'ios'
        ? 240
        : 220
      : 24);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            bottom: bottomOffset,
            right: 14,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Layers Button */}
        <TouchableOpacity
          style={[styles.circleBtn, layersModalVisible && styles.btnActive]}
          onPress={() => setLayersModalVisible(true)}
          activeOpacity={0.8}
        >
          <Layers size={20} color="#3c4043" />
        </TouchableOpacity>

        {/* Locate Me Button */}
        <TouchableOpacity
          style={[
            styles.circleBtn,
            userLocation && styles.btnActive,
            userLocationLoading && styles.btnLoading,
          ]}
          onPress={handleLocateMe}
          activeOpacity={0.8}
          disabled={userLocationLoading}
        >
          {userLocationLoading ? (
            <ActivityIndicator size="small" color="#1a73e8" />
          ) : (
            <Locate
              size={20}
              color={userLocation ? '#1a73e8' : '#3c4043'}
            />
          )}
        </TouchableOpacity>

        {/* Zoom In & Zoom Out Split Pill */}
        <View style={styles.zoomPill}>
          <TouchableOpacity
            style={styles.zoomHalf}
            onPress={handleZoomIn}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#3c4043" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
            style={styles.zoomHalf}
            onPress={handleZoomOut}
            activeOpacity={0.7}
          >
            <Minus size={18} color="#3c4043" />
          </TouchableOpacity>
        </View>

        {/* Compass Button */}
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleResetNorth}
          activeOpacity={0.8}
        >
          <Compass size={20} color="#3c4043" />
        </TouchableOpacity>
      </View>

      {/* Layer Selector Modal */}
      <Modal
        visible={layersModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLayersModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLayersModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Map Type</Text>
              <TouchableOpacity
                onPress={() => setLayersModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsGrid}>
              {LAYER_OPTIONS.map((opt) => {
                const isSelected = layer === opt.id;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.layerOption,
                      isSelected && styles.layerOptionSelected,
                    ]}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setLayer(opt.id);
                      setLayersModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <IconComponent
                      size={18}
                      color={isSelected ? '#1a73e8' : '#5f6368'}
                    />
                    <Text
                      style={[
                        styles.layerOptionLabel,
                        isSelected && styles.layerOptionLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={14} color="#1a73e8" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    gap: 10,
    zIndex: 80,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  btnActive: {
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  btnLoading: {
    backgroundColor: '#f8f9fa',
  },
  zoomPill: {
    width: 44,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  zoomHalf: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8eaed',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    width: 280,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  layerOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e8eaed',
    gap: 6,
  },
  layerOptionSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#1a73e8',
  },
  layerOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3c4043',
    flex: 1,
  },
  layerOptionLabelSelected: {
    color: '#1a73e8',
    fontWeight: '700',
  },
});
