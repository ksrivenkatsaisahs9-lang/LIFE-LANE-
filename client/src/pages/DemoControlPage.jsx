import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import {
  AlertTriangle,
  RefreshCw,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Activity,
  Gauge,
  Clock,
  Info,
  X,
} from 'lucide-react';

export default function DemoControlPage() {
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [eventTimeline, setEventTimeline] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [triggering, setTriggering] = useState(false);

  // Helper to log timeline events
  const addTimelineEvent = (text) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventTimeline((prev) => [{ time: timeStr, text }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    async function checkActiveTrip() {
      try {
        setLoading(true);
        const res = await api.get('/trips/active').catch(() => ({ data: { activeTrip: null } }));
        if (res.data && res.data.success && res.data.activeTrip) {
          setActiveTrip(res.data.activeTrip);
          addTimelineEvent(`Active emergency trip detected: ${res.data.activeTrip.id}`);
        } else {
          addTimelineEvent('Demo environment initialized. System Ready.');
        }
      } catch (err) {
        console.error('Failed to check active trip:', err);
      } finally {
        setLoading(false);
      }
    }

    checkActiveTrip();

    const socket = connectSocket();
    if (socket) {
      const handleStarted = (data) => {
        setActiveTrip(data.trip);
        addTimelineEvent(`Emergency journey started (${data.ambulanceCode || 'AMB-1042'} -> ${data.hospitalName || 'Hospital'})`);
      };

      const handleLocation = (data) => {
        if (!activeTrip) {
          setActiveTrip({
            id: data.tripId,
            ambulanceCode: data.ambulanceCode || 'AMB-1042',
            emergencyType: data.emergencyType || 'CARDIAC',
            remainingKm: data.remainingDistanceKm,
            remainingSec: data.remainingSeconds,
          });
        }
      };

      const handleDisruption = (data) => {
        addTimelineEvent('Congestion disruption introduced (+4 min delay)');
        addTimelineEvent('Route intelligence evaluating optimal corridor...');
      };

      const handleRerouted = (data) => {
        addTimelineEvent(`Route updated: Saved ${data.minutesSaved || 3} min. New ETA: ${data.newEtaMinutes || 8} min.`);
      };

      const handleArriving = () => {
        addTimelineEvent('Ambulance approaching emergency intake facility (<= 500m)');
      };

      const handleCompleted = () => {
        setActiveTrip(null);
        addTimelineEvent('Emergency journey completed successfully.');
      };

      const handleReset = () => {
        setActiveTrip(null);
        setEventTimeline([]);
        addTimelineEvent('Demo environment reset. System Ready.');
      };

      socket.on('trip:started', handleStarted);
      socket.on('trip:location', handleLocation);
      socket.on('mobility:disruption', handleDisruption);
      socket.on('mobility:rerouted', handleRerouted);
      socket.on('trip:arriving', handleArriving);
      socket.on('trip:completed', handleCompleted);
      socket.on('demo:reset', handleReset);

      return () => {
        socket.off('trip:started', handleStarted);
        socket.off('trip:location', handleLocation);
        socket.off('mobility:disruption', handleDisruption);
        socket.off('mobility:rerouted', handleRerouted);
        socket.off('trip:arriving', handleArriving);
        socket.off('trip:completed', handleCompleted);
        socket.off('demo:reset', handleReset);
      };
    }
  }, []);

  const handleSpeedChange = async (speed) => {
    try {
      setSimSpeed(speed);
      await api.post('/demo/speed', { speed });
      addTimelineEvent(`Simulation speed set to ${speed}x`);
    } catch (err) {
      console.error('Speed change error:', err);
    }
  };

  const handleIntroduceCongestion = async () => {
    const tripId = activeTrip?.id || 'trip-demo';
    setTriggering(true);
    setActionMessage('');

    try {
      addTimelineEvent('Congestion introduced (+6 min delay ahead on active route)');
      addTimelineEvent('Route disruption detected');
      const res = await api.post('/demo/congestion', { tripId });
      if (res.data && res.data.success) {
        addTimelineEvent('Route alternatives evaluated by Mobility Intelligence');
        addTimelineEvent('Reroute recommended: Route B (via MG Road)');
        addTimelineEvent('Route updated: Saved 6 min. New ETA: 9 min (NO TELEPORTATION)');
        addTimelineEvent('Police corridor recalculated (Old route tracking ended, new route active)');
        addTimelineEvent('Hospital ETA updated to 9 min');
        setActionMessage('Controlled congestion disruption introduced! Mobility Intelligence executed smooth reroute from current position.');
      }
    } catch (err) {
      console.error('Congestion trigger error:', err);
      setActionMessage('Failed to trigger congestion. Ensure an emergency trip is active.');
    } finally {
      setTriggering(false);
    }
  };

  const handleClearDisruption = async () => {
    try {
      await api.post('/demo/congestion/clear');
      addTimelineEvent('Traffic disruption cleared from corridor.');
      setActionMessage('Traffic disruption cleared successfully.');
    } catch (err) {
      console.error('Clear disruption error:', err);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await api.post('/demo/reset');
      setActiveTrip(null);
      setShowResetConfirm(false);
      setActionMessage('Demo environment restored to clean state.');
      addTimelineEvent('Demo environment reset. System Ready.');
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = () => {
    if (resetting) {
      return { text: 'RESETTING', style: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' };
    }
    if (activeTrip) {
      return { text: 'JOURNEY ACTIVE', style: 'bg-[#FEF3F2] text-[#C62828] border-[#FECDCA]' };
    }
    return { text: 'SYSTEM READY', style: 'bg-[#F0FDF4] text-[#16794A] border-[#DCFCE7]' };
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      <PageHeader title="Demo Control & Disruption Simulator" code="DEMO-CTRL" status="PRESENTATION" />

      <div className="max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Banner */}
        <div className="p-4 bg-white border border-[#E4E7EC] rounded-[12px] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#172033] text-white rounded-[8px] flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-base font-semibold text-[#182230]">LifeLane Demo Control</h1>
                <span className="text-[10px] font-bold text-[#667085] bg-[#F6F7F9] border border-[#E4E7EC] px-2 py-0.5 rounded-[4px]">
                  DEMONSTRATION ENVIRONMENT
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                Presentation control panel for judges. Trigger disruptions, set speed multipliers, and monitor real-time event logs.
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-[6px] border ${statusInfo.style}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* Speed Controls & Simulation Panel */}
        <div className="p-5 bg-white border border-[#E4E7EC] rounded-[12px] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-[#667085] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#172033]" />
              Simulation Speed Multiplier
            </div>
            <div className="flex gap-2">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-[8px] border transition-all ${
                    simSpeed === s
                      ? 'bg-[#172033] text-white border-[#172033]'
                      : 'bg-white text-[#182230] border-[#E4E7EC] hover:bg-[#F6F7F9]'
                  }`}
                >
                  {s}x Speed
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#667085] uppercase tracking-wider mb-3">
              Active Trip Status
            </div>
            {activeTrip ? (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#C62828]">{activeTrip.id}</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    {activeTrip.ambulanceCode || 'AMB-1042'} | {activeTrip.emergencyType || 'CARDIAC'}
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C62828] animate-ping" />
              </div>
            ) : (
              <div className="p-3 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] text-xs text-[#667085]">
                No emergency trip active.
              </div>
            )}
          </div>
        </div>

        {/* Demo Actions */}
        <div className="p-5 bg-white border border-[#E4E7EC] rounded-[12px] shadow-sm space-y-4">
          <div className="text-xs font-medium text-[#667085] uppercase tracking-wider mb-1">
            Demo Disruption Actions
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={handleIntroduceCongestion}
              disabled={triggering}
              className="p-4 bg-[#FEF3F2] hover:bg-[#FEE4E2] border border-[#FECDCA] rounded-[8px] text-left transition-colors flex items-start gap-3 disabled:opacity-60"
            >
              <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#C62828] mb-0.5">Introduce Congestion</div>
                <div className="text-[11px] text-[#667085] leading-relaxed">
                  Injects +6 min congestion delay ahead on current route. Triggers Mobility Intelligence reroute from current location.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleClearDisruption}
              className="p-4 bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#DCFCE7] rounded-[8px] text-left transition-colors flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#16794A] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#16794A] mb-0.5">Clear Disruption</div>
                <div className="text-[11px] text-[#667085] leading-relaxed">
                  Removes active traffic disruption state from the emergency corridor.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="p-4 bg-[#F6F7F9] hover:bg-[#E4E7EC] border border-[#E4E7EC] rounded-[8px] text-left transition-colors flex items-start gap-3"
            >
              <RefreshCw className="w-5 h-5 text-[#172033] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#182230] mb-0.5">Reset Demonstration</div>
                <div className="text-[11px] text-[#667085] leading-relaxed">
                  Restores clean state: cancels active trips, resets vehicle to available, clears signal priority & cache.
                </div>
              </div>
            </button>
          </div>

          {actionMessage && (
            <div className="mt-2 p-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[8px] text-xs text-[#175CD3] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {actionMessage}
            </div>
          )}
        </div>

        {/* Demo Event Timeline */}
        <div className="p-5 bg-white border border-[#E4E7EC] rounded-[12px] shadow-sm">
          <div className="text-xs font-medium text-[#667085] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#172033]" />
            Demo Event Timeline
          </div>

          {eventTimeline.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {eventTimeline.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] flex items-center gap-3 text-xs"
                >
                  <span className="font-mono text-[#667085] text-[11px] font-semibold shrink-0">
                    {item.time}
                  </span>
                  <span className="text-[#182230] font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#667085] italic p-3 bg-[#F6F7F9] rounded-[6px]">
              System events will appear here in real time during demonstration.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-6 max-w-md w-full shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[8px] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-[#667085] hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-semibold text-[#182230] mb-1">Reset demonstration?</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                This will end the current simulated journey and restore the demonstration environment to a clean state.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-3 bg-white border border-[#E4E7EC] hover:bg-[#F6F7F9] text-xs font-medium text-[#182230] rounded-[8px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting}
                className="flex-1 py-2 px-3 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-1.5"
              >
                {resetting ? 'Resetting...' : 'Reset demonstration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
