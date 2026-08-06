import L from 'leaflet';

/**
 * Creates custom divIcon markers for Leaflet with standard SVG graphics
 */
export function createAmbulanceIcon(bearing = 0) {
  const rot = Number(bearing) || 0;
  return L.divIcon({
    className: 'custom-ambulance-marker',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background-color: #C62828;
        border: 2px solid #FFFFFF;
        border-radius: 8px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transform: rotate(${rot}deg);
        transition: transform 300ms ease;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 10H6M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.3-.7L18.4 9.7a1 1 0 0 0-.7-.3H14"/>
          <circle cx="7.5" cy="18.5" r="2.5"/>
          <circle cx="16.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

export function createHospitalIcon(isSelected = false) {
  const bg = isSelected ? '#172033' : '#16794A';
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${bg};
        border: 2px solid #FFFFFF;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12M6 12h12"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export function createJunctionIcon(signalState = 'NORMAL') {
  let bg = '#172033';
  let pulseBorder = '';
  if (signalState === 'PREPARING') {
    bg = '#B54708';
  } else if (signalState === 'EMERGENCY_PRIORITY') {
    bg = '#16794A';
    pulseBorder = 'outline: 3px solid #16794A; outline-offset: 2px;';
  } else if (signalState === 'CLEARED') {
    bg = '#0D9488';
  }

  return L.divIcon({
    className: 'custom-junction-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${bg};
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        ${pulseBorder}
        transition: all 300ms ease;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="7" y="2" width="10" height="20" rx="3"/>
          <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function createIncidentIcon() {
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: #B54708;
        border: 2px solid #FFFFFF;
        border-radius: 6px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function createCameraIcon(status = 'CLEAR') {
  const bg = status === 'OBSTRUCTION_DETECTED' ? '#C62828' : '#175CD3';
  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${bg};
        border: 2px solid #FFFFFF;
        border-radius: 6px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function createVehicleIcon(warningState = 'STANDBY') {
  const bg = warningState === 'ACTIVE' ? '#C62828' : '#475467';
  const pulse = warningState === 'ACTIVE' ? 'outline: 3px solid #C62828; outline-offset: 2px;' : '';

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${bg};
        border: 2px solid #FFFFFF;
        border-radius: 6px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        ${pulse}
        transition: all 300ms ease;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function createDirectionalSignalIcon(directionLabel = 'N', state = 'RED') {
  const isGreen = state === 'GREEN';
  const isAmber = state === 'AMBER';
  const isRed = state === 'RED' || (!isGreen && !isAmber);

  const redBg = isRed ? '#EF4444' : '#450A0A';
  const amberBg = isAmber ? '#F59E0B' : '#451A03';
  const greenBg = isGreen ? '#10B981' : '#064E3B';

  const redShadow = isRed ? 'box-shadow: 0 0 6px #EF4444;' : '';
  const amberShadow = isAmber ? 'box-shadow: 0 0 6px #F59E0B;' : '';
  const greenShadow = isGreen ? 'box-shadow: 0 0 6px #10B981;' : '';

  return L.divIcon({
    className: 'custom-directional-signal-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      ">
        <div style="
          font-family: Inter, sans-serif;
          font-size: 10px;
          font-weight: 800;
          color: #182230;
          background: #FFFFFF;
          border: 1px solid #D0D5DD;
          border-radius: 4px;
          padding: 1px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          line-height: 1;
        ">
          ${directionLabel}
        </div>
        <div style="
          width: 20px;
          height: 42px;
          background-color: #1E293B;
          border: 2px solid #FFFFFF;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-around;
          padding: 3px 0;
        ">
          <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${redBg}; ${redShadow}"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${amberBg}; ${amberShadow}"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${greenBg}; ${greenShadow}"></div>
        </div>
      </div>
    `,
    iconSize: [26, 60],
    iconAnchor: [13, 30],
    popupAnchor: [0, -30],
  });
}

export function createCongestionIcon() {
  return L.divIcon({
    className: 'custom-congestion-icon',
    html: `
      <div style="
        background-color: #FEF3F2;
        border: 2px solid #C62828;
        color: #C62828;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 800;
        font-family: sans-serif;
        box-shadow: 0 2px 8px rgba(198,40,40,0.3);
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #C62828;"></span>
        HEAVY CONGESTION (+6 min)
      </div>
    `,
    iconSize: [170, 26],
    iconAnchor: [85, 13],
    popupAnchor: [0, -15],
  });
}
