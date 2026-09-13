import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useMapStore } from '../store/mapStore';
import { CATEGORIES } from '../constants/categories';
import { SearchResult } from '../types/map-types';
import { LEAFLET_CSS, LEAFLET_JS } from '../constants/leafletAssets';

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
${LEAFLET_CSS}
  </style>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #e8eaed;
      overflow: hidden;
      touch-action: pan-x pan-y;
      -webkit-user-select: none;
      user-select: none;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.7) !important;
    }
    .user-location-marker {
      width: 22px;
      height: 22px;
      position: relative;
    }
    .user-location-pulse {
      position: absolute;
      width: 28px;
      height: 28px;
      left: -3px;
      top: -3px;
      border-radius: 50%;
      background: rgba(66, 133, 244, 0.35);
      animation: userPulse 2s infinite ease-out;
    }
    .user-location-dot {
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      top: 3px;
      border-radius: 50%;
      background: #1a73e8;
      border: 3px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    @keyframes userPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .poi-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate(-50%, -100%);
      transition: transform 0.15s ease-out;
    }
    .poi-pin-body {
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid #ffffff;
    }
    .poi-pin-emoji {
      transform: rotate(45deg);
      font-size: 14px;
    }
    .poi-pin.selected .poi-pin-body {
      transform: rotate(-45deg) scale(1.25);
      border-color: #fbbc04;
      box-shadow: 0 4px 12px rgba(0,0,0,0.45);
    }
    .endpoint-pin {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      font-size: 12px;
      color: #ffffff;
      font-weight: bold;
    }
  </style>
  <script>
${LEAFLET_JS}
  </script>
</head>
<body>
  <div id="map"></div>
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      var msg = String(message || '');
      if (msg === 'Script error.' && !source && !lineno) {
        return true;
      }
      var errText = (error && error.message) ? error.message : msg;
      if (source) {
        errText += ' (' + source + ':' + lineno + ')';
      }
      postToRN({ type: 'MAP_ERROR', error: errText });
      return true;
    };

    var map = null;
    var currentTileLayer = null;
    var currentLabelsLayer = null;
    var userMarker = null;
    var markersLayer = null;
    var routePolylineOuter = null;
    var routePolylineInner = null;
    var endpointMarkers = [];
    var isMapReady = false;

    var TILES = {
      default: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attribution: 'Esri Satellite'
      },
      hybrid: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attribution: 'Esri Hybrid'
      },
      terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
        attribution: 'OpenTopoMap'
      }
    };

    var LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

    function postToRN(data) {
      try {
        var str = JSON.stringify(data);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(str);
        } else if (window.parent && window.parent !== window) {
          window.parent.postMessage(str, '*');
        }
      } catch (e) {}
    }

    function handleAppCommand(d) {
      try {
        if (!d || !d.type) return;
        if (d.type === 'SET_MARKERS') {
          setMarkers(d.places || [], d.selectedId || null, d.categoryColor || '', d.categoryEmoji || '');
        } else if (d.type === 'SET_LAYER') {
          setLayer(d.layer);
        } else if (d.type === 'SET_USER_LOCATION') {
          setUserLocation(d.lat, d.lng);
        } else if (d.type === 'FLY_TO') {
          flyTo(d.lat, d.lng, d.zoom);
        } else if (d.type === 'SET_ROUTE') {
          setRoute(d.geometry, d.origin, d.destination);
        } else if (d.type === 'CLEAR_ROUTE') {
          clearRoute();
        } else if (d.type === 'ZOOM_IN') {
          zoomIn();
        } else if (d.type === 'ZOOM_OUT') {
          zoomOut();
        } else if (d.type === 'INVALIDATE_SIZE') {
          safeInit();
          if (map) map.invalidateSize();
        }
      } catch (err) {
        postToRN({ type: 'MAP_ERROR', error: 'Command ' + (d && d.type) + ' failed: ' + (err && err.message ? err.message : String(err)) });
      }
    }

    window.addEventListener('message', function(event) {
      try {
        var d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (d) {
          handleAppCommand(d);
        }
      } catch (e) {}
    });

    document.addEventListener('message', function(event) {
      try {
        var d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (d) {
          handleAppCommand(d);
        }
      } catch (e) {}
    });

    function initMap() {
      if (map) return;
      var el = document.getElementById('map');
      if (!el) {
        setTimeout(initMap, 50);
        return;
      }
      if (typeof L === 'undefined') {
        setTimeout(initMap, 50);
        return;
      }
      if (el._leaflet_id) {
        return;
      }

      try {
        map = L.map('map', {
          center: [40.7589, -73.9851],
          zoom: 13,
          zoomControl: false,
          attributionControl: true
        });

        markersLayer = L.layerGroup().addTo(map);
        setLayer('default');

        map.on('click', function(e) {
          postToRN({ type: 'MAP_CLICK', lat: e.latlng.lat, lng: e.latlng.lng });
        });

        map.on('moveend', function() {
          if (!map) return;
          var c = map.getCenter();
          postToRN({ type: 'MAP_MOVED', lat: c.lat, lng: c.lng, zoom: map.getZoom() });
        });

        setTimeout(function() { if (map) map.invalidateSize(); }, 100);
        setTimeout(function() { if (map) map.invalidateSize(); }, 300);
        setTimeout(function() { if (map) map.invalidateSize(); }, 800);
        setTimeout(function() { if (map) map.invalidateSize(); }, 1500);

        isMapReady = true;
        window.map = map;
        postToRN({ type: 'MAP_READY' });
      } catch (err) {
        postToRN({ type: 'MAP_ERROR', error: 'initMap error: ' + (err && err.message ? err.message : String(err)) });
      }
    }

    function setLayer(layerId) {
      if (!map) return;
      try {
        var cfg = TILES[layerId] || TILES.default;
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        if (currentLabelsLayer) {
          map.removeLayer(currentLabelsLayer);
          currentLabelsLayer = null;
        }

        currentTileLayer = L.tileLayer(cfg.url, {
          maxZoom: cfg.maxZoom,
          attribution: cfg.attribution,
          subdomains: ['a', 'b', 'c']
        }).addTo(map);

        if (layerId === 'satellite' || layerId === 'hybrid') {
          currentLabelsLayer = L.tileLayer(LABELS_URL, {
            maxZoom: 19,
            opacity: 0.95
          }).addTo(map);
        }
      } catch (e) {}
    }

    function setUserLocation(lat, lng) {
      if (!map) return;
      try {
        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          var icon = L.divIcon({
            className: '',
            html: '<div class="user-location-marker"><div class="user-location-pulse"></div><div class="user-location-dot"></div></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          userMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
          userMarker.on('click', function() {
            postToRN({ type: 'USER_MARKER_CLICK', lat: lat, lng: lng });
          });
        }
      } catch (e) {}
    }

    function setMarkers(places, selectedId, categoryColor, categoryEmoji) {
      if (!map || !markersLayer) return;
      try {
        markersLayer.clearLayers();

        places.forEach(function(p) {
          var isSel = p.id === selectedId;
          var color = categoryColor || '#ea4335';
          var emoji = categoryEmoji || (p.icon || '📍');

          var html = '<div class="poi-pin ' + (isSel ? 'selected' : '') + '">' +
            '<div class="poi-pin-body" style="background-color:' + color + ';">' +
              '<span class="poi-pin-emoji">' + emoji + '</span>' +
            '</div>' +
          '</div>';

          var icon = L.divIcon({
            className: '',
            html: html,
            iconSize: [32, 40],
            iconAnchor: [16, 40]
          });

          var m = L.marker([p.lat, p.lng], { icon: icon, zIndexOffset: isSel ? 500 : 10 });
          m.on('click', function() {
            postToRN({ type: 'MARKER_CLICK', placeId: p.id });
          });
          markersLayer.addLayer(m);
        });
      } catch (e) {}
    }

    function setRoute(geometry, origin, destination) {
      if (!map) return;
      try {
        if (routePolylineOuter) map.removeLayer(routePolylineOuter);
        if (routePolylineInner) map.removeLayer(routePolylineInner);
        endpointMarkers.forEach(function(m) { map.removeLayer(m); });
        endpointMarkers = [];

        if (!geometry || geometry.length === 0) return;

        routePolylineOuter = L.polyline(geometry, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        routePolylineInner = L.polyline(geometry, {
          color: '#1a73e8',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        if (origin) {
          var startIcon = L.divIcon({
            className: '',
            html: '<div class="endpoint-pin" style="background:#34a853;">A</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          var m1 = L.marker([origin.lat, origin.lng], { icon: startIcon }).addTo(map);
          endpointMarkers.push(m1);
        }

        if (destination) {
          var endIcon = L.divIcon({
            className: '',
            html: '<div class="endpoint-pin" style="background:#ea4335;">B</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          var m2 = L.marker([destination.lat, destination.lng], { icon: endIcon }).addTo(map);
          endpointMarkers.push(m2);
        }

        map.fitBounds(geometry, { padding: [60, 60], maxZoom: 16 });
      } catch (e) {}
    }

    function clearRoute() {
      if (!map) return;
      try {
        if (routePolylineOuter) { map.removeLayer(routePolylineOuter); routePolylineOuter = null; }
        if (routePolylineInner) { map.removeLayer(routePolylineInner); routePolylineInner = null; }
        endpointMarkers.forEach(function(m) { map.removeLayer(m); });
        endpointMarkers = [];
      } catch (e) {}
    }

    function flyTo(lat, lng, zoom) {
      if (!map) return;
      try {
        map.flyTo([lat, lng], zoom || 15, { duration: 1.2 });
      } catch (e) {}
    }

    function zoomIn() { if (map) { try { map.zoomIn(); } catch(e){} } }
    function zoomOut() { if (map) { try { map.zoomOut(); } catch(e){} } }

    window.addEventListener('resize', function() {
      if (map) { try { map.invalidateSize(); } catch(e){} }
    });

    function safeInit() {
      if (isMapReady) return;
      initMap();
    }

    window.safeInit = safeInit;
    window.handleAppCommand = handleAppCommand;

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(safeInit, 10);
    } else {
      window.addEventListener('DOMContentLoaded', safeInit);
      window.addEventListener('load', safeInit);
      setTimeout(safeInit, 300);
    }
  </script>
</body>
</html>
`;

export default function MapEngine() {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapReadyRef = useRef(false);

  const {
    layer,
    userLocation,
    setMapCenter,
    selectedPlace,
    setSelectedPlace,
    searchResults,
    nearbyPlaces,
    activeCategory,
    route,
    origin,
    destination,
    directionsMode,
    flyTo,
    flyToZoom,
    clearFlyTo,
    zoomTrigger,
    zoomOutTrigger,
    resetNorthTrigger,
    flyToTarget,
  } = useMapStore();

  const prevZoomTrigger = useRef(zoomTrigger);
  const prevZoomOutTrigger = useRef(zoomOutTrigger);
  const prevResetTrigger = useRef(resetNorthTrigger);

  const sendCommand = (cmd: any) => {
    if (Platform.OS === 'web') {
      if (iframeRef.current) {
        try {
          iframeRef.current.contentWindow?.postMessage(cmd, '*');
        } catch (e) {
          console.warn('iframe postMessage error:', e);
        }
      }
    } else if (webViewRef.current) {
      try {
        webViewRef.current.postMessage(JSON.stringify(cmd));
      } catch (e) {}
    }
  };

  const processMessage = (data: any) => {
    if (data.type === 'MAP_READY') {
      mapReadyRef.current = true;
      setMapReady(true);
      if (userLocation) {
        sendCommand({ type: 'SET_USER_LOCATION', lat: userLocation.lat, lng: userLocation.lng });
        sendCommand({ type: 'FLY_TO', lat: userLocation.lat, lng: userLocation.lng, zoom: 14 });
      }
    } else if (data.type === 'MAP_MOVED') {
      if (data.lat != null && data.lng != null) {
        setMapCenter({ lat: data.lat, lng: data.lng });
      }
    } else if (data.type === 'MARKER_CLICK') {
      const placeId = data.placeId;
      const all = [...nearbyPlaces, ...searchResults, ...(selectedPlace ? [selectedPlace] : [])];
      const found = all.find((p) => p.id === placeId);
      if (found) {
        setSelectedPlace(found);
        flyToTarget({ lat: found.lat, lng: found.lng }, 16);
      }
    } else if (data.type === 'MAP_CLICK') {
      if (!directionsMode) {
        setSelectedPlace(null);
      }
    } else if (data.type === 'USER_MARKER_CLICK') {
      if (userLocation) {
        flyToTarget(userLocation, 17);
      }
    } else if (data.type === 'MAP_ERROR') {
      if (data.error && data.error !== 'Script error.') {
        console.warn('Leaflet WebView Error:', data.error);
      }
    }
  };

  // Web message listener
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleWebMsg = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type) {
          processMessage(data);
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('message', handleWebMsg);
    return () => window.removeEventListener('message', handleWebMsg);
  }, [userLocation, searchResults, nearbyPlaces, selectedPlace, directionsMode]);

  // Sync Layer
  useEffect(() => {
    if (!mapReady) return;
    sendCommand({ type: 'SET_LAYER', layer });
  }, [layer, mapReady]);

  // Sync User Location
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    sendCommand({ type: 'SET_USER_LOCATION', lat: userLocation.lat, lng: userLocation.lng });
  }, [userLocation, mapReady]);

  // Sync Markers (Search Results or Nearby POIs or Single Selected Place)
  useEffect(() => {
    if (!mapReady) return;

    if (directionsMode) {
      sendCommand({ type: 'SET_MARKERS', places: [], selectedId: null });
      return;
    }

    let placesToShow: SearchResult[] = [];
    if (activeCategory && nearbyPlaces.length > 0) {
      placesToShow = nearbyPlaces;
    } else if (searchResults.length > 0) {
      placesToShow = searchResults;
    } else if (selectedPlace) {
      placesToShow = [selectedPlace];
    }

    const catConfig = activeCategory
      ? CATEGORIES.find((c) => c.id === activeCategory)
      : null;

    const catColor = catConfig?.color || '#ea4335';
    const catEmoji = catConfig?.emoji || '📍';
    const selectedId = selectedPlace ? selectedPlace.id : null;

    sendCommand({
      type: 'SET_MARKERS',
      places: placesToShow,
      selectedId,
      categoryColor: catColor,
      categoryEmoji: catEmoji,
    });
  }, [
    mapReady,
    searchResults,
    nearbyPlaces,
    activeCategory,
    selectedPlace,
    directionsMode,
  ]);

  // Sync Route
  useEffect(() => {
    if (!mapReady) return;
    if (route && route.geometry && route.geometry.length > 0) {
      sendCommand({
        type: 'SET_ROUTE',
        geometry: route.geometry,
        origin,
        destination,
      });
    } else {
      sendCommand({ type: 'CLEAR_ROUTE' });
    }
  }, [route, origin, destination, mapReady]);

  // Sync flyTo camera movements
  useEffect(() => {
    if (!mapReady || !flyTo) return;
    sendCommand({
      type: 'FLY_TO',
      lat: flyTo.lat,
      lng: flyTo.lng,
      zoom: flyToZoom || 15,
    });
    clearFlyTo();
  }, [flyTo, flyToZoom, mapReady, clearFlyTo]);

  // Sync imperative zoom
  useEffect(() => {
    if (!mapReady) return;
    if (zoomTrigger !== prevZoomTrigger.current) {
      prevZoomTrigger.current = zoomTrigger;
      sendCommand({ type: 'ZOOM_IN' });
    }
  }, [zoomTrigger, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (zoomOutTrigger !== prevZoomOutTrigger.current) {
      prevZoomOutTrigger.current = zoomOutTrigger;
      sendCommand({ type: 'ZOOM_OUT' });
    }
  }, [zoomOutTrigger, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (resetNorthTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = resetNorthTrigger;
      const target = userLocation || { lat: 40.7589, lng: -73.9851 };
      sendCommand({ type: 'FLY_TO', lat: target.lat, lng: target.lng, zoom: 14 });
    }
  }, [resetNorthTrigger, mapReady, userLocation]);

  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      processMessage(data);
    } catch (e) {
      console.warn('Error parsing WebView message:', e);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {React.createElement('iframe', {
          ref: iframeRef,
          srcDoc: LEAFLET_HTML,
          style: { width: '100%', height: '100%', border: 'none' },
          title: 'Interactive Map',
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: LEAFLET_HTML,
          baseUrl: 'https://localhost',
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleNativeMessage}
        onLoadEnd={() => {
          sendCommand({ type: 'INVALIDATE_SIZE' });
        }}
        onError={(syntheticEvent) => {
          console.warn('WebView error: ', syntheticEvent.nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          console.warn('WebView HTTP error: ', syntheticEvent.nativeEvent);
        }}
        startInLoadingState={false}
      />
      {!mapReady && (
        <View style={styles.loaderContainer} pointerEvents="none">
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#e8eaed',
  },
  webview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#e8eaed',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
