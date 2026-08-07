import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import OperationsMap from '../components/map/OperationsMap';
import LoadingState from '../components/common/LoadingState';
import api from '../services/api';
import { connectSocket, joinTripRoom } from '../services/socket';
import { fetchOSRMRoute, calculateBearing } from '../services/osrmService';
import {
  Navigation,
  MapPin,
  AlertCircle,
  Clock,
  Route as RouteIcon,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Radio,
  Zap,
  Check,
  AlertTriangle,
  Info,
  Gauge,
} from 'lucide-react';

const EMERGENCY_TYPES = [
  { id: 'CARDIAC', label: 'Cardiac Emergency' },
  { id: 'TRAUMA', label: 'Trauma / Accident' },
  { id: 'RESPIRATORY', label: 'Respiratory Distress' },
  { id: 'NEUROLOGICAL', label: 'Neurological / Stroke' },
  { id: 'GENERAL', label: 'General Emergency' },
];

const DEFAULT_DEMO_LOCATION = {
  latitude: 12.9352,
  longitude: 77.6245,
  name: 'Koramangala 5th Block (Demo Start)',
};

const FALLBACK_HOSPITALS = [
  {
    id: 'hosp-1',
    name: 'City General Hospital',
    address: 'Indiranagar, Bengaluru',
    latitude: 12.9592,
    longitude: 77.6445,
    emergencyAvailable: true,
    scenarioCode: 'INTERSECTION_CORRIDOR',
    scenarioTitle: 'Intersection Corridor',
    scenarioDescription: 'Multiple signalized intersections require coordinated emergency passage.',
  },
  {
    id: 'hosp-2',
    name: 'St. Martha Emergency Centre',
    address: 'Nrupatunga Road, Bengaluru',
    latitude: 12.9642,
    longitude: 77.5960,
    emergencyAvailable: true,
    scenarioCode: 'CONGESTION_REROUTE',
    scenarioTitle: 'Congestion Rerouting',
    scenarioDescription: 'Unexpected congestion develops on initial route, triggering intelligent rerouting.',
  },
  {
    id: 'hosp-3',
    name: 'Central Medical Centre',
    address: 'MG Road, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    emergencyAvailable: true,
    scenarioCode: 'COMPLEX_JUNCTION',
    scenarioTitle: 'Complex Junction Corridor',
    scenarioDescription: 'Major multi-direction intersection requiring precision signal priority timing.',
  },
  {
    id: 'hosp-4',
    name: 'Lakeside Trauma Centre',
    address: 'Ulsoor Lake Corridor, Bengaluru',
    latitude: 12.9820,
    longitude: 77.6180,
    emergencyAvailable: true,
    scenarioCode: 'ROAD_INCIDENT',
    scenarioTitle: 'Road Incident Corridor',
    scenarioDescription: 'Corridor with road incident requiring advance vehicle warning and route evaluation.',
  },
  {
    id: 'hosp-5',
    name: 'Metro Emergency Hospital',
    address: 'Outer Ring Rd / Bellandur, Bengaluru',
    latitude: 12.9280,
    longitude: 77.6850,
    emergencyAvailable: true,
    scenarioCode: 'CAMERA_CORRIDOR',
    scenarioTitle: 'Camera Monitored Corridor',
    scenarioDescription: 'Roadside AI camera points provide real-time lane obstruction and congestion intelligence.',
  },
];

const FALLBACK_JUNCTIONS = [
  { id: 'jnc-1', name: 'Junction 01 (Sony World Intersection)', code: 'JNC-A', latitude: 12.94815, longitude: 77.64068, signalState: 'NORMAL', statusText: 'Normal operation' },
  { id: 'jnc-2', name: 'Junction 02 (Dairy Circle Intersection)', code: 'JNC-B', latitude: 12.96066, longitude: 77.64226, signalState: 'NORMAL', statusText: 'Normal operation' },
];

function generateFallbackRouteGeometry(start, dest, hospitalId = null) {
  if (!start || !dest) return [];
  const startLat = start.latitude || 12.9352;
  const startLng = start.longitude || 77.6245;
  const destLat = dest.latitude || 12.9592;
  const destLng = dest.longitude || 77.6445;

  const targetHospId = String(hospitalId || dest.id || 'hosp-1');
  const waypoints = [[startLat, startLng]];

  if (targetHospId.includes('1') || targetHospId.includes('hosp-1')) {
    // City General Hospital (Indiranagar) - via 80ft Rd, Sony World Signal, Intermediate Ring Rd & Domlur Flyover
    waypoints.push([12.9372, 77.6258]); // 80 Feet Rd Koramangala
    waypoints.push([12.9412, 77.6295]); // Sony World Junction
    waypoints.push([12.9435, 77.6318]); // Koramangala 100ft Rd
    waypoints.push([12.9455, 77.6340]); // Intermediate Ring Rd (Oasis)
    waypoints.push([12.9482, 77.6365]); // Eejipura Signal (JNC-A)
    waypoints.push([12.9515, 77.6390]); // Embassy Golf Links Turn
    waypoints.push([12.9548, 77.6412]); // Domlur Flyover Approach
    waypoints.push([12.9565, 77.6425]); // Domlur Junction Turn
    waypoints.push([12.9578, 77.6435]); // Indiranagar 100ft Rd Entry
  } else if (targetHospId.includes('2') || targetHospId.includes('hosp-2')) {
    // St. Martha Emergency Centre (Nrupatunga Rd) - via Hosur Rd, Dairy Circle & Richmond Circle
    waypoints.push([12.9370, 77.6210]); // Hosur Road Turn
    waypoints.push([12.9390, 77.6180]); // Adugodi Junction
    waypoints.push([12.9430, 77.6130]); // Forum Mall Signal
    waypoints.push([12.9470, 77.6080]); // Dairy Circle (JNC-B)
    waypoints.push([12.9510, 77.6040]); // Lalbagh Fort Rd
    waypoints.push([12.9550, 77.6000]); // Richmond Circle (JNC-C)
    waypoints.push([12.9580, 77.6040]); // Corporation Circle
    waypoints.push([12.9600, 77.6080]); // Hudson Circle
    waypoints.push([12.9625, 77.6015]); // Nrupatunga Rd
  } else if (targetHospId.includes('3') || targetHospId.includes('hosp-3')) {
    // Central Medical Centre (MG Road) - via Sony World, Ring Rd & Trinity Circle
    waypoints.push([12.9372, 77.6258]); // 80 Feet Rd
    waypoints.push([12.9412, 77.6295]); // Sony World Signal
    waypoints.push([12.9482, 77.6365]); // Intermediate Ring Rd
    waypoints.push([12.9550, 77.6320]); // Victoria Layout
    waypoints.push([12.9620, 77.6250]); // Old Airport Rd Junction
    waypoints.push([12.9680, 77.6190]); // Command Hospital Turn
    waypoints.push([12.9725, 77.6140]); // Trinity Circle
    waypoints.push([12.9720, 77.6040]); // MG Road Corridor
  } else if (targetHospId.includes('4') || targetHospId.includes('hosp-4')) {
    // Lakeside Trauma Centre (Ulsoor Lake) - via Ring Rd, Kensington Rd & Ulsoor Lake
    waypoints.push([12.9372, 77.6258]); // 80 Feet Rd
    waypoints.push([12.9412, 77.6295]); // Sony World Signal
    waypoints.push([12.9482, 77.6365]); // Intermediate Ring Rd
    waypoints.push([12.9580, 77.6300]); // Domlur Layout
    waypoints.push([12.9620, 77.6250]); // Kensington Rd
    waypoints.push([12.9700, 77.6220]); // Murphy Town Signal
    waypoints.push([12.9750, 77.6200]); // Ulsoor Lake Rd
    waypoints.push([12.9780, 77.6190]); // Lake Promenade
  } else if (targetHospId.includes('5') || targetHospId.includes('hosp-5')) {
    // Metro Emergency Hospital (Bellandur ORR) - via HSR 80ft Rd, Agara Flyover & Iblur
    waypoints.push([12.9310, 77.6290]); // HSR Layout 27th Main
    waypoints.push([12.9280, 77.6350]); // HSR 80 Ft Rd
    waypoints.push([12.9260, 77.6430]); // Agara Lake Turn
    waypoints.push([12.9240, 77.6500]); // Agara Flyover
    waypoints.push([12.9248, 77.6590]); // Sarjapur ORR Junction
    waypoints.push([12.9255, 77.6680]); // Iblur Junction
    waypoints.push([12.9268, 77.6770]); // Bellandur EcoSpace Flyover
  }

  waypoints.push([destLat, destLng]);

  const coords = [];
  const stepsPerSegment = 12;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [sLat, sLng] = waypoints[i];
    const [eLat, eLng] = waypoints[i + 1];

    for (let j = 0; j < stepsPerSegment; j++) {
      const ratio = j / stepsPerSegment;
      coords.push([
        Number((sLat + (eLat - sLat) * ratio).toFixed(5)),
        Number((sLng + (eLng - sLng) * ratio).toFixed(5)),
      ]);
    }
  }
  coords.push(waypoints[waypoints.length - 1]);
  return coords;
}

export default function AmbulancePage() {
  const [hospitals, setHospitals] = useState(FALLBACK_HOSPITALS);
  const [junctions, setJunctions] = useState(FALLBACK_JUNCTIONS);
  const [ambulance, setAmbulance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pre-Trip Form State
  const [location, setLocation] = useState(DEFAULT_DEMO_LOCATION);
  const [locationError, setLocationError] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState(FALLBACK_HOSPITALS[0].id);
  const [emergencyType, setEmergencyType] = useState('CARDIAC');

  // Route Intelligence & Preview State
  const [analyzingIntelligence, setAnalyzingIntelligence] = useState(false);
  const [intelligenceResult, setIntelligenceResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Active Journey Real-Time State
  const [startingEmergency, setStartingEmergency] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [remainingKm, setRemainingKm] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(78);
  const [journeyStatus, setJourneyStatus] = useState('EN_ROUTE');
  const [activeRouteCoords, setActiveRouteCoords] = useState([]);
  const [completedInfo, setCompletedInfo] = useState(null);

  // Cancellation Modal & Operational State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('ACTIVATED_BY_MISTAKE');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelledInfo, setCancelledInfo] = useState(null);
  const [cancelError, setCancelError] = useState('');

  // Active Trip Reroute Alert Notification
  const [rerouteNotification, setRerouteNotification] = useState(null);
  const [congestionNotification, setCongestionNotification] = useState(null);

  // Scenario Specific Infrastructure State
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [roadUsers, setRoadUsers] = useState([]);
  const [previewRouteCoordinates, setPreviewRouteCoordinates] = useState([]);

  // Signals Map Filter State ('ALL', 'UPCOMING', 'PRIORITY_ACTIVE', 'PASSED')
  const [signalFilter, setSignalFilter] = useState('UPCOMING');

  const handleCancelEmergencySubmit = async () => {
    if (!activeTrip || cancelling) return;

    setCancelling(true);
    setCancelError('');

    try {
      const res = await api.post(`/trips/${activeTrip.id}/cancel`, {
        reason: cancelReason,
        customReason: cancelReason === 'OTHER' ? cancelCustomReason : '',
      });

      if (res.data && res.data.success) {
        setJourneyStatus('CANCELLED');
        setCancelledInfo({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reason: res.data.reason || 'Activated by mistake',
          hospitalName: selectedHospital?.name || 'Destination Hospital',
        });
        setActiveTrip(null);
        setActiveRouteCoords([]);
        setRerouteNotification(null);
        setShowCancelModal(false);
      } else {
        setCancelError(res.data?.message || 'Unable to cancel the emergency journey. Please try again.');
      }
    } catch (err) {
      console.error('Failed to cancel trip:', err);
      setCancelError(err.response?.data?.message || 'Unable to cancel the emergency journey. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReturnToOperations = () => {
    setActiveTrip(null);
    setCompletedInfo(null);
    setCancelledInfo(null);
    setIntelligenceResult(null);
    setJourneyStatus('EN_ROUTE');
    setRerouteNotification(null);
    setActiveRouteCoords([]);
    setCurrentPosition(null);
    api.post('/demo/reset').catch(() => {});
  };

  // 1. Initialize data & check for active trip recovery
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [hospRes, jncRes, ambRes, activeRes] = await Promise.all([
          api.get('/hospitals').catch(() => ({ data: { success: false } })),
          api.get('/junctions').catch(() => ({ data: { junctions: [] } })),
          api.get('/ambulances/me').catch(() => ({ data: { ambulance: null } })),
          api.get('/trips/active').catch(() => ({ data: { activeTrip: null } })),
        ]);

        let loadedHospitals = FALLBACK_HOSPITALS;
        if (hospRes.data && hospRes.data.success && hospRes.data.hospitals && hospRes.data.hospitals.length > 0) {
          loadedHospitals = hospRes.data.hospitals;
        }

        setHospitals(loadedHospitals);
        if (loadedHospitals.length > 0) {
          setSelectedHospitalId(loadedHospitals[0].id);
        }

        if (jncRes.data && jncRes.data.success && jncRes.data.junctions && jncRes.data.junctions.length > 0) {
          setJunctions(jncRes.data.junctions);
        }

        if (ambRes.data && ambRes.data.success && ambRes.data.ambulance) {
          setAmbulance(ambRes.data.ambulance);
        }

        // Active Trip Refresh Recovery
        if (activeRes.data && activeRes.data.success && activeRes.data.activeTrip) {
          const trip = activeRes.data.activeTrip;
          setActiveTrip(trip);
          setCurrentPosition({
            latitude: trip.currentLatitude || trip.startLatitude,
            longitude: trip.currentLongitude || trip.startLongitude,
            status: 'EN_ROUTE',
          });
          setRemainingKm(trip.remainingDistanceKm || trip.estimatedDistanceKm || 0);
          setRemainingSec((trip.remainingDurationMinutes || 5) * 60);
          setJourneyStatus(trip.status === 'APPROACHING' ? 'APPROACHING' : 'EN_ROUTE');
          if (trip.hospitalId) setSelectedHospitalId(trip.hospitalId);

          const socket = connectSocket();
          if (socket) {
            joinTripRoom(trip.id);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 2. Real-time Socket Event Listeners during Active Trip
  useEffect(() => {
    if (!activeTrip) return;

    const socket = connectSocket();
    if (!socket) return;

    joinTripRoom(activeTrip.id);

    const handleLocationUpdate = (data) => {
      setCurrentPosition({
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
      });

      if (data.remainingDistanceKm !== undefined) {
        setRemainingKm(data.remainingDistanceKm);
      }
      if (data.remainingSeconds !== undefined) {
        setRemainingSec(data.remainingSeconds);
      }
      if (data.speedKmH !== undefined) {
        setSpeedKmH(data.speedKmH);
      }
      if (data.junctions && data.junctions.length > 0) {
        setJunctions(data.junctions);
      }
      if (data.routeCoordinates && data.routeCoordinates.length > 0) {
        setActiveRouteCoords(data.routeCoordinates);
      }

      setActiveTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentLatitude: data.latitude,
          currentLongitude: data.longitude,
          remainingDistanceKm: data.remainingDistanceKm,
          remainingDurationMinutes: data.remainingDurationMinutes,
          status: data.status,
          junctions: data.junctions || prev.junctions,
          routeCoordinates: data.routeCoordinates || prev.routeCoordinates,
        };
      });
    };

    const handleArriving = (data) => {
      if (data.tripId !== activeTrip.id) return;
      setJourneyStatus('APPROACHING');
    };

    const handleCompleted = (data) => {
      if (data.tripId !== activeTrip.id) return;

      const safeHospList = hospitals && hospitals.length > 0 ? hospitals : FALLBACK_HOSPITALS;
      setJourneyStatus('COMPLETED');
      setCompletedInfo({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hospitalName: safeHospList.find((h) => String(h.id) === String(activeTrip.hospitalId))?.name || 'Destination Hospital',
      });
      setActiveTrip(null);
      setRerouteNotification(null);
    };

    // Socket Congestion Listener
    const handleCongestionDetected = (data) => {
      setCongestionNotification({
        title: 'CONGESTION DETECTED AHEAD',
        message: data.message || 'Heavy traffic is affecting the current emergency route. LifeLane is evaluating alternatives.',
      });
    };

    // Socket Reroute Listener
    const handleRerouted = (data) => {
      setCongestionNotification(null);
      setRerouteNotification({
        title: 'ROUTE UPDATED',
        message: data.reason || 'Congestion detected ahead. A faster emergency route has been selected.',
        previousEtaMinutes: data.previousETA || data.previousEtaMinutes || 15,
        newEtaMinutes: data.updatedETA || data.newEtaMinutes || 9,
        minutesSaved: data.estimatedSavingMinutes || data.minutesSaved || 6,
      });

      if (data.routeCoordinates || data.newRouteCoordinates) {
        const newCoords = data.routeCoordinates || data.newRouteCoordinates;
        setActiveRouteCoords(newCoords);
        setActiveTrip((prev) => ({
          ...prev,
          routeCoordinates: newCoords,
        }));
      }

      if (data.junctions && data.junctions.length > 0) {
        setJunctions(data.junctions);
      }
    };

    const handleTripCancelled = (data) => {
      const safeHospList = hospitals && hospitals.length > 0 ? hospitals : FALLBACK_HOSPITALS;
      setJourneyStatus('CANCELLED');
      setCancelledInfo({
        time: new Date(data.cancelledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: data.reason || 'Activated by mistake',
        hospitalName: safeHospList.find((h) => String(h.id) === String(data.hospitalId))?.name || 'Destination Hospital',
      });
      setActiveTrip(null);
      setActiveRouteCoords([]);
      setRerouteNotification(null);
      setCongestionNotification(null);
    };

    socket.on('trip:location', handleLocationUpdate);
    socket.on('trip:arriving', handleArriving);
    socket.on('trip:completed', handleCompleted);
    socket.on('trip:cancelled', handleTripCancelled);
    socket.on('mobility:rerouted', handleRerouted);
    socket.on('trip:rerouted', handleRerouted);
    socket.on('congestion:detected', handleCongestionDetected);

    return () => {
      socket.off('trip:location', handleLocationUpdate);
      socket.off('trip:arriving', handleArriving);
      socket.off('trip:completed', handleCompleted);
      socket.off('trip:cancelled', handleTripCancelled);
      socket.off('mobility:rerouted', handleRerouted);
      socket.off('trip:rerouted', handleRerouted);
      socket.off('congestion:detected', handleCongestionDetected);
    };
  }, [activeTrip, hospitals]);

  // 3. Live Smooth Uber/Rapido-Style Navigation Ticker along OSRM road coordinates
  useEffect(() => {
    if (!activeTrip) return;

    const safeHospList = hospitals && hospitals.length > 0 ? hospitals : FALLBACK_HOSPITALS;
    const currentHosp = safeHospList.find((h) => String(h.id) === String(selectedHospitalId)) || safeHospList[0];
    const currentLoc = location || DEFAULT_DEMO_LOCATION;

    const coordsToUse =
      activeRouteCoords && activeRouteCoords.length > 0
        ? activeRouteCoords
        : previewRouteCoordinates && previewRouteCoordinates.length > 0
        ? previewRouteCoordinates
        : generateFallbackRouteGeometry(currentLoc, currentHosp, currentHosp?.id);

    if (!coordsToUse || coordsToUse.length === 0) return;

    let stepIndex = 0;
    const totalSteps = coordsToUse.length;
    const initialDistKm = 5.4;

    const interval = setInterval(() => {
      if (stepIndex >= totalSteps - 1) {
        clearInterval(interval);
        const destPoint = coordsToUse[totalSteps - 1];

        // 1 & 5. Stop animation & set trip status to ARRIVED immediately
        setJourneyStatus('ARRIVED');
        if (destPoint && Array.isArray(destPoint) && destPoint.length >= 2) {
          setCurrentPosition({
            latitude: destPoint[0],
            longitude: destPoint[1],
            bearing: 0,
            status: 'ARRIVED',
          });
        }

        setRemainingKm(0);
        setRemainingSec(0);

        // 2 & 3. Remove red navigation polyline & overlays from map immediately
        setActiveRouteCoords([]);
        setPreviewRouteCoordinates([]);
        setIntelligenceResult(null);
        setSelectedRouteId(null);
        setRerouteNotification(null);
        setCongestionNotification(null);

        // Restore all traffic signals to NORMAL operation
        setJunctions((prevJunctions) =>
          prevJunctions.map((junc) => ({
            ...junc,
            signalState: 'NORMAL',
          }))
        );

        const arrivalTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Notify socket server to update police & hospital dashboards
        try {
          const socket = connectSocket();
          if (socket && activeTrip?.id) {
            socket.emit('trip:complete', {
              tripId: activeTrip.id,
              hospitalId: currentHosp?.id,
              ambulanceCode: 'AMB-1042',
              arrivalTime: arrivalTimeStr,
              message: 'Thank you for your cooperation. The ambulance has safely reached its destination.',
            });
          }
        } catch (e) {}

        // 6. After 2 seconds, display Emergency Completed Successfully notification
        setTimeout(() => {
          setJourneyStatus('COMPLETED');
          setCompletedInfo({
            title: 'Emergency Completed Successfully',
            subtitle: 'Patient has arrived at the destination hospital.',
            time: arrivalTimeStr,
            hospitalName: currentHosp?.name || 'Destination Hospital',
            totalDistanceCoveredKm: initialDistKm,
            statusText: 'Emergency Completed',
          });
        }, 2000);

        return;
      }

      const currPt = coordsToUse[stepIndex];
      stepIndex += 1;
      const nextPt = coordsToUse[stepIndex];

      if (currPt && nextPt && Array.isArray(currPt) && Array.isArray(nextPt)) {
        const [cLat, cLng] = currPt;
        const [nLat, nLng] = nextPt;

        const bearing = calculateBearing(cLat, cLng, nLat, nLng);
        setCurrentPosition({
          latitude: nLat,
          longitude: nLng,
          bearing: bearing,
          status: stepIndex >= totalSteps - 5 ? 'APPROACHING' : 'EN_ROUTE',
        });

        const progressRatio = (totalSteps - 1 - stepIndex) / Math.max(1, totalSteps - 1);
        setRemainingKm(Number((progressRatio * initialDistKm).toFixed(2)));
        setRemainingSec(Math.max(0, Math.round(progressRatio * 360)));
        setSpeedKmH(78);

        // Update real-time junction distance and emergency signal states
        setJunctions((prevJunctions) =>
          prevJunctions.map((junc) => {
            if (!junc.latitude || !junc.longitude) return junc;

            const dLat = (junc.latitude - nLat) * 111000;
            const dLng = (junc.longitude - nLng) * 111000 * Math.cos((nLat * Math.PI) / 180);
            const distMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

            let newSignalState = junc.signalState || 'NORMAL';
            if (distMeters <= 350 && distMeters > 50) {
              newSignalState = 'EMERGENCY_PRIORITY';
            } else if (distMeters <= 50 && distMeters >= 0) {
              newSignalState = 'TRANSITION';
            } else if (distMeters > 350) {
              newSignalState = 'NORMAL';
            }

            return {
              ...junc,
              distanceMeters: distMeters,
              signalState: newSignalState,
            };
          })
        );
      }
    }, 450);

    return () => clearInterval(interval);
  }, [activeTrip, activeRouteCoords, previewRouteCoordinates, selectedHospitalId, hospitals, location]);

  // Fetch OSRM GeoJSON route coordinates when selected hospital or location changes
  useEffect(() => {
    let isMounted = true;
    const safeHospList = hospitals && hospitals.length > 0 ? hospitals : FALLBACK_HOSPITALS;
    const selectedHosp = safeHospList.find((h) => String(h.id) === String(selectedHospitalId)) || safeHospList[0];
    if (!selectedHosp) return;

    const currentLoc = location || DEFAULT_DEMO_LOCATION;

    async function loadRoute() {
      const osrmRes = await fetchOSRMRoute(currentLoc, selectedHosp);
      if (isMounted && osrmRes && osrmRes.coordinates) {
        setPreviewRouteCoordinates(osrmRes.coordinates);
      }
    }
    loadRoute();

    const code = selectedHosp.scenarioCode || 'INTERSECTION_CORRIDOR';

    if (code === 'ROAD_INCIDENT') {
      setIncidents([{ id: 'inc-1', title: 'Vehicle Breakdown', latitude: 12.9780, longitude: 77.6190, severity: 'MODERATE' }]);
      setCameras([]);
    } else if (code === 'CAMERA_CORRIDOR') {
      setIncidents([]);
      setCameras([
        { id: 'cam-1', name: 'Camera Point 01 - Agara Flyover', latitude: 12.9245, longitude: 77.6530, status: 'CLEAR' },
        { id: 'cam-2', name: 'Camera Point 02 - Bellandur Intake', latitude: 12.9270, longitude: 77.6780, status: 'OBSTRUCTION_DETECTED' },
      ]);
    } else {
      setIncidents([]);
      setCameras([]);
    }

    return () => { isMounted = false; };
  }, [selectedHospitalId, hospitals, location]);

  // GPS Location Detection
  const handleDetectLocation = useCallback(() => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Using demo location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: 'Detected GPS Location',
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationError('Location access was not granted. You can use the demo location for this prototype.');
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }, []);

  // Use Demo Location
  const handleUseDemoLocation = useCallback(() => {
    setLocation(DEFAULT_DEMO_LOCATION);
    setLocationError('');
  }, []);

  // Selected Hospital object
  const selectedHospital = hospitals.find((h) => String(h.id) === String(selectedHospitalId)) || hospitals[0];

  // Analyze Routes Handler (POST /api/intelligence/routes)
  const handleAnalyzeRoutes = async () => {
    if (!location || !selectedHospital) return;

    setAnalyzingIntelligence(true);
    setError('');
    setIntelligenceResult(null);

    try {
      const res = await api.post('/intelligence/routes', {
        hospitalId: selectedHospital.id,
        emergencyType,
        start: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });

      if (res.data && res.data.success) {
        setIntelligenceResult(res.data);
        setSelectedRouteId(res.data.recommendedRoute.routeId);
      }
    } catch (err) {
      console.warn('Intelligence API call error:', err);
      const osrmRes = await fetchOSRMRoute(location, selectedHospital);
      const roadCoords = osrmRes?.coordinates || generateFallbackRouteGeometry(location, selectedHospital);

      const fallbackResult = {
        recommendedRoute: {
          routeId: 'route-b',
          name: 'Arterial Bypass Corridor (HAL Highway Bypass)',
          coordinates: roadCoords,
          distanceKm: osrmRes?.distanceKm || 5.1,
          baseEstimatedMinutes: osrmRes?.durationMinutes || 9,
          trafficLevel: 'LOW',
          congestionScore: 18,
          predictedMinutes: osrmRes?.durationMinutes || 9,
        },
        alternatives: [
          { routeId: 'route-b', name: 'Arterial Bypass Corridor (HAL Highway Bypass)', distanceKm: osrmRes?.distanceKm || 5.1, predictedMinutes: osrmRes?.durationMinutes || 9, trafficLevel: 'LOW', congestionScore: 18 },
          { routeId: 'route-c', name: 'Outer Ring Corridor (Indiranagar 100ft Rd)', distanceKm: 4.8, predictedMinutes: 11, trafficLevel: 'MODERATE', congestionScore: 45 },
          { routeId: 'route-a', name: 'Primary Direct Corridor (Old Airport Rd)', distanceKm: 4.4, predictedMinutes: 13, trafficLevel: 'HIGH', congestionScore: 78 },
        ],
        decision: {
          reason: 'Lower predicted congestion and fewer expected intersection delays.',
          keyFactors: ['Lower predicted congestion', 'Fewer expected signal delays', 'No active route restriction'],
          riskLevel: 'LOW',
          confidence: 0.91,
          decisionSource: 'DETERMINISTIC_FALLBACK',
        },
        comparison: {
          fastestAlternativeMinutes: 13,
          recommendedMinutes: 9,
          estimatedMinutesSaved: 4,
        },
      };

      setIntelligenceResult(fallbackResult);
      setSelectedRouteId('route-b');
    } finally {
      setAnalyzingIntelligence(false);
    }
  };

  // Currently Active Selected Route
  const activeSelectedRoute =
    intelligenceResult?.alternatives.find((r) => r.routeId === selectedRouteId) ||
    intelligenceResult?.recommendedRoute;

  // Start Emergency Handler (POST /api/trips)
  const handleStartEmergency = async () => {
    if (startingEmergency || !selectedHospital) return;

    setStartingEmergency(true);
    setError('');

    try {
      const osrmRes = await fetchOSRMRoute(location || DEFAULT_DEMO_LOCATION, selectedHospital);
      const roadCoords =
        osrmRes?.coordinates && osrmRes.coordinates.length > 0
          ? osrmRes.coordinates
          : previewRouteCoordinates && previewRouteCoordinates.length > 0
          ? previewRouteCoordinates
          : generateFallbackRouteGeometry(location || DEFAULT_DEMO_LOCATION, selectedHospital);

      let trip = null;
      try {
        const res = await api.post('/trips', {
          hospitalId: selectedHospital.id,
          emergencyType,
          start: {
            latitude: location?.latitude || 12.9352,
            longitude: location?.longitude || 77.6245,
          },
        });

        if (res.data && res.data.success && res.data.trip) {
          trip = res.data.trip;
        }
      } catch (apiErr) {
        console.warn('Trip API notice, initializing resilient emergency session:', apiErr.message);
      }

      const activeTripObj = trip || {
        id: 'trip-demo-' + Date.now(),
        hospitalId: selectedHospital.id,
        emergencyType: emergencyType || 'CARDIAC',
        startLatitude: location?.latitude || 12.9352,
        startLongitude: location?.longitude || 77.6245,
        estimatedDistanceKm: osrmRes?.distanceKm || 5.4,
        estimatedDurationMinutes: osrmRes?.durationMinutes || 8,
        status: 'EN_ROUTE',
      };

      setActiveTrip({
        ...activeTripObj,
        routeCoordinates: roadCoords,
      });
      setActiveRouteCoords(roadCoords);

      const p1 = roadCoords[0] || [activeTripObj.startLatitude, activeTripObj.startLongitude];
      const p2 = roadCoords[1] || p1;
      const initialBearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

      setCurrentPosition({
        latitude: p1[0],
        longitude: p1[1],
        bearing: initialBearing,
        status: 'EN_ROUTE',
      });
      setRemainingKm(osrmRes?.distanceKm || 5.4);
      setRemainingSec((osrmRes?.durationMinutes || 8) * 60);
      setJourneyStatus('EN_ROUTE');

      try {
        const socket = connectSocket();
        if (socket && activeTripObj.id) {
          joinTripRoom(activeTripObj.id);
        }
      } catch (sErr) {}
    } catch (err) {
      console.error('Start emergency error:', err);
    } finally {
      setStartingEmergency(false);
    }
  };



  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
        <PageHeader title="Ambulance Operations" code={ambulance?.vehicleNumber || 'AMB-1042'} status="READY" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Initializing ambulance operations platform..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Ambulance Operations"
        code={ambulance?.vehicleNumber || 'AMB-1042'}
        status={activeTrip ? 'EMERGENCY' : 'READY'}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Map View (68%) */}
        <div className="w-full lg:w-[68%] h-[50vh] lg:h-full relative bg-[#E4E7EC]">
          <OperationsMap
            center={
              currentPosition
                ? [currentPosition.latitude, currentPosition.longitude]
                : [location.latitude, location.longitude]
            }
            zoom={14}
            ambulanceLocation={
              currentPosition || {
                latitude: location.latitude,
                longitude: location.longitude,
                status: activeTrip ? 'EN_ROUTE' : 'AVAILABLE',
              }
            }
            hospitals={hospitals}
            selectedHospitalId={selectedHospitalId}
            onSelectHospital={!activeTrip ? (h) => setSelectedHospitalId(h.id) : null}
            junctions={junctions}
            incidents={incidents}
            cameras={cameras}
            roadUsers={roadUsers}
            routeCoordinates={
              journeyStatus === 'ARRIVED' || journeyStatus === 'COMPLETED' || completedInfo || !activeTrip
                ? []
                : activeRouteCoords
            }
            followMode={!!activeTrip}
          />

          {/* Top Status Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 bg-white border border-[#E4E7EC] rounded-[8px] p-3 shadow-sm max-w-xs">
            <div className="text-xs font-semibold text-[#182230] flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeTrip ? 'bg-[#C62828] animate-pulse' : 'bg-[#16794A]'}`} />
              {activeTrip ? 'Emergency Journey Active' : 'Emergency Operations Radar'}
            </div>
            <div className="text-[11px] text-[#667085] mt-0.5">
              {activeTrip
                ? `Destination: ${selectedHospital?.name || 'Hospital'}`
                : `${hospitals.length} active emergency intake centers`}
            </div>
          </div>

          {/* Real-time Reroute Notification Overlay */}
          {rerouteNotification && (
            <div className="absolute bottom-6 left-6 right-6 lg:right-auto z-20 bg-white border border-[#FECDCA] rounded-[10px] p-4 shadow-lg max-w-md animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[6px] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#C62828] uppercase tracking-wider">
                      {rerouteNotification.title}
                    </span>
                    <span className="text-[10px] font-semibold bg-[#F0FDF4] text-[#16794A] border border-[#DCFCE7] px-2 py-0.5 rounded-[4px]">
                      {rerouteNotification.minutesSaved} min faster
                    </span>
                  </div>
                  <p className="text-xs text-[#182230] font-medium mt-1 mb-2 leading-snug">
                    {rerouteNotification.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs pt-2 border-t border-[#E4E7EC]">
                    <div>
                      <span className="text-[#667085]">Previous ETA:</span>{' '}
                      <span className="line-through text-[#667085]">{rerouteNotification.previousEtaMinutes} min</span>
                    </div>
                    <div>
                      <span className="text-[#667085]">New ETA:</span>{' '}
                      <span className="font-bold text-[#16794A]">{rerouteNotification.newEtaMinutes} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Panel (32%) */}
        <div className="w-full lg:w-[32%] h-full bg-white border-l border-[#E4E7EC] flex flex-col overflow-y-auto p-5">
          {/* SCENARIO A: Completed Journey Screen */}
          {completedInfo ? (
            <div className="my-auto text-center py-6 animate-fade-in space-y-4">
              <div className="w-14 h-14 bg-[#F0FDF4] border border-[#DCFCE7] text-[#16794A] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold text-[#16794A] uppercase tracking-wider block mb-1">
                  Arrival Confirmed
                </span>
                <h2 className="text-xl font-bold text-[#182230]">{completedInfo.title || 'Emergency Completed Successfully'}</h2>
                <p className="text-xs text-[#667085] mt-1">{completedInfo.subtitle || 'Patient has arrived at the destination hospital.'}</p>
              </div>

              {/* Arrival Metrics Card */}
              <div className="p-4 bg-[#F0FDF4] border border-[#DCFCE7] rounded-[10px] text-left space-y-2.5 shadow-xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#667085]">Destination Hospital:</span>
                  <span className="font-bold text-[#182230]">{completedInfo.hospitalName}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#DCFCE7]">
                  <span className="text-[#667085]">Arrival Time:</span>
                  <span className="font-semibold text-[#182230]">{completedInfo.time}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#DCFCE7]">
                  <span className="text-[#667085]">Total Distance Covered:</span>
                  <span className="font-semibold text-[#182230]">{completedInfo.totalDistanceCoveredKm || 5.4} km</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#DCFCE7]">
                  <span className="text-[#667085]">Emergency Status:</span>
                  <span className="font-bold text-[#16794A] bg-[#DCFCE7] px-2 py-0.5 rounded-[4px]">
                    {completedInfo.statusText || 'Emergency Completed'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReturnToOperations}
                className="w-full py-3 px-4 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Start New Emergency</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : cancelledInfo ? (
            /* SCENARIO A-2: Cancelled Journey Screen */
            <div className="my-auto text-center py-6">
              <div className="w-12 h-12 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[10px] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <span className="text-xs font-semibold text-[#C62828] uppercase tracking-wider block mb-1">
                Emergency Cancelled
              </span>
              <h2 className="text-xl font-semibold text-[#182230] mb-2">Emergency Journey Closed</h2>
              <p className="text-xs text-[#667085] mb-4">
                The emergency journey has been closed. Traffic operations and the destination hospital have been notified.
              </p>

              <div className="p-3.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-left text-xs space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Destination:</span>
                  <span className="font-semibold text-[#182230]">{cancelledInfo.hospitalName}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E4E7EC]">
                  <span className="text-[#667085]">Reason:</span>
                  <span className="font-semibold text-[#C62828]">{cancelledInfo.reason}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E4E7EC]">
                  <span className="text-[#667085]">Cancelled At:</span>
                  <span className="font-mono text-[#182230]">{cancelledInfo.time}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReturnToOperations}
                className="w-full py-2.5 px-4 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-medium rounded-[8px] transition-colors flex items-center justify-center gap-2"
              >
                Return to operations
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : activeTrip ? (
            /* SCENARIO B: Active Journey Driver Experience */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3F2] border border-[#FECDCA] rounded-[6px] text-xs font-semibold text-[#C62828] mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#C62828] animate-ping" />
                  EMERGENCY ACTIVE
                </div>

                <h2 className="text-lg font-semibold text-[#182230] tracking-tight">
                  {selectedHospital?.name || 'Destination Hospital'}
                </h2>
                <p className="text-xs text-[#667085] mt-0.5 mb-4">{selectedHospital?.address}</p>

                {/* Congestion Detected Non-Blocking Alert */}
                {congestionNotification && (
                  <div className="mb-4 p-3 bg-[#FFFAEB] border border-[#FEDF89] rounded-[8px] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#B54708]">
                      <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0" />
                      CONGESTION DETECTED AHEAD
                    </div>
                    <div className="text-[#182230] leading-relaxed">
                      Heavy traffic is affecting the current emergency route. LifeLane is evaluating alternatives.
                    </div>
                  </div>
                )}

                {/* Reroute Explainable Decision Card */}
                {rerouteNotification && (
                  <div className="mb-4 p-3.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[8px] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#175CD3] uppercase tracking-wider text-[11px]">
                        {rerouteNotification.title || 'ROUTE UPDATED'}
                      </span>
                      <span className="text-[10px] font-bold bg-[#175CD3] text-white px-2 py-0.5 rounded">
                        Saved {rerouteNotification.minutesSaved || 6} min
                      </span>
                    </div>
                    <div className="text-[#182230] font-medium leading-relaxed">
                      {rerouteNotification.message}
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#B2DDFF] text-center font-mono text-[11px]">
                      <div>
                        <div className="text-[10px] text-[#667085] font-sans">Previous ETA</div>
                        <div className="font-bold text-[#667085] line-through">{rerouteNotification.previousEtaMinutes || 15} min</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#667085] font-sans">Updated ETA</div>
                        <div className="font-bold text-[#175CD3]">{rerouteNotification.newEtaMinutes || 9} min</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#667085] font-sans">Saving</div>
                        <div className="font-bold text-[#16794A]">-{rerouteNotification.minutesSaved || 6} min</div>
                      </div>
                    </div>
                    <div className="space-y-1 pt-1 text-[11px]">
                      <div className="font-semibold text-[#182230] uppercase text-[10px] tracking-wider">WHY THIS ROUTE</div>
                      <div className="text-[#667085] space-y-0.5">
                        <div>• Avoids heavy congestion on Hosur Rd / Richmond Rd corridor</div>
                        <div>• Lower predicted arrival time</div>
                        <div>• Clear arterial corridor along MG Road</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Metrics */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px]">
                    <div className="text-[10px] font-medium text-[#667085] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#175CD3]" />
                      ETA
                    </div>
                    <div className="text-lg font-bold text-[#182230] font-mono">
                      {formatTime(remainingSec)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px]">
                    <div className="text-[10px] font-medium text-[#667085] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-[#16794A]" />
                      Distance
                    </div>
                    <div className="text-lg font-bold text-[#182230] font-mono">
                      {remainingKm > 1 ? `${remainingKm} km` : `${Math.round(remainingKm * 1000)} m`}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px]">
                    <div className="text-[10px] font-medium text-[#667085] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-[#C62828]" />
                      Speed
                    </div>
                    <div className="text-lg font-bold text-[#C62828] font-mono">
                      {speedKmH || (remainingSec > 0 && remainingKm > 0 ? Math.round(remainingKm / (remainingSec / 3600)) : 58)} km/h
                    </div>
                  </div>
                </div>

                {/* Journey Status Card */}
                <div className="p-4 border border-[#E4E7EC] rounded-[8px] bg-white space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085]">Status</span>
                    <span className={`font-semibold ${journeyStatus === 'APPROACHING' ? 'text-[#B54708]' : 'text-[#16794A]'}`}>
                      {journeyStatus === 'APPROACHING' ? 'Approaching Hospital' : 'En route'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E4E7EC]">
                    <span className="text-[#667085]">Emergency Type</span>
                    <span className="font-semibold text-[#182230]">{activeTrip.emergencyType}</span>
                  </div>
                </div>

                {/* Corridor Status */}
                <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-xs text-[#667085] flex items-center gap-2 mb-6">
                  <Radio className="w-4 h-4 text-[#175CD3] shrink-0" />
                  Emergency corridor priority active
                </div>

                {/* Restrained Signals Map Filter Section */}
                <div className="p-4 border border-[#E4E7EC] rounded-[8px] bg-white space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                      Signals
                    </span>
                    <select
                      value={signalFilter}
                      onChange={(e) => setSignalFilter(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] text-[#182230] focus:outline-none"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ALL">All route signals</option>
                      <option value="PRIORITY_ACTIVE">Priority active</option>
                      <option value="PASSED">Passed</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {junctions
                      .filter((j) => {
                        if (signalFilter === 'UPCOMING') return !j.isPassed && j.signalState !== 'EMERGENCY_PRIORITY';
                        if (signalFilter === 'PRIORITY_ACTIVE') return j.signalState === 'EMERGENCY_PRIORITY';
                        if (signalFilter === 'PASSED') return j.isPassed || j.signalState === 'CLEARED';
                        return true;
                      })
                      .map((j) => {
                        const distStr = j.distanceMeters !== undefined
                          ? (j.distanceMeters >= 1000 ? `${(j.distanceMeters / 1000).toFixed(1)} km` : `${j.distanceMeters} m`)
                          : '420 m';

                        return (
                          <div key={j.id} className="p-2.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-[#182230]">{j.name}</div>
                              <div className="text-[11px] text-[#667085] font-mono">{distStr}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase ${
                              j.signalState === 'EMERGENCY_PRIORITY' ? 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]' :
                              j.signalState === 'PREPARING' ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' :
                              j.isPassed ? 'bg-[#F6F7F9] text-[#667085] border-[#E4E7EC]' :
                              'bg-white text-[#175CD3] border-[#E4E7EC]'
                            }`}>
                              {j.signalState === 'EMERGENCY_PRIORITY' ? 'Priority active' : j.isPassed ? 'Passed' : 'Upcoming'}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Live 4-Way Directional Signal Breakdown for Smart Intersection */}
                  {selectedHospital?.id === 'hosp-1' && junctions?.[0] && (
                    <div className="mt-3 pt-3 border-t border-[#E4E7EC] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                        Smart Intersection Signals ({junctions[0].name || 'Junction 01'})
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-1.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[4px] flex justify-between items-center">
                          <span className="text-[#667085]">NORTH:</span>
                          <span className={`font-bold px-1 py-0.5 rounded-[3px] text-[10px] uppercase ${
                            (junctions[0].signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'GREEN' || junctions[0].signalState === 'EMERGENCY_PRIORITY')
                              ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]'
                          }`}>
                            {(junctions[0].signals?.find(s => s.direction === 'NORTHBOUND')?.state === 'GREEN' || junctions[0].signalState === 'EMERGENCY_PRIORITY') ? 'GREEN' : 'RED'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[4px] flex justify-between items-center">
                          <span className="text-[#667085]">SOUTH:</span>
                          <span className="font-bold px-1 py-0.5 rounded-[3px] text-[10px] uppercase bg-[#FEF3F2] text-[#C62828]">
                            {junctions[0].signals?.find(s => s.direction === 'SOUTHBOUND')?.state || 'RED'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[4px] flex justify-between items-center">
                          <span className="text-[#667085]">EAST:</span>
                          <span className={`font-bold px-1 py-0.5 rounded-[3px] text-[10px] uppercase ${
                            junctions[0].signalState === 'EMERGENCY_PRIORITY' ? 'bg-[#FEF3F2] text-[#C62828]' :
                            (junctions[0].signals?.find(s => s.direction === 'EASTBOUND')?.state === 'GREEN' ? 'bg-[#F0FDF4] text-[#16794A]' : 'bg-[#FEF3F2] text-[#C62828]')
                          }`}>
                            {junctions[0].signalState === 'EMERGENCY_PRIORITY' ? 'RED' : (junctions[0].signals?.find(s => s.direction === 'EASTBOUND')?.state || 'GREEN')}
                          </span>
                        </div>
                        <div className="p-1.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[4px] flex justify-between items-center">
                          <span className="text-[#667085]">WEST:</span>
                          <span className="font-bold px-1 py-0.5 rounded-[3px] text-[10px] uppercase bg-[#FEF3F2] text-[#C62828]">
                            {junctions[0].signals?.find(s => s.direction === 'WESTBOUND')?.state || 'RED'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Restrained Outlined Cancel Emergency Button */}
                <div className="pt-4 border-t border-[#E4E7EC]">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError('');
                      setShowCancelModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#FEF3F2] text-[#C62828] border border-[#FECDCA] hover:border-[#FDA29B] text-xs font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#C62828]" />
                    Cancel emergency
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SCENARIO C: Pre-Trip Control Panel & Route Intelligence */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="mb-5 pb-4 border-b border-[#E4E7EC]">
                  <h2 className="text-base font-semibold text-[#182230]">Start emergency journey</h2>
                  <p className="text-xs text-[#667085] mt-0.5">Set current origin and target intake facility.</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] text-xs text-[#C62828] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Location Selection */}
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-[#182230] uppercase tracking-wider mb-2">
                      Current Location
                    </label>

                    <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] mb-2">
                      <div className="text-xs font-medium text-[#182230] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C62828]" />
                        {location.name || 'Current Position'}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-1">
                        Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        className="flex-1 py-1.5 px-2 bg-white border border-[#E4E7EC] hover:bg-[#F6F7F9] text-xs font-medium text-[#182230] rounded-[8px] transition-colors flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#172033]" />
                        Detect location
                      </button>
                      <button
                        type="button"
                        onClick={handleUseDemoLocation}
                        className="py-1.5 px-2.5 bg-white border border-[#E4E7EC] hover:bg-[#F6F7F9] text-xs font-medium text-[#667085] hover:text-[#182230] rounded-[8px] transition-colors"
                      >
                        Use demo location
                      </button>
                    </div>

                    {locationError && (
                      <div className="mt-2 text-[11px] text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] p-2 rounded-[6px]">
                        {locationError}
                      </div>
                    )}
                  </div>

                  {/* Destination Hospital */}
                  <div>
                    <label htmlFor="hospitalSelect" className="block text-xs font-medium text-[#182230] uppercase tracking-wider mb-2">
                      Destination Hospital
                    </label>
                    <select
                      id="hospitalSelect"
                      value={selectedHospitalId}
                      onChange={(e) => {
                        setSelectedHospitalId(e.target.value);
                        setIntelligenceResult(null);
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E4E7EC] rounded-[8px] text-[#182230] focus:outline-none focus:border-[#172033] transition-colors"
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.address})
                        </option>
                      ))}
                    </select>

                    {/* Demonstration Scenario Information Card */}
                    {selectedHospital && (
                      <div className="mt-2.5 p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] space-y-1">
                        <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                          DEMONSTRATION SCENARIO
                        </div>
                        <div className="text-xs font-semibold text-[#182230]">
                          {selectedHospital.scenarioTitle || 'Intersection Corridor'}
                        </div>
                        <div className="text-[11px] text-[#667085] leading-relaxed">
                          {selectedHospital.scenarioDescription || 'Multiple signalized intersections require coordinated emergency passage.'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Emergency Type */}
                  <div>
                    <label htmlFor="emergencyTypeSelect" className="block text-xs font-medium text-[#182230] uppercase tracking-wider mb-2">
                      Emergency Type
                    </label>
                    <select
                      id="emergencyTypeSelect"
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E4E7EC] rounded-[8px] text-[#182230] focus:outline-none focus:border-[#172033] transition-colors"
                    >
                      {EMERGENCY_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Analyze Routes Action */}
                  <button
                    type="button"
                    onClick={handleAnalyzeRoutes}
                    disabled={analyzingIntelligence || !selectedHospital}
                    className="w-full py-2.5 px-4 bg-[#172033] hover:bg-[#0F172A] disabled:opacity-60 text-white text-xs font-medium rounded-[8px] transition-colors flex items-center justify-center gap-2"
                  >
                    {analyzingIntelligence ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Evaluating emergency routes...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-[#175CD3]" />
                        Analyze routes
                      </>
                    )}
                  </button>
                </div>

                {/* ROUTE INTELLIGENCE RESULTS CARD */}
                {intelligenceResult && (
                  <div className="space-y-4 mb-6">
                    {/* Primary Recommendation Banner */}
                    <div className="p-4 bg-white border border-[#E4E7EC] rounded-[10px] shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-[#172033] uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#175CD3]" />
                          ROUTE INTELLIGENCE
                        </div>
                        <span className="text-[10px] font-medium bg-[#F0FDF4] text-[#16794A] border border-[#DCFCE7] px-2 py-0.5 rounded-[4px]">
                          RECOMMENDED
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-[#182230]">
                          {intelligenceResult.recommendedRoute.name}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-[#182230] mt-1">
                          <span className="text-[#175CD3]">{intelligenceResult.recommendedRoute.predictedMinutes} min</span>
                          <span>•</span>
                          <span>{intelligenceResult.recommendedRoute.distanceKm} km</span>
                          <span className="text-[#16794A] text-[11px] font-medium">
                            ({intelligenceResult.comparison.estimatedMinutesSaved} min faster)
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] text-xs text-[#182230] leading-relaxed">
                        <span className="font-semibold text-[#667085] block text-[10px] uppercase mb-0.5">Reason</span>
                        {intelligenceResult.decision.reason}
                      </div>

                      {/* Why this route factors */}
                      <div className="pt-2 border-t border-[#E4E7EC]">
                        <div className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider mb-1.5">
                          WHY THIS ROUTE
                        </div>
                        <ul className="space-y-1 text-xs text-[#182230]">
                          {intelligenceResult.decision.keyFactors.slice(0, 3).map((factor, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-[#16794A] shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAlternatives(!showAlternatives)}
                        className="text-xs font-medium text-[#175CD3] hover:underline pt-1 block"
                      >
                        {showAlternatives ? 'Hide alternatives' : 'View alternatives'}
                      </button>
                    </div>

                    {/* ROUTE OPTIONS / ALTERNATIVES PANEL */}
                    {showAlternatives && (
                      <div className="p-4 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[10px] space-y-3">
                        <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                          ROUTE OPTIONS
                        </div>

                        <div className="space-y-2">
                          {intelligenceResult.alternatives.map((alt) => {
                            const isRecommended = alt.routeId === intelligenceResult.recommendedRoute.routeId;
                            const isSelected = alt.routeId === selectedRouteId;
                            return (
                              <div
                                key={alt.routeId}
                                onClick={() => setSelectedRouteId(alt.routeId)}
                                className={`p-3 rounded-[8px] border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-white border-[#172033] shadow-sm'
                                    : 'bg-white border-[#E4E7EC] hover:border-[#D0D5DD]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-[#182230]">
                                    {alt.name}
                                  </div>
                                  {isRecommended && (
                                    <span className="text-[10px] font-bold text-[#16794A] bg-[#F0FDF4] border border-[#DCFCE7] px-1.5 py-0.5 rounded-[4px]">
                                      RECOMMENDED
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-[#667085] mt-1">
                                  <span className="font-semibold text-[#182230]">{alt.predictedMinutes} min</span>
                                  <span>{alt.distanceKm} km</span>
                                  <span className={`text-[11px] font-medium ${alt.trafficLevel === 'HIGH' ? 'text-[#C62828]' : alt.trafficLevel === 'MODERATE' ? 'text-[#B54708]' : 'text-[#16794A]'}`}>
                                    {alt.trafficLevel} congestion
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-2.5 bg-white border border-[#E4E7EC] rounded-[6px] text-[11px] text-[#667085] flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-[#175CD3] shrink-0 mt-0.5" />
                          <span>
                            Route A may be geographically shortest (4.4 km), but Route B is predicted to reach the hospital sooner due to lower arterial congestion.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Corridor Traffic Signals Nodes Preview */}
              {junctions && junctions.length > 0 && (
                <div className="pt-4 border-t border-[#E4E7EC] space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                      Corridor Traffic Signals ({junctions.length})
                    </span>
                    <span className="text-[10px] text-[#667085] font-medium bg-[#F6F7F9] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px]">
                      Normal Operation
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {junctions.map((j) => (
                      <div key={j.id} className="p-2 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-[#182230]">{j.name}</div>
                          <div className="text-[11px] text-[#667085] font-mono">Node Code: {j.code}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase bg-[#F6F7F9] text-[#667085] border-[#E4E7EC]">
                          NORMAL
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Emergency Action */}
              <div className="pt-4 border-t border-[#E4E7EC]">
                <button
                  type="button"
                  onClick={handleStartEmergency}
                  disabled={startingEmergency || !selectedHospital}
                  className="w-full py-3 px-4 bg-[#C62828] hover:bg-[#B71C1C] disabled:opacity-60 text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {startingEmergency ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting emergency...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      START EMERGENCY
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Emergency Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EC] rounded-[12px] shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#182230]">Cancel emergency journey?</h3>
                <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                  This will end the active emergency journey and notify traffic operations and the destination hospital that coordination is no longer required.
                </p>
              </div>
            </div>

            {/* Emergency Context Card */}
            <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Ambulance:</span>
                <span className="font-semibold text-[#182230]">{ambulance?.vehicleNumber || 'AMB-1042'}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#E4E7EC]">
                <span className="text-[#667085]">Destination:</span>
                <span className="font-semibold text-[#182230]">{selectedHospital?.name || 'Destination Hospital'}</span>
              </div>
            </div>

            {/* Optional Reason Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#182230]">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-xs text-[#182230] font-medium focus:outline-none focus:border-[#175CD3]"
              >
                <option value="ACTIVATED_BY_MISTAKE">Activated by mistake</option>
                <option value="EMERGENCY_NO_LONGER_REQUIRED">Emergency no longer requires transport</option>
                <option value="DESTINATION_CHANGED">Destination changed</option>
                <option value="VEHICLE_ISSUE">Vehicle issue</option>
                <option value="OTHER">Other</option>
              </select>

              {cancelReason === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Specify cancellation reason (optional)"
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  className="w-full px-3 py-2 mt-2 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-xs text-[#182230] focus:outline-none focus:border-[#175CD3]"
                />
              )}
            </div>

            {/* Error Alert */}
            {cancelError && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] text-xs text-[#C62828] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#F6F7F9] text-[#344054] border border-[#D0D5DD] text-xs font-semibold rounded-[8px] transition-colors"
              >
                Continue journey
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelEmergencySubmit}
                className="px-4 py-2 bg-[#C62828] hover:bg-[#B21E1E] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelling emergency...
                  </>
                ) : (
                  'Cancel emergency'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
