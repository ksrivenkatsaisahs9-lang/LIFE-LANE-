import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import OperationsMap from '../components/map/OperationsMap';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { connectSocket, joinHospitalRoom } from '../services/socket';
import { Building2, Ambulance, Clock, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

const PROGRESS_STEPS = ['Dispatched', 'En route', 'Approaching', 'Arrived'];

export default function HospitalPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time Active Emergency State
  const [activeTrip, setActiveTrip] = useState(null);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [remainingKm, setRemainingKm] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [tripStatus, setTripStatus] = useState('EN_ROUTE'); // EN_ROUTE, APPROACHING, COMPLETED, CANCELLED
  const [completedInfo, setCompletedInfo] = useState(null);
  const [cancelledHospitalInfo, setCancelledHospitalInfo] = useState(null);
  const [rerouteNotice, setRerouteNotice] = useState(null);

  // 1. Initial Data Fetching & Active Trip Recovery
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [hospRes, activeRes] = await Promise.all([
          api.get('/hospitals'),
          api.get('/trips/active').catch(() => ({ data: { activeTrip: null } })),
        ]);

        if (hospRes.data.success) {
          setHospitals(hospRes.data.hospitals);
        }

        if (activeRes.data.success && activeRes.data.activeTrip) {
          const trip = activeRes.data.activeTrip;
          setActiveTrip(trip);
          setAmbulancePos({
            latitude: trip.currentLatitude || trip.startLatitude,
            longitude: trip.currentLongitude || trip.startLongitude,
            status: 'EN_ROUTE',
          });
          setRemainingKm(trip.remainingDistanceKm || trip.estimatedDistanceKm || 0);
          setRemainingSec((trip.remainingDurationMinutes || 5) * 60);
          setTripStatus(trip.status === 'APPROACHING' ? 'APPROACHING' : 'EN_ROUTE');

          // Connect Socket & Join Hospital Room
          if (trip.hospitalId) {
            const socket = connectSocket();
            if (socket) {
              joinHospitalRoom(trip.hospitalId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load hospital data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 2. Real-time Socket Event Listeners for Hospital
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socket.emit('join:hospital');

    const handleIncoming = (data) => {
      setCancelledHospitalInfo(null);
      if (data.trip) {
        setActiveTrip(data.trip);
        setAmbulancePos({
          latitude: data.trip.startLatitude,
          longitude: data.trip.startLongitude,
          status: 'EN_ROUTE',
        });
        setRemainingKm(data.trip.estimatedDistanceKm || 4.5);
        setRemainingSec((data.trip.estimatedDurationMinutes || 8) * 60);
        setTripStatus('EN_ROUTE');
        setCompletedInfo(null);
      }
    };

    const handleLocation = (data) => {
      setCancelledHospitalInfo(null);
      setAmbulancePos({
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
      });
      if (data.remainingDistanceKm !== undefined) setRemainingKm(data.remainingDistanceKm);
      if (data.remainingSeconds !== undefined) setRemainingSec(data.remainingSeconds);

      setActiveTrip((prev) => {
        if (!prev) {
          return {
            id: data.tripId,
            ambulanceId: data.ambulanceId,
            ambulanceCode: data.ambulanceCode || 'AMB-1042',
            emergencyType: data.emergencyType || 'Cardiac',
            status: data.status || 'ACTIVE',
          };
        }
        return prev;
      });
    };

    const handleArriving = () => {
      setTripStatus('APPROACHING');
    };

    const handleCompleted = () => {
      setTripStatus('COMPLETED');
      setCompletedInfo({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ambulanceCode: 'AMB-1042',
        emergencyType: activeTrip?.emergencyType || 'Cardiac',
      });
      setActiveTrip(null);
    };

    const handleTripCancelled = (data) => {
      setTripStatus('CANCELLED');
      setCancelledHospitalInfo({
        time: new Date(data.cancelledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ambulanceCode: data.ambulanceCode || 'AMB-1042',
        reason: data.reason || 'Activated by mistake',
      });
      setActiveTrip(null);
      setAmbulancePos(null);
    };

    const handleTripRerouted = (data) => {
      if (data.updatedETA || data.newEtaMinutes) {
        setRemainingSec((data.updatedETA || data.newEtaMinutes) * 60);
      }
      setRerouteNotice(`ROUTE UPDATED — AMB-1042 rerouted due to congestion. Updated ETA: ${data.updatedETA || data.newEtaMinutes || 9} min`);
    };

    socket.on('hospital:incoming', handleIncoming);
    socket.on('trip:location', handleLocation);
    socket.on('trip:arriving', handleArriving);
    socket.on('trip:completed', handleCompleted);
    socket.on('trip:cancelled', handleTripCancelled);
    socket.on('trip:rerouted', handleTripRerouted);

    return () => {
      socket.off('hospital:incoming', handleIncoming);
      socket.off('trip:location', handleLocation);
      socket.off('trip:arriving', handleArriving);
      socket.off('trip:completed', handleCompleted);
      socket.off('trip:cancelled', handleTripCancelled);
      socket.off('trip:rerouted', handleTripRerouted);
    };
  }, [hospitals, activeTrip]);

  const currentHospital = hospitals.find((h) => h.name.includes('City General')) || hospitals[0] || {
    name: 'City General Hospital',
    address: 'Indiranagar, Bengaluru',
    latitude: 12.9592,
    longitude: 77.6445,
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate current active step index for progress bar
  const getStepIndex = () => {
    if (completedInfo || tripStatus === 'COMPLETED') return 3;
    if (tripStatus === 'APPROACHING') return 2;
    if (activeTrip) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
        <PageHeader title="Emergency Intake" code={currentHospital.name} status="OPERATIONAL" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading hospital intake platform..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Emergency Intake"
        code={currentHospital.name}
        status={activeTrip ? 'EMERGENCY' : 'OPERATIONAL'}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Map View */}
        <div className="w-full lg:w-[68%] h-[50vh] lg:h-full relative bg-[#E4E7EC]">
          <OperationsMap
            center={[currentHospital.latitude, currentHospital.longitude]}
            zoom={13}
            ambulanceLocation={ambulancePos}
            hospitals={hospitals}
            selectedHospitalId={currentHospital.id}
            routeCoordinates={activeTrip?.routeCoordinates || []}
            followMode={false}
          />

          <div className="absolute top-4 left-4 z-10 bg-white border border-[#E4E7EC] rounded-[8px] p-3 shadow-sm max-w-xs">
            <div className="text-xs font-semibold text-[#182230] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#16794A]" />
              Facility Intake Radar
            </div>
            <div className="text-[11px] text-[#667085] mt-0.5">
              {currentHospital.name} ({currentHospital.address})
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-full lg:w-[32%] h-full bg-white border-l border-[#E4E7EC] flex flex-col overflow-y-auto p-5">
          <div className="mb-5 pb-4 border-b border-[#E4E7EC]">
            <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider block mb-1">
              Facility Dashboard
            </span>
            <h2 className="text-base font-semibold text-[#182230]">{currentHospital.name}</h2>
            <div className="text-xs text-[#667085] mt-0.5">Intake Center: Active</div>
          </div>

          {/* SCENARIO 0: Emergency Cancelled Card */}
          {cancelledHospitalInfo ? (
            <div className="p-5 bg-[#FEF3F2] border border-[#FECDCA] rounded-[10px] space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[#C62828]">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">JOURNEY CANCELLED</span>
              </div>

              <div className="text-xs text-[#182230] font-semibold">
                {cancelledHospitalInfo.ambulanceCode} is no longer en route.
              </div>

              <div className="space-y-1.5 text-xs text-[#182230] pt-2 border-t border-[#FECDCA]">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Reason:</span>
                  <span className="font-semibold text-[#C62828]">{cancelledHospitalInfo.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Cancelled At:</span>
                  <span className="font-mono text-[#182230]">{cancelledHospitalInfo.time}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCancelledHospitalInfo(null)}
                className="w-full mt-2 py-2 bg-white border border-[#FECDCA] hover:bg-[#FEF3F2] text-xs font-semibold text-[#C62828] rounded-[6px] transition-colors"
              >
                Return to readiness status
              </button>
            </div>
          ) : completedInfo ? (
            <div className="p-5 bg-[#F0FDFA] border border-[#DCFCE7] rounded-[10px] space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[#16794A]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">AMBULANCE ARRIVED</span>
              </div>

              <div className="space-y-1 text-xs text-[#182230] pt-2 border-t border-[#DCFCE7]">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Vehicle:</span>
                  <span className="font-medium">{completedInfo.ambulanceCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Emergency:</span>
                  <span className="font-medium">{completedInfo.emergencyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Arrival Time:</span>
                  <span className="font-medium">{completedInfo.time}</span>
                </div>
              </div>
            </div>
          ) : activeTrip ? (
            /* SCENARIO 2: Active Incoming Emergency Journey */
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3F2] border border-[#FECDCA] rounded-[6px] text-xs font-semibold text-[#C62828]">
                <span className="w-2 h-2 rounded-full bg-[#C62828] animate-ping" />
                INCOMING EMERGENCY
              </div>

              {/* Reroute Notice Banner */}
              {rerouteNotice && (
                <div className="p-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[8px] text-xs text-[#175CD3] font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-bold">
                    <Navigation className="w-3.5 h-3.5 text-[#175CD3]" />
                    ROUTE UPDATED
                  </div>
                  <div className="text-[11px] font-normal text-[#182230]">
                    {rerouteNotice}
                  </div>
                </div>
              )}

              {/* Progress Steps */}
              <div className="py-2">
                <div className="flex justify-between mb-2">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const activeIdx = getStepIndex();
                    const isDone = idx <= activeIdx;
                    return (
                      <span
                        key={step}
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isDone ? 'text-[#16794A]' : 'text-[#667085]'
                        }`}
                      >
                        {step}
                      </span>
                    );
                  })}
                </div>
                <div className="w-full bg-[#E4E7EC] h-1.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-[#16794A] h-full transition-all duration-500"
                    style={{ width: `${((getStepIndex() + 1) / PROGRESS_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Incoming Ambulance Card */}
              <div className="p-4 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ambulance className="w-4 h-4 text-[#C62828]" />
                    <span className="text-xs font-semibold text-[#182230]">AMB-1042</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#C62828] bg-white border border-[#FECDCA] px-2 py-0.5 rounded-[4px]">
                    {activeTrip.emergencyType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E7EC]">
                  <div>
                    <div className="text-[10px] text-[#667085] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#175CD3]" />
                      Live ETA
                    </div>
                    <div className="text-base font-bold text-[#182230] font-mono">
                      {formatTime(remainingSec)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[#667085] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-[#16794A]" />
                      Distance
                    </div>
                    <div className="text-base font-bold text-[#182230] font-mono">
                      {remainingKm > 1 ? `${remainingKm} km` : `${Math.round(remainingKm * 1000)} m`}
                    </div>
                  </div>
                </div>

                {tripStatus === 'APPROACHING' && (
                  <div className="p-2 bg-[#FFFAEB] border border-[#FEDF89] rounded-[6px] text-xs text-[#B54708] font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Ambulance approaching emergency intake.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SCENARIO 3: Empty State */
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#182230] uppercase tracking-wider mb-3">
                Incoming emergencies
              </div>

              <EmptyState
                icon={Building2}
                title="No incoming emergency journeys"
                description="Active ambulance journeys assigned to this hospital will appear here in real time."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
