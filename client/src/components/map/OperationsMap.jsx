import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { createAmbulanceIcon, createHospitalIcon, createJunctionIcon, createIncidentIcon, createCameraIcon, createVehicleIcon, createDirectionalSignalIcon, createCongestionIcon } from './MapMarker';
import { Navigation } from 'lucide-react';

// Controller component to track map movement and handle smooth, lag-free viewport updates
function MapViewController({ center, zoom, bounds, followMode, isUserInteracting, setIsUserInteracting, junctions = [], ambulanceLocation = null }) {
  const map = useMap();

  // Listen for user manual drag / pan
  useMapEvents({
    dragstart: () => setIsUserInteracting(true),
  });

  useEffect(() => {
    if (isUserInteracting || !center) return;

    if (followMode) {
      map.setView(center, map.getZoom() || 16, { animate: true, duration: 0.5 });
    } else if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }
  }, [map, center, bounds, followMode, isUserInteracting]);

  return null;
}

function OperationsMap({
  center = [12.9352, 77.6245],
  zoom = 13,
  ambulanceLocation,
  hospitals = [],
  selectedHospitalId,
  onSelectHospital,
  junctions = [],
  incidents = [],
  cameras = [],
  roadUsers = [],
  routeCoordinates = [],
  followMode = false,
  disruption = null,
}) {
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Compute map bounds if not in follow mode
  let bounds = null;
  if (!followMode) {
    if (routeCoordinates && routeCoordinates.length > 0) {
      bounds = routeCoordinates;
    } else if (ambulanceLocation) {
      const coords = [[ambulanceLocation.latitude, ambulanceLocation.longitude]];
      hospitals.forEach((h) => coords.push([h.latitude, h.longitude]));
      if (coords.length > 1) bounds = coords;
    }
  }

  const currentCenter = ambulanceLocation
    ? [ambulanceLocation.latitude, ambulanceLocation.longitude]
    : center;

  const displayRouteCoords = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length === 0) return [];
    if (!ambulanceLocation) return routeCoordinates;
    const ambPt = [ambulanceLocation.latitude, ambulanceLocation.longitude];
    return [ambPt, ...routeCoordinates];
  }, [routeCoordinates, ambulanceLocation]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={currentCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController
          center={currentCenter}
          zoom={zoom}
          bounds={bounds}
          followMode={followMode}
          isUserInteracting={isUserInteracting}
          setIsUserInteracting={setIsUserInteracting}
          junctions={junctions}
          ambulanceLocation={ambulanceLocation}
        />

        {/* Route Polyline - Extends directly from ambulance position forward to hospital destination */}
        {displayRouteCoords && displayRouteCoords.length > 0 && (
          <Polyline
            positions={displayRouteCoords}
            pathOptions={{
              color: '#C62828',
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Ambulance Marker */}
        {ambulanceLocation && (
          <Marker
            position={[ambulanceLocation.latitude, ambulanceLocation.longitude]}
            icon={createAmbulanceIcon(ambulanceLocation.bearing || 0)}
            zIndexOffset={2000}
          >
            <Popup className="ll-leaflet-popup">
              <div className="p-1 font-sans">
                <div className="text-xs font-semibold text-[#182230] mb-0.5">Ambulance AMB-1042</div>
                <div className="text-[11px] text-[#667085]">
                  {ambulanceLocation.status ? `Status: ${ambulanceLocation.status}` : 'Emergency Vehicle'}
                </div>
                <div className="text-[10px] text-[#667085] mt-1">
                  {ambulanceLocation.latitude.toFixed(4)}, {ambulanceLocation.longitude.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Congestion Disruption Marker */}
        {disruption && disruption.latitude && disruption.longitude && (
          <Marker
            position={[disruption.latitude, disruption.longitude]}
            icon={createCongestionIcon()}
            zIndexOffset={1500}
          >
            <Popup className="ll-leaflet-popup">
              <div className="p-1.5 font-sans min-w-[160px]">
                <div className="text-xs font-bold text-[#C62828] mb-0.5">HEAVY CONGESTION</div>
                <div className="text-[11px] font-semibold text-[#182230] mb-1">Estimated delay: +6 min</div>
                <div className="text-[10px] text-[#667085]">{disruption.description || 'Heavy traffic disruption ahead on corridor'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals.map((h) => {
          const isSelected = h.id === selectedHospitalId;
          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={createHospitalIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectHospital && onSelectHospital(h),
              }}
            >
              <Popup className="ll-leaflet-popup">
                <div className="p-1.5 font-sans min-w-[160px]">
                  <div className="text-xs font-semibold text-[#182230] mb-1">{h.name}</div>
                  <div className="text-[11px] text-[#667085] mb-2">{h.address}</div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#E4E7EC]">
                    <span className="text-[#16794A] font-medium">
                      {h.emergencyAvailable ? 'Emergency Ready' : 'Full Capacity'}
                    </span>
                  </div>
                  {onSelectHospital && !isSelected && (
                    <button
                      onClick={() => onSelectHospital(h)}
                      className="w-full mt-2 px-2 py-1 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-medium rounded-[6px] transition-colors"
                    >
                      Select Destination
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Junction & Four-Way Traffic Signal Markers */}
        {junctions.map((j) => {
          const distText = j.distanceMeters !== undefined
            ? (j.distanceMeters >= 1000 ? `${(j.distanceMeters / 1000).toFixed(1)} km` : `${j.distanceMeters} m`)
            : null;

          const northSig = j.signals?.find((s) => s.direction === 'NORTHBOUND');
          const southSig = j.signals?.find((s) => s.direction === 'SOUTHBOUND');
          const eastSig = j.signals?.find((s) => s.direction === 'EASTBOUND');
          const westSig = j.signals?.find((s) => s.direction === 'WESTBOUND');

          const northState = j.signalState === 'EMERGENCY_PRIORITY' ? 'GREEN' : (northSig?.state || 'RED');
          const southState = southSig?.state || 'RED';
          const eastState = j.signalState === 'EMERGENCY_PRIORITY' ? 'RED' : (eastSig?.state || 'GREEN');
          const westState = westSig?.state || 'RED';

          // Small geographic offsets (~30 meters) for 4 signals around junction center
          const northPos = [j.latitude + 0.00028, j.longitude];
          const southPos = [j.latitude - 0.00028, j.longitude];
          const eastPos = [j.latitude, j.longitude + 0.00028];
          const westPos = [j.latitude, j.longitude - 0.00028];

          return (
            <React.Fragment key={j.id}>
              {/* Central Junction Marker */}
              <Marker
                position={[j.latitude, j.longitude]}
                icon={createJunctionIcon(j.signalState)}
                zIndexOffset={900}
              >
                <Popup className="ll-leaflet-popup">
                  <div className="p-2 font-sans min-w-[200px] space-y-2">
                    <div>
                      <div className="text-xs font-bold text-[#182230]">{j.name}</div>
                      <div className="text-[11px] text-[#667085] flex items-center justify-between mt-0.5">
                        <span>Code: {j.code}</span>
                        {distText && <span className="font-semibold text-[#172033]">{distText}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Coordination State</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-[4px] text-[10px] uppercase ${
                        j.signalState === 'EMERGENCY_PRIORITY' ? 'bg-[#F0FDF4] text-[#16794A] border border-[#DCFCE7]' :
                        j.signalState === 'TRANSITION' || j.signalState === 'PREPARING_PRIORITY' ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]' :
                        j.signalState === 'CLEARED' ? 'bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]' :
                        'bg-[#F6F7F9] text-[#667085] border border-[#E4E7EC]'
                      }`}>
                        {j.signalState || 'NORMAL'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* 1. NORTH SIGNAL MARKER */}
              <Marker
                position={northPos}
                icon={createDirectionalSignalIcon('N', northState)}
                zIndexOffset={1000}
              >
                <Popup className="ll-leaflet-popup">
                  <div className="p-2 font-sans min-w-[160px]">
                    <div className="text-xs font-bold text-[#182230]">{j.name}</div>
                    <div className="text-[11px] font-semibold text-[#175CD3] mt-0.5">North Approach</div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1.5 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Signal:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase ${
                        northState === 'GREEN' ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]'
                      }`}>
                        {northState}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] mt-1">
                      <span className="text-[#667085]">Priority:</span>
                      <span className="font-medium text-[#182230]">
                        {j.signalState === 'EMERGENCY_PRIORITY' ? 'Emergency Permitted' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* 2. SOUTH SIGNAL MARKER */}
              <Marker
                position={southPos}
                icon={createDirectionalSignalIcon('S', southState)}
                zIndexOffset={1000}
              >
                <Popup className="ll-leaflet-popup">
                  <div className="p-2 font-sans min-w-[160px]">
                    <div className="text-xs font-bold text-[#182230]">{j.name}</div>
                    <div className="text-[11px] font-semibold text-[#175CD3] mt-0.5">South Approach</div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1.5 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Signal:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase ${
                        southState === 'GREEN' ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]'
                      }`}>
                        {southState}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] mt-1">
                      <span className="text-[#667085]">Priority:</span>
                      <span className="font-medium text-[#182230]">
                        {j.signalState === 'EMERGENCY_PRIORITY' ? 'Conflicting (Held Red)' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* 3. EAST SIGNAL MARKER */}
              <Marker
                position={eastPos}
                icon={createDirectionalSignalIcon('E', eastState)}
                zIndexOffset={1000}
              >
                <Popup className="ll-leaflet-popup">
                  <div className="p-2 font-sans min-w-[160px]">
                    <div className="text-xs font-bold text-[#182230]">{j.name}</div>
                    <div className="text-[11px] font-semibold text-[#175CD3] mt-0.5">East Approach</div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1.5 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Signal:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase ${
                        eastState === 'GREEN' ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]'
                      }`}>
                        {eastState}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] mt-1">
                      <span className="text-[#667085]">Priority:</span>
                      <span className="font-medium text-[#182230]">
                        {j.signalState === 'EMERGENCY_PRIORITY' ? 'Conflicting (Held Red)' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* 4. WEST SIGNAL MARKER */}
              <Marker
                position={westPos}
                icon={createDirectionalSignalIcon('W', westState)}
                zIndexOffset={1000}
              >
                <Popup className="ll-leaflet-popup">
                  <div className="p-2 font-sans min-w-[160px]">
                    <div className="text-xs font-bold text-[#182230]">{j.name}</div>
                    <div className="text-[11px] font-semibold text-[#175CD3] mt-0.5">West Approach</div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1.5 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Signal:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase ${
                        westState === 'GREEN' ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]'
                      }`}>
                        {westState}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#E4E7EC]">
                      <span className="text-[#667085]">Priority:</span>
                      <span className="font-medium text-[#182230]">
                        {j.signalState === 'EMERGENCY_PRIORITY' ? 'Conflicting (Held Red)' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Road Incident Markers */}
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={createIncidentIcon()}
          >
            <Popup className="ll-leaflet-popup">
              <div className="p-1 font-sans">
                <div className="text-xs font-bold text-[#B54708] flex items-center gap-1">
                  <span>ROAD INCIDENT</span>
                </div>
                <div className="text-xs font-semibold text-[#182230] mt-1">{inc.title}</div>
                <div className="text-[11px] text-[#667085] mt-0.5">Severity: {inc.severity}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* AI Camera Markers */}
        {cameras.map((cam) => (
          <Marker
            key={cam.id}
            position={[cam.latitude, cam.longitude]}
            icon={createCameraIcon(cam.status)}
          >
            <Popup className="ll-leaflet-popup">
              <div className="p-1 font-sans">
                <div className="text-xs font-bold text-[#175CD3] flex items-center gap-1">
                  <span>AI CAMERA POINT</span>
                </div>
                <div className="text-xs font-semibold text-[#182230] mt-1">{cam.name}</div>
                <div className={`text-[11px] font-bold mt-1 ${cam.status === 'OBSTRUCTION_DETECTED' ? 'text-[#C62828]' : 'text-[#16794A]'}`}>
                  Status: {cam.status === 'OBSTRUCTION_DETECTED' ? 'Lane Obstruction Detected' : 'Corridor Clear'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Recenter Button when user manually panned map during follow mode */}
      {followMode && isUserInteracting && (
        <button
          onClick={() => setIsUserInteracting(false)}
          className="absolute bottom-4 right-4 z-10 bg-white hover:bg-[#F6F7F9] text-[#182230] border border-[#E4E7EC] rounded-[8px] px-3 py-2 text-xs font-medium shadow-md transition-colors flex items-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5 text-[#172033]" />
          Recenter on vehicle
        </button>
      )}
    </div>
  );
}

export default React.memo(OperationsMap);
