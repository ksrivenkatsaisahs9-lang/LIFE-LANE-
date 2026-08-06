import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/common/PageHeader';
import OperationsMap from '../components/map/OperationsMap';
import LoadingState from '../components/common/LoadingState';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import { Shield, Radio, CheckCircle2, Navigation, Info, Volume2, VolumeX, ArrowRight, UserCheck } from 'lucide-react';

const FALLBACK_JUNCTIONS = [
  {
    id: 'jnc-1',
    name: 'City General Emergency Intersection',
    code: 'JNC-A',
    latitude: 12.9482,
    longitude: 77.6365,
    signalState: 'NORMAL',
    statusText: 'Normal operation',
    signals: [
      { id: 'sig-jnc-1-northbound', direction: 'NORTHBOUND', state: 'RED' },
      { id: 'sig-jnc-1-southbound', direction: 'SOUTHBOUND', state: 'RED' },
      { id: 'sig-jnc-1-eastbound', direction: 'EASTBOUND', state: 'GREEN' },
      { id: 'sig-jnc-1-westbound', direction: 'WESTBOUND', state: 'RED' },
    ],
  },
];

export default function PolicePage() {
  const [allJunctions, setAllJunctions] = useState(FALLBACK_JUNCTIONS);
  const [selectedJunctionCode, setSelectedJunctionCode] = useState('JNC-A');
  const [activeAmbulancePos, setActiveAmbulancePos] = useState(null);
  const [activeTripInfo, setActiveTripInfo] = useState(null);
  const [clearedInfo, setClearedInfo] = useState(null);
  const [cancelledPoliceInfo, setCancelledPoliceInfo] = useState(null);
  const [reroutedRedirectInfo, setReroutedRedirectInfo] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState([]);

  const selectedCodeRef = useRef(selectedJunctionCode);
  const audioTriggeredRef = useRef(false);

  useEffect(() => {
    selectedCodeRef.current = selectedJunctionCode;
  }, [selectedJunctionCode]);

  // Assigned Post object based on selection with robust fallback
  const assignedJunction =
    allJunctions.find((j) => j.code === selectedJunctionCode) || allJunctions[0] || FALLBACK_JUNCTIONS[0];

  // Play soft chime audio alert
  const playAudioBeep = () => {
    if (audioMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  // Initial Data Load & Active Trip Recovery (Runs ONCE on mount)
  useEffect(() => {
    async function loadData() {
      try {
        const [jncRes, activeRes] = await Promise.all([
          api.get('/junctions').catch(() => ({ data: { success: false } })),
          api.get('/trips/active').catch(() => ({ data: { activeTrip: null } })),
        ]);

        if (jncRes.data && jncRes.data.success && jncRes.data.junctions && jncRes.data.junctions.length > 0) {
          setAllJunctions(jncRes.data.junctions);
        }

        if (activeRes.data && activeRes.data.success && activeRes.data.activeTrip) {
          const trip = activeRes.data.activeTrip;
          const targetJnc = (jncRes.data?.junctions || FALLBACK_JUNCTIONS).find((j) => j.code === selectedCodeRef.current);
          const distMeters = targetJnc?.distanceMeters !== undefined ? targetJnc.distanceMeters : 800;

          if (distMeters <= 1000) {
            setActiveAmbulancePos({
              latitude: trip.currentLatitude || trip.startLatitude || 12.9352,
              longitude: trip.currentLongitude || trip.startLongitude || 77.6245,
              status: 'EN_ROUTE',
            });

            setActiveTripInfo({
              ambulanceCode: 'AMB-1042',
              emergencyType: trip.emergencyType || 'CARDIAC',
              remainingKm: Number((distMeters / 1000).toFixed(2)),
              distMeters,
              remainingSec: (trip.remainingDurationMinutes || 5) * 60,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load initial police data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Real-time Socket Event Handlers
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socket.emit('join:junctions');

    const handleTripStarted = (data) => {
      setClearedInfo(null);
      audioTriggeredRef.current = false;
      setActiveTripInfo({
        ambulanceCode: data.ambulanceCode || 'AMB-1042',
        emergencyType: data.emergencyType || 'CARDIAC',
        remainingKm: 1.5,
        distMeters: 1500,
        remainingSec: 360,
      });
    };

    const handleJunctionUpdate = (data) => {
      if (data.junctions && data.junctions.length > 0) {
        setAllJunctions(data.junctions);
      }
    };

    const handleTripLocation = (data) => {
      if (data.junctions && data.junctions.length > 0) {
        setAllJunctions(data.junctions);
      }
      if (data.routeCoordinates && data.routeCoordinates.length > 0) {
        setRouteCoords(data.routeCoordinates);
      }

      const currentCode = selectedCodeRef.current;
      const targetJnc = (data.junctions || []).find((j) => j.code === currentCode);
      const isTargetPassed = targetJnc?.isPassed || targetJnc?.signalState === 'CLEARED';

      // If officer's junction was passed, activate Passed State & END tracking!
      if (isTargetPassed) {
        setActiveAmbulancePos(null);
        setActiveTripInfo(null);
        setClearedInfo({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          vehicleCode: data.ambulanceCode || 'AMB-1042',
          junctionName: targetJnc?.name || 'Assigned Post',
        });
        return;
      }

      // Distance from ambulance to officer's assigned junction
      const distMeters = targetJnc?.distanceMeters !== undefined ? targetJnc.distanceMeters : 800;

      // If ambulance <= 1 km away, enable live tracking & proximity alert for this officer!
      if (distMeters <= 1000) {
        if (!audioTriggeredRef.current) {
          playAudioBeep();
          audioTriggeredRef.current = true;
        }

        setActiveAmbulancePos({
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
        });

        setActiveTripInfo({
          ambulanceCode: data.ambulanceCode || 'AMB-1042',
          emergencyType: data.emergencyType || 'CARDIAC',
          remainingKm: Number((distMeters / 1000).toFixed(2)),
          distMeters,
          remainingSec: data.remainingSeconds,
        });
      } else {
        // Out of range (> 1km): hide ambulance position for this officer
        setActiveAmbulancePos(null);
        setActiveTripInfo(null);
      }
    };

    const handleJunctionPassed = (data) => {
      if (data.junctionCode === selectedJunctionCode) {
        audioTriggeredRef.current = false;
        setActiveAmbulancePos(null);
        setActiveTripInfo(null);
        setClearedInfo({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          vehicleCode: data.ambulanceCode || 'AMB-1042',
          junctionName: data.junctionName || 'Assigned Post',
        });
      }
    };

    const handleTripCompleted = () => {
      setActiveAmbulancePos(null);
      setActiveTripInfo(null);
      setClearedInfo({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        vehicleCode: 'AMB-1042',
        junctionName: 'Assigned Post',
      });
      setAllJunctions((prev) =>
        prev.map((j) => ({ ...j, signalState: 'NORMAL', statusText: 'Normal operation', isPassed: false }))
      );
    };

    const handleTripCancelled = (data) => {
      audioTriggeredRef.current = false;
      setActiveAmbulancePos(null);
      setActiveTripInfo(null);
      setClearedInfo(null);
      setAllJunctions((prev) =>
        prev.map((j) => ({ ...j, signalState: 'NORMAL', statusText: 'Normal operation (Cancelled)', isPassed: false }))
      );
    };

    const handleTripRerouted = (data) => {
      audioTriggeredRef.current = false;
      setActiveAmbulancePos(null);
      setActiveTripInfo(null);
      setReroutedRedirectInfo({
        title: 'ROUTE UPDATED',
        message: 'Emergency vehicle has been redirected. Coordination at this location is no longer required.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    };

    socket.on('trip:started', handleTripStarted);
    socket.on('junctions:update', handleJunctionUpdate);
    socket.on('trip:location', handleTripLocation);
    socket.on('junction:passed', handleJunctionPassed);
    socket.on('trip:completed', handleTripCompleted);
    socket.on('trip:cancelled', handleTripCancelled);
    socket.on('trip:rerouted', handleTripRerouted);

    return () => {
      socket.off('trip:started', handleTripStarted);
      socket.off('junctions:update', handleJunctionUpdate);
      socket.off('trip:location', handleTripLocation);
      socket.off('junction:passed', handleJunctionPassed);
      socket.off('trip:completed', handleTripCompleted);
      socket.off('trip:cancelled', handleTripCancelled);
      socket.off('trip:rerouted', handleTripRerouted);
    };
  }, [audioMuted, selectedJunctionCode]);

  const getSignalBadgeStyle = (state) => {
    switch (state) {
      case 'EMERGENCY_PRIORITY':
        return 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]';
      case 'PREPARING':
        return 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
      case 'CLEARED':
        return 'bg-[#F0FDFA] text-[#0D9488] border-[#CCFBF1]';
      default:
        return 'bg-[#F6F7F9] text-[#667085] border-[#E4E7EC]';
    }
  };

  const getProximityBadge = (distMeters) => {
    if (!distMeters) return '1 km';
    if (distMeters <= 100) return '100 m';
    if (distMeters <= 300) return '300 m';
    if (distMeters <= 500) return '500 m';
    return '1 km';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
        <PageHeader title="Traffic Operations" code="TP-2147" status="ON_DUTY" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading traffic post operations..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <PageHeader title="Traffic Operations" code={`POST-${selectedJunctionCode}`} status="ON_DUTY" />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Map View */}
        <div className="w-full lg:w-[68%] h-[50vh] lg:h-full relative bg-[#E4E7EC]">
          <OperationsMap
            center={[assignedJunction.latitude, assignedJunction.longitude]}
            zoom={14}
            junctions={allJunctions}
            ambulanceLocation={activeAmbulancePos}
            routeCoordinates={routeCoords}
            followMode={false}
          />

          {/* Top Radar Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 bg-white border border-[#E4E7EC] rounded-[8px] p-3 shadow-sm max-w-sm flex items-center justify-between w-full">
            <div>
              <div className="text-xs font-semibold text-[#182230] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#175CD3]" />
                Response Corridor Monitoring
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                Post: {assignedJunction.name} ({assignedJunction.code})
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className="p-1.5 text-[#667085] hover:text-[#182230] rounded-[6px] transition-colors"
              title={audioMuted ? 'Unmute Audio Alert' : 'Mute Audio Alert'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Mandatory Demo Safety Disclaimer */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 border border-[#E4E7EC] rounded-[6px] px-3 py-1.5 shadow-sm text-[11px] font-medium text-[#667085] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#175CD3]" />
            Emergency signal priority simulation
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-full lg:w-[32%] h-full bg-white border-l border-[#E4E7EC] flex flex-col overflow-y-auto p-5">
          {/* Post Overview & Officer Selector */}
          <div className="mb-5 pb-4 border-b border-[#E4E7EC] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
                Assigned Control Post
              </span>
              <select
                value={selectedJunctionCode}
                onChange={(e) => {
                  setSelectedJunctionCode(e.target.value);
                  setClearedInfo(null);
                  setActiveAmbulancePos(null);
                  setActiveTripInfo(null);
                  audioTriggeredRef.current = false;
                }}
                className="px-2 py-1 text-[11px] font-semibold bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] text-[#182230]"
              >
                {allJunctions.map((j) => (
                  <option key={j.id} value={j.code}>
                    {j.name} ({j.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h2 className="text-base font-semibold text-[#182230]">{assignedJunction.name}</h2>
              <div className="text-xs text-[#667085] mt-0.5">Junction Code: {assignedJunction.code}</div>
            </div>
          </div>

          {/* Post Details & Signal Control State */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] space-y-3">
              <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                Signal Control Status
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#182230]">Current State</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-[6px] border uppercase ${getSignalBadgeStyle(
                    assignedJunction.signalState
                  )}`}
                >
                  {assignedJunction.signalState === 'EMERGENCY_PRIORITY'
                    ? 'EMERGENCY PRIORITY'
                    : assignedJunction.signalState || 'NORMAL'}
                </span>
              </div>

              <div className="text-xs text-[#667085] pt-2 border-t border-[#E4E7EC] leading-relaxed">
                {assignedJunction.statusText || 'Normal operation'}
              </div>
            </div>

            {/* SCENARIO 0: Emergency Cancelled Card */}
            {cancelledPoliceInfo ? (
              <div className="p-5 bg-[#FEF3F2] border border-[#FECDCA] rounded-[10px] text-center space-y-3 shadow-xs">
                <div className="w-10 h-10 bg-white border border-[#FECDCA] text-[#C62828] rounded-[8px] flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#C62828] uppercase tracking-wider mb-1">
                    EMERGENCY CANCELLED
                  </div>
                  <p className="text-xs text-[#182230] font-semibold mb-1">
                    {cancelledPoliceInfo.vehicleCode}
                  </p>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    The emergency journey has been cancelled. Traffic coordination is no longer required.
                  </p>
                  <div className="mt-2 text-left p-2.5 bg-white border border-[#E4E7EC] rounded-[6px] text-xs space-y-1">
                    <div className="flex justify-between text-[#667085]">
                      <span>Reason:</span>
                      <span className="font-semibold text-[#C62828]">{cancelledPoliceInfo.reason}</span>
                    </div>
                    <div className="flex justify-between text-[#667085] pt-1 border-t border-[#E4E7EC]">
                      <span>Tracking Access:</span>
                      <span className="font-semibold text-[#667085]">Ended</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#667085] pt-1 font-mono border-t border-[#FECDCA]/50">
                  Cancelled at {cancelledPoliceInfo.time}
                </div>
                <button
                  type="button"
                  onClick={() => setCancelledPoliceInfo(null)}
                  className="w-full py-2 bg-white border border-[#FECDCA] hover:bg-[#FEF3F2] text-xs font-semibold text-[#C62828] rounded-[6px] transition-colors"
                >
                  Dismiss notification
                </button>
              </div>
            ) : reroutedRedirectInfo ? (
              /* SCENARIO REROUTED: Route Updated Redirect Card */
              <div className="p-5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[10px] text-center space-y-3 shadow-xs">
                <div className="w-10 h-10 bg-white border border-[#B2DDFF] text-[#175CD3] rounded-[8px] flex items-center justify-center mx-auto">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#175CD3] uppercase tracking-wider mb-1">
                    {reroutedRedirectInfo.title || 'ROUTE UPDATED'}
                  </div>
                  <p className="text-xs text-[#182230] font-semibold mb-1">
                    Emergency vehicle has been redirected.
                  </p>
                  <p className="text-xs text-[#667085] leading-relaxed mb-3">
                    {reroutedRedirectInfo.message}
                  </p>
                  <div className="p-2.5 bg-white border border-[#B2DDFF] rounded-[6px] text-xs text-[#667085] font-medium">
                    Tracking access ended for this location.
                  </div>
                </div>
                <div className="text-[10px] text-[#667085] pt-1 font-mono border-t border-[#B2DDFF]">
                  Redirected at {reroutedRedirectInfo.time}
                </div>
                <button
                  type="button"
                  onClick={() => setReroutedRedirectInfo(null)}
                  className="w-full py-2 bg-white border border-[#B2DDFF] hover:bg-[#EFF8FF] text-xs font-semibold text-[#175CD3] rounded-[6px] transition-colors"
                >
                  Dismiss notification
                </button>
              </div>
            ) : clearedInfo ? (
              /* SCENARIO 1: Cleared / Passed State Card with Thank You & Privacy Termination */
              <div className="p-5 bg-[#F0FDFA] border border-[#CCFBF1] rounded-[10px] text-center space-y-3 shadow-xs">
                <div className="w-10 h-10 bg-white border border-[#CCFBF1] text-[#0D9488] rounded-[8px] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0D9488] uppercase tracking-wider mb-1">
                    AMBULANCE CLEARED
                  </div>
                  <p className="text-xs text-[#182230] font-semibold mb-1">
                    {clearedInfo.vehicleCode || 'AMB-1042'} has cleared {clearedInfo.junctionName || 'City General Emergency Intersection'}.
                  </p>
                  <p className="text-xs text-[#667085] leading-relaxed mb-2">
                    Signal operation is returning to normal.
                  </p>
                  <p className="text-xs font-medium text-[#0D9488] mb-2">
                    Thank you for your cooperation.
                  </p>
                  <div className="p-2.5 bg-white border border-[#CCFBF1] rounded-[6px] text-xs text-[#667085] font-medium">
                    Tracking access has ended.
                  </div>
                </div>
                <div className="text-[10px] text-[#667085] pt-1 font-mono border-t border-[#CCFBF1]/50">
                  Cleared at {clearedInfo.time}
                </div>
              </div>
            ) : activeTripInfo ? (
              /* SCENARIO 2: Active Emergency Tracking Card (<= 1 km) */
              <div className="p-4 bg-white border border-[#E4E7EC] rounded-[8px] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3F2] border border-[#FECDCA] rounded-[6px] text-xs font-semibold text-[#C62828]">
                    <span className="w-2 h-2 rounded-full bg-[#C62828] animate-ping" />
                    EMERGENCY VEHICLE APPROACHING
                  </div>
                  <span className="text-[10px] font-bold text-[#175CD3] bg-[#EFF8FF] border border-[#B2DDFF] px-2 py-0.5 rounded-[4px]">
                    {getProximityBadge(activeTripInfo.distMeters)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#667085]">Vehicle</span>
                  <span className="font-semibold text-[#182230]">{activeTripInfo.ambulanceCode}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#667085]">Emergency Type</span>
                  <span className="font-semibold text-[#C62828]">{activeTripInfo.emergencyType}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E7EC]">
                  <div className="p-2 bg-[#F6F7F9] rounded-[6px]">
                    <div className="text-[10px] text-[#667085] uppercase tracking-wider">Distance</div>
                    <div className="text-xs font-bold text-[#182230]">
                      {activeTripInfo.distMeters >= 1000
                        ? `${activeTripInfo.remainingKm} km`
                        : `${activeTripInfo.distMeters} m`}
                    </div>
                  </div>

                  <div className="p-2 bg-[#F6F7F9] rounded-[6px]">
                    <div className="text-[10px] text-[#667085] uppercase tracking-wider">ETA</div>
                    <div className="text-xs font-bold text-[#182230]">
                      {Math.ceil((activeTripInfo.remainingSec || 0) / 60)} min
                    </div>
                  </div>
                </div>

                {/* Alarm Acknowledge Button */}
                <button
                  type="button"
                  onClick={() => {
                    audioTriggeredRef.current = false;
                    setAudioMuted(true);
                  }}
                  className="w-full py-2 px-3 bg-[#F6F7F9] hover:bg-[#E4E7EC] text-[#182230] border border-[#E4E7EC] text-xs font-semibold rounded-[6px] transition-colors flex items-center justify-center gap-2"
                >
                  <VolumeX className="w-3.5 h-3.5 text-[#667085]" />
                  Acknowledge alert
                </button>
              </div>
            ) : (
              /* SCENARIO 3: Standby State (> 1 km away) */
              <div className="p-4 bg-white border border-[#E4E7EC] rounded-[8px]">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-4 h-4 text-[#667085]" />
                  <span className="text-xs font-semibold text-[#182230]">No active emergency in range</span>
                </div>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Emergency vehicle tracking and corridor priority activate automatically when an approaching ambulance enters within 1 km of this post.
                </p>
              </div>
            )}

            {/* Compact Four-Way Intersection Signal Coordination Visualization */}
            <div className="p-4 bg-white border border-[#E4E7EC] rounded-[8px] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                  SIGNAL COORDINATION
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase ${
                  assignedJunction.signalState === 'EMERGENCY_PRIORITY' ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]' :
                  assignedJunction.signalState === 'TRANSITION' || assignedJunction.signalState === 'PREPARING_PRIORITY' ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' :
                  assignedJunction.signalState === 'CLEARED' ? 'bg-[#F0FDFA] text-[#0D9488] border-[#CCFBF1]' :
                  'bg-[#F6F7F9] text-[#667085] border-[#E4E7EC]'
                }`}>
                  {assignedJunction.signalState === 'EMERGENCY_PRIORITY' ? 'EMERGENCY PRIORITY ACTIVE' :
                   assignedJunction.signalState === 'TRANSITION' ? 'SIGNAL TRANSITION' :
                   assignedJunction.signalState === 'PREPARING_PRIORITY' ? 'PREPARING PRIORITY' :
                   assignedJunction.signalState === 'CLEARED' ? 'CLEARANCE' : 'NORMAL'}
                </span>
              </div>

              <div className="text-xs font-semibold text-[#182230]">
                {assignedJunction.name || 'City General Emergency Intersection'}
              </div>

              {/* Physical 4-Way Road Intersection HTML/CSS Diagram */}
              <div className="relative w-full h-[220px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] flex items-center justify-center overflow-hidden my-2">
                {/* Vertical Road */}
                <div className="absolute w-14 h-full bg-[#E2E8F0] border-x border-[#CBD5E1] flex flex-col justify-between items-center py-2 z-0">
                  <div className="w-0.5 h-full border-r border-dashed border-[#94A3B8]" />
                </div>

                {/* Horizontal Road */}
                <div className="absolute h-14 w-full bg-[#E2E8F0] border-y border-[#CBD5E1] flex justify-between items-center px-2 z-0">
                  <div className="h-0.5 w-full border-b border-dashed border-[#94A3B8]" />
                </div>

                {/* Center Intersection Box */}
                <div className="absolute w-14 h-14 bg-[#CBD5E1] border border-[#94A3B8] rounded-[4px] flex items-center justify-center z-10 shadow-inner">
                  <span className="text-[10px] font-bold text-[#334155]">JNC-01</span>
                </div>

                {/* 1. NORTH APPROACH SIGNAL */}
                <div className="absolute top-2 flex flex-col items-center z-20">
                  <span className="text-[9px] font-mono font-bold text-[#475569] bg-white/90 px-1 rounded border border-[#CBD5E1] mb-1">
                    NORTH
                  </span>
                  <div className={`px-2.5 py-1 text-[11px] font-bold rounded-[4px] border shadow-2xs ${
                    (assignedJunction.signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'GREEN' || assignedJunction.signalState === 'EMERGENCY_PRIORITY')
                      ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]'
                      : assignedJunction.signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'AMBER'
                      ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                      : 'bg-[#FEF3F2] text-[#C62828] border-[#FECDCA]'
                  }`}>
                    {(assignedJunction.signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'GREEN' || assignedJunction.signalState === 'EMERGENCY_PRIORITY') ? 'GREEN' :
                     assignedJunction.signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'AMBER' ? 'AMBER' : 'RED'}
                  </div>
                </div>

                {/* 2. SOUTH APPROACH SIGNAL & AMBULANCE POSITION */}
                <div className="absolute bottom-2 flex flex-col items-center z-20">
                  {/* Ambulance Marker Indicator on South Approach */}
                  {activeTripInfo && (
                    <div className="mb-1 px-1.5 py-0.5 bg-[#C62828] text-white text-[9px] font-bold rounded-[4px] shadow-xs flex items-center gap-1 animate-bounce">
                      <span>AMB-1042</span>
                      <span className="text-[8px]">↑</span>
                    </div>
                  )}
                  <div className={`px-2.5 py-1 text-[11px] font-bold rounded-[4px] border shadow-2xs ${
                    assignedJunction.signals?.find(s => s.direction === 'SOUTHBOUND')?.state === 'GREEN'
                      ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]'
                      : assignedJunction.signals?.find(s => s.direction === 'SOUTHBOUND')?.state === 'AMBER'
                      ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                      : 'bg-[#FEF3F2] text-[#C62828] border-[#FECDCA]'
                  }`}>
                    {assignedJunction.signals?.find(s => s.direction === 'SOUTHBOUND')?.state || 'RED'}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#475569] bg-white/90 px-1 rounded border border-[#CBD5E1] mt-1">
                    SOUTH
                  </span>
                </div>

                {/* 3. WEST APPROACH SIGNAL */}
                <div className="absolute left-3 flex items-center gap-1.5 z-20">
                  <span className="text-[9px] font-mono font-bold text-[#475569] bg-white/90 px-1 rounded border border-[#CBD5E1]">
                    WEST
                  </span>
                  <div className={`px-2 py-0.5 text-[10px] font-bold rounded-[4px] border shadow-2xs ${
                    assignedJunction.signals?.find(s => s.direction === 'WESTBOUND')?.state === 'GREEN'
                      ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]'
                      : assignedJunction.signals?.find(s => s.direction === 'WESTBOUND')?.state === 'AMBER'
                      ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                      : 'bg-[#FEF3F2] text-[#C62828] border-[#FECDCA]'
                  }`}>
                    {assignedJunction.signals?.find(s => s.direction === 'WESTBOUND')?.state || 'RED'}
                  </div>
                </div>

                {/* 4. EAST APPROACH SIGNAL */}
                <div className="absolute right-3 flex items-center gap-1.5 z-20">
                  <div className={`px-2 py-0.5 text-[10px] font-bold rounded-[4px] border shadow-2xs ${
                    assignedJunction.signals?.find(s => s.direction === 'EASTBOUND')?.state === 'GREEN'
                      ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]'
                      : assignedJunction.signals?.find(s => s.direction === 'EASTBOUND')?.state === 'AMBER'
                      ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                      : 'bg-[#FEF3F2] text-[#C62828] border-[#FECDCA]'
                  }`}>
                    {assignedJunction.signals?.find(s => s.direction === 'EASTBOUND')?.state || 'RED'}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#475569] bg-white/90 px-1 rounded border border-[#CBD5E1]">
                    EAST
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#667085] leading-relaxed pt-1">
                {assignedJunction.statusText || 'Normal operation'}
              </div>
            </div>

            {/* Junction List Summary */}
            <div className="pt-4 border-t border-[#E4E7EC]">
              <div className="text-xs font-semibold text-[#182230] mb-3">
                Corridor Signal Nodes ({allJunctions.length})
              </div>

              <div className="space-y-2">
                {allJunctions.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => {
                      setSelectedJunctionCode(j.code);
                      setClearedInfo(null);
                      setActiveAmbulancePos(null);
                      setActiveTripInfo(null);
                      audioTriggeredRef.current = false;
                    }}
                    className={`p-3 rounded-[8px] border cursor-pointer transition-all ${
                      j.code === selectedJunctionCode
                        ? 'bg-white border-[#172033] shadow-sm'
                        : 'bg-[#F6F7F9] border-[#E4E7EC] hover:border-[#D0D5DD]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-[#182230]">{j.name}</div>
                        <div className="text-[11px] text-[#667085]">{j.code}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase ${getSignalBadgeStyle(
                          j.signalState
                        )}`}
                      >
                        {j.signalState === 'EMERGENCY_PRIORITY' ? 'PRIORITY' : j.signalState || 'NORMAL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[#E4E7EC] text-center text-[11px] text-[#667085]">
            LifeLane Emergency Signal Priority System
          </div>
        </div>
      </div>
    </div>
  );
}
