import L from 'leaflet';

// Build a Google-Maps-style teardrop marker
export function createPinIcon(color: string = '#ea4335', emoji: string = '📍', selected: boolean = false): L.DivIcon {
  const size = selected ? 44 : 32;
  const html = `
    <div class="gm-marker-pin" style="width:${size}px;height:${size * 1.34}px">
      <svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);font-size:${size * 0.4}px;line-height:1;">${emoji}</div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gm-marker',
    iconSize: [size, size * 1.34],
    iconAnchor: [size / 2, size * 1.34],
    popupAnchor: [0, -size * 1.34 + 4],
  });
}

// User location dot with pulse
export function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div style="position:relative;width:18px;height:18px;">
      <div class="gm-user-location-pulse"></div>
      <div class="gm-user-location"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gm-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Origin / destination markers for routing mode
export function createRouteEndpointIcon(type: 'origin' | 'destination'): L.DivIcon {
  const color = type === 'origin' ? '#1a73e8' : '#ea4335';
  const label = type === 'origin' ? 'A' : 'B';
  const html = `
    <div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:14px;
    ">
      <span style="transform:rotate(45deg);">${label}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gm-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}
