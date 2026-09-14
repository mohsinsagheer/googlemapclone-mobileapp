# Maps — React Native Responsive Mobile App

A cross-platform, responsive mobile maps app built with **React Native**, **Expo**, and free OpenStreetMap data. Works natively on **iOS**, **Android**, and **Web**, with responsive layouts for both mobile phones and tablets.

---

## Features

- 🗺️ **Interactive Full-Screen Map**: Smooth pan, pinch-to-zoom, and flyTo camera transitions.
- 🔍 **Search with Autocomplete**: Search places worldwide using Nominatim geocoding with instant result preview.
- 🏷️ **12 Category Chips Carousel**: Restaurants, Coffee, Gas, Hotels, Groceries, Pharmacy, ATMs, Parks, Shopping, Hospitals, Transit, and Gyms.
- 🧭 **Map Controls**:
  - **Layers Switcher**: Toggle between Map (Streets), Satellite (Esri Imagery), Hybrid (Aerial + street labels), and Terrain (topographic).
  - **My Location**: High-accuracy native GPS with permission handling via `expo-location`.
  - **Zoom In / Out**: Responsive touch controls.
  - **Compass**: Instant north reset.
- 📍 **Place Details Bottom Sheet**:
  - Rich details: name, category, distance, address, phone, website, opening hours.
  - One-tap actions: **Directions**, **Save / Bookmark**, **Native Share**, **Call** (`tel:`), **Open Website**.
  - Adaptive layout: bottom sheet on phones, floating sidebar card on tablets/landscape.
- 🚗 **Turn-by-Turn Directions**:
  - Origin & Destination route calculation via OSRM.
  - 4 Travel modes: Drive, Transit, Walk, Bike with realistic ETA and distance badges.
  - Turn-by-turn maneuver steps with direction icons.
  - Dual-color route polyline (white outline + Google blue route).
- 💾 **Offline Saved Places**:
  - Persisted locally with `@react-native-async-storage/async-storage`.
  - Dedicated Saved Places modal to browse, navigate to, or remove saved bookmarks.
- 🌐 **Zero API Keys Required**: Uses OpenStreetMap, Esri, OpenTopoMap, Nominatim, Overpass API, and OSRM.

---

## Getting Started

### 1. Navigate to the mobile project

```bash
cd mobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the application

Start the Expo development server:

```bash
npx expo start
```

From the terminal menu, you can press:
- `a` — to open in an **Android Emulator**
- `i` — to open in an **iOS Simulator** (macOS)
- `w` — to open in a **Web browser**
- **Scan QR Code** with the **Expo Go** app on your physical iPhone or Android phone.

---

## Directory Structure

```
mobile/
├── App.tsx                     # Main mobile app root with SafeAreaProvider
├── app.json                    # Expo configuration & permissions
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── src/
    ├── components/
    │   ├── CategoryChips.tsx   # 12 horizontal category chips
    │   ├── DirectionsModal.tsx # Route finder & turn-by-turn navigation
    │   ├── MapControls.tsx     # GPS locate, layers modal, zoom, compass
    │   ├── MapEngine.tsx       # Interactive Leaflet map bridge
    │   ├── PlaceDetailsSheet.tsx # Bottom sheet / tablet card for places
    │   ├── SavedPlacesModal.tsx# Saved places management modal
    │   └── SearchBar.tsx       # Floating search pill with autocomplete
    ├── constants/
    │   └── categories.ts       # 12 category definitions
    ├── services/
    │   └── geoService.ts       # Client-side Nominatim, Overpass, OSRM helpers
    ├── store/
    │   └── mapStore.ts         # Zustand store with AsyncStorage persistence
    └── types/
        └── map-types.ts        # Shared TypeScript interfaces
```
