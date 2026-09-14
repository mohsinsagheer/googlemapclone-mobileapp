import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ArrowUpDown,
  Car,
  Bus,
  Footprints,
  Bike,
  Circle,
  MapPin,
  Clock,
  Milestone,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCw,
} from 'lucide-react-native';
import { useMapStore } from '../store/mapStore';
import { getRoute, formatDistance, formatDuration, geocodeSearch } from '../services/geoService';
import { TravelMode, SearchResult } from '../types/map-types';

const MODES: { id: TravelMode; label: string; icon: any }[] = [
  { id: 'driving', label: 'Drive', icon: Car },
  { id: 'transit', label: 'Transit', icon: Bus },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'cycling', label: 'Bike', icon: Bike },
];

export default function DirectionsModal() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    directionsMode,
    setDirectionsMode,
    origin,
    setOrigin,
    destination,
    setDestination,
    travelMode,
    setTravelMode,
    route,
    setRoute,
    routeLoading,
    setRouteLoading,
    userLocation,
    language,
  } = useMapStore();

  const [editingField, setEditingField] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Compute route whenever origin, destination, or travelMode changes
  useEffect(() => {
    if (!directionsMode) return;
    if (!origin || !destination) {
      setRoute(null);
      return;
    }

    let isMounted = true;
    setRouteLoading(true);

    getRoute(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
      travelMode
    ).then((r) => {
      if (!isMounted) return;
      setRoute(r);
      setRouteLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [directionsMode, origin, destination, travelMode, setRoute, setRouteLoading]);

  // Handle autocomplete when picking origin or destination
  useEffect(() => {
    if (!editingField || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeSearch(searchQuery, language);
        setSearchResults(results);
      } catch (err) {
        console.warn('Directions search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editingField, searchQuery, language]);

  if (!directionsMode) return null;

  const handleSwap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSelectSearchResult = (item: SearchResult) => {
    if (editingField === 'origin') {
      setOrigin(item);
    } else {
      setDestination(item);
    }
    setEditingField(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSetCurrentLocation = () => {
    if (!userLocation) return;
    const userItem: SearchResult = {
      id: 'user_location',
      name: 'Your Location',
      address: 'Current device location',
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
    if (editingField === 'origin') {
      setOrigin(userItem);
    } else {
      setDestination(userItem);
    }
    setEditingField(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderManeuverIcon = (maneuver?: string) => {
    if (!maneuver) return <ArrowUp size={18} color="#1a73e8" />;
    const m = maneuver.toLowerCase();
    if (m.includes('right')) return <CornerUpRight size={18} color="#1a73e8" />;
    if (m.includes('left')) return <CornerUpLeft size={18} color="#1a73e8" />;
    if (m.includes('roundabout') || m.includes('rotary')) {
      return <RotateCw size={18} color="#1a73e8" />;
    }
    return <ArrowUp size={18} color="#1a73e8" />;
  };

  return (
    <View
      style={[
        styles.panelContainer,
        isTablet ? styles.tabletPanel : styles.mobilePanel,
        { paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12) },
      ]}
    >
      {/* Top Header with Back Button and Inputs */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setDirectionsMode(false);
            setEditingField(null);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color="#3c4043" />
        </TouchableOpacity>

        {/* Inputs container */}
        <View style={styles.inputsColumn}>
          {/* Origin Input */}
          <TouchableOpacity
            style={[styles.inputRow, editingField === 'origin' && styles.inputRowActive]}
            onPress={() => {
              setEditingField('origin');
              setSearchQuery(origin?.name || '');
            }}
          >
            <Circle size={12} color="#34a853" style={styles.inputBullet} />
            <Text
              style={[styles.inputText, !origin && styles.inputPlaceholder]}
              numberOfLines={1}
            >
              {origin ? origin.name : 'Choose starting point'}
            </Text>
          </TouchableOpacity>

          {/* Destination Input */}
          <TouchableOpacity
            style={[
              styles.inputRow,
              editingField === 'destination' && styles.inputRowActive,
            ]}
            onPress={() => {
              setEditingField('destination');
              setSearchQuery(destination?.name || '');
            }}
          >
            <MapPin size={14} color="#ea4335" style={styles.inputBullet} />
            <Text
              style={[styles.inputText, !destination && styles.inputPlaceholder]}
              numberOfLines={1}
            >
              {destination ? destination.name : 'Choose destination'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
          <ArrowUpDown size={18} color="#5f6368" />
        </TouchableOpacity>
      </View>

      {/* Editing Search Overlay */}
      {editingField ? (
        <View style={styles.searchPicker}>
          <View style={styles.searchInputRow}>
            <TextInput
              style={styles.pickerInput}
              placeholder={`Search for ${editingField}...`}
              placeholderTextColor="#70757a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchLoading && (
              <ActivityIndicator size="small" color="#1a73e8" style={{ marginRight: 8 }} />
            )}
          </View>

          {/* Use current location shortcut */}
          {userLocation && (
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={handleSetCurrentLocation}
            >
              <Circle size={14} color="#1a73e8" style={{ marginRight: 10 }} />
              <Text style={styles.currentLocationText}>Your location</Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.pickerResults} keyboardShouldPersistTaps="handled">
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.pickerItem}
                onPress={() => handleSelectSearchResult(item)}
              >
                <MapPin size={16} color="#70757a" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerItemTitle}>{item.name}</Text>
                  <Text style={styles.pickerItemSubtitle} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <>
          {/* Travel Mode Switcher */}
          <View style={styles.modeTabsRow}>
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = travelMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modeTab, isSelected && styles.modeTabActive]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setTravelMode(m.id);
                  }}
                >
                  <Icon
                    size={20}
                    color={isSelected ? '#1a73e8' : '#5f6368'}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      isSelected && styles.modeLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Route Summary Card */}
          {routeLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1a73e8" />
              <Text style={styles.loadingText}>Calculating best route...</Text>
            </View>
          ) : route ? (
            <View style={styles.routeContent}>
              <View style={styles.routeSummaryHeader}>
                <View>
                  <Text style={styles.etaText}>
                    {formatDuration(route.duration)}
                  </Text>
                  <Text style={styles.distanceText}>
                    {formatDistance(route.distance)} · Fastest route
                  </Text>
                </View>
              </View>

              {/* Turn-by-turn Step List */}
              <ScrollView
                style={styles.stepsList}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.stepsSectionHeader}>Step-by-step navigation</Text>
                {route.steps.map((step, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <View style={styles.stepIconBox}>
                      {renderManeuverIcon(step.maneuver)}
                    </View>
                    <View style={styles.stepDetails}>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                      {step.distance > 0 && (
                        <Text style={styles.stepDistance}>
                          {formatDistance(step.distance)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noRouteContainer}>
              <Text style={styles.noRouteText}>
                {origin && destination
                  ? 'No driving or transit route found between these locations.'
                  : 'Select an origin and destination to preview directions.'}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 110,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  mobilePanel: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabletPanel: {
    left: 20,
    top: 20,
    bottom: 30,
    width: 420,
    borderRadius: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  backBtn: {
    padding: 8,
    marginRight: 6,
  },
  inputsColumn: {
    flex: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inputRowActive: {
    backgroundColor: '#e8f0fe',
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  inputBullet: {
    marginRight: 8,
  },
  inputText: {
    fontSize: 14,
    color: '#202124',
    flex: 1,
  },
  inputPlaceholder: {
    color: '#70757a',
  },
  swapBtn: {
    padding: 10,
    marginLeft: 6,
  },
  modeTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  modeTab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 2,
  },
  modeTabActive: {
    backgroundColor: '#e8f0fe',
  },
  modeLabel: {
    fontSize: 11,
    color: '#70757a',
    fontWeight: '500',
  },
  modeLabelActive: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#5f6368',
  },
  routeContent: {
    flex: 1,
  },
  routeSummaryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  etaText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#188038',
  },
  distanceText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
  },
  stepsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepsSectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#70757a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f3f4',
  },
  stepIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDetails: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#202124',
    fontWeight: '500',
    lineHeight: 20,
  },
  stepDistance: {
    fontSize: 12,
    color: '#70757a',
    marginTop: 4,
  },
  noRouteContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noRouteText: {
    fontSize: 14,
    color: '#70757a',
    textAlign: 'center',
  },
  searchPicker: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  pickerInput: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
    paddingVertical: 10,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eaed',
  },
  currentLocationText: {
    fontSize: 15,
    color: '#1a73e8',
    fontWeight: '600',
  },
  pickerResults: {
    flex: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f3f4',
  },
  pickerItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  pickerItemSubtitle: {
    fontSize: 12,
    color: '#70757a',
    marginTop: 2,
  },
});
