/**
 * Centralized Demo Scenario Service for LifeLane Platform
 * Maps hospitals to their controlled demonstration scenarios, infrastructure, and directional traffic signals.
 */

function createDirectionalSignals(junctionId, codePrefix, emergencyDirection = 'EASTBOUND') {
  const directions = ['NORTHBOUND', 'SOUTHBOUND', 'EASTBOUND', 'WESTBOUND'];
  return directions.map((dir) => ({
    id: `sig-${junctionId}-${dir.toLowerCase()}`,
    junctionId,
    signalCode: `SIG-${codePrefix}-${dir.charAt(0)}`,
    direction: dir,
    state: dir === emergencyDirection ? 'NORMAL' : 'RED',
    isEmergencyRouteSignal: dir === emergencyDirection,
  }));
}

const DEMO_SCENARIOS = {
  SMART_INTERSECTION: {
    hospitalId: 'hosp-1',
    hospitalName: 'City General Hospital',
    address: 'Indiranagar, Bengaluru',
    latitude: 12.9592,
    longitude: 77.6445,
    scenarioCode: 'SMART_INTERSECTION',
    scenarioTitle: 'Smart Intersection Priority',
    scenarioDescription: 'Automated emergency priority through a four-way traffic intersection.',
    capabilities: [
      '1 km police early warning',
      'Distance-based coordination',
      'Four-way junction',
      'Emergency signal priority',
      'Automatic ambulance pass detection',
      'Automatic signal restoration',
      'Police tracking termination',
      'Thank-you message',
    ],
    junctions: [
      {
        id: 'jnc-1',
        name: 'City General Emergency Intersection',
        code: 'JNC-A',
        latitude: 12.9482,
        longitude: 77.6365,
        signals: [
          { id: 'sig-jnc-1-northbound', junctionId: 'jnc-1', signalCode: 'SIG-A-N', direction: 'NORTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: true },
          { id: 'sig-jnc-1-southbound', junctionId: 'jnc-1', signalCode: 'SIG-A-S', direction: 'SOUTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-eastbound', junctionId: 'jnc-1', signalCode: 'SIG-A-E', direction: 'GREEN', normalState: 'GREEN', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-westbound', junctionId: 'jnc-1', signalCode: 'SIG-A-W', direction: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
        ],
      },
    ],
  },
  INTERSECTION_CORRIDOR: {
    hospitalId: 'hosp-1',
    hospitalName: 'City General Hospital',
    address: 'Indiranagar, Bengaluru',
    latitude: 12.9592,
    longitude: 77.6445,
    scenarioCode: 'SMART_INTERSECTION',
    scenarioTitle: 'Smart Intersection Priority',
    scenarioDescription: 'Automated emergency priority through a four-way traffic intersection.',
    capabilities: [
      '1 km police early warning',
      'Distance-based coordination',
      'Four-way junction',
      'Emergency signal priority',
      'Automatic ambulance pass detection',
      'Automatic signal restoration',
      'Police tracking termination',
      'Thank-you message',
    ],
    junctions: [
      {
        id: 'jnc-1',
        name: 'City General Emergency Intersection',
        code: 'JNC-A',
        latitude: 12.9482,
        longitude: 77.6365,
        signals: [
          { id: 'sig-jnc-1-northbound', junctionId: 'jnc-1', signalCode: 'SIG-A-N', direction: 'NORTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: true },
          { id: 'sig-jnc-1-southbound', junctionId: 'jnc-1', signalCode: 'SIG-A-S', direction: 'SOUTHBOUND', state: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-eastbound', junctionId: 'jnc-1', signalCode: 'SIG-A-E', direction: 'GREEN', normalState: 'GREEN', isEmergencyRouteSignal: false },
          { id: 'sig-jnc-1-westbound', junctionId: 'jnc-1', signalCode: 'SIG-A-W', direction: 'RED', normalState: 'RED', isEmergencyRouteSignal: false },
        ],
      },
    ],
  },
  CONGESTION_REROUTE: {
    hospitalId: 'hosp-2',
    hospitalName: 'St. Martha Emergency Centre',
    address: 'Nrupatunga Road, Bengaluru',
    latitude: 12.9642,
    longitude: 77.5960,
    scenarioCode: 'CONGESTION_REROUTE',
    scenarioTitle: 'Intelligent Congestion Rerouting',
    scenarioDescription: 'Dynamic emergency rerouting when congestion or disruption makes the original route slower.',
    capabilities: [
      'Multiple route alternatives',
      'Congestion monitoring',
      'AI-assisted route evaluation',
      'Dynamic rerouting',
      'ETA recalculation',
      'Police corridor recalculation',
      'Hospital ETA update',
    ],
    junctions: [
      {
        id: 'jnc-201',
        name: 'Dairy Circle Signal',
        code: 'JNC-D',
        latitude: 12.9470,
        longitude: 77.6080,
        signals: createDirectionalSignals('jnc-201', 'M1', 'NORTHBOUND'),
      },
      {
        id: 'jnc-202',
        name: 'Richmond Circle Signal',
        code: 'JNC-R',
        latitude: 12.9550,
        longitude: 77.6000,
        signals: createDirectionalSignals('jnc-202', 'M2', 'NORTHBOUND'),
      },
    ],
  },
  COMPLEX_JUNCTION: {
    hospitalId: 'hosp-3',
    hospitalName: 'Central Medical Centre',
    address: 'MG Road, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    scenarioCode: 'COMPLEX_JUNCTION',
    scenarioTitle: 'Complex Junction Corridor',
    scenarioDescription: 'Major multi-direction intersection requiring precision signal priority timing.',
    junctions: [
      {
        id: 'jnc-301',
        name: 'Trinity Circle Junction',
        code: 'JNC-C1',
        latitude: 12.9725,
        longitude: 77.6140,
        signals: [
          { id: 'sig-301-n', junctionId: 'jnc-301', signalCode: 'SIG-C1-N', direction: 'NORTHBOUND', state: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-301-s', junctionId: 'jnc-301', signalCode: 'SIG-C1-S', direction: 'SOUTHBOUND', state: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-301-e', junctionId: 'jnc-301', signalCode: 'SIG-C1-E', direction: 'EASTBOUND', state: 'NORMAL', isEmergencyRouteSignal: true },
          { id: 'sig-301-w', junctionId: 'jnc-301', signalCode: 'SIG-C1-W', direction: 'WESTBOUND', state: 'RED', isEmergencyRouteSignal: false },
        ],
      },
      {
        id: 'jnc-302',
        name: 'Cauvery Emporium Junction',
        code: 'JNC-C2',
        latitude: 12.9720,
        longitude: 77.6040,
        signals: [
          { id: 'sig-302-n', junctionId: 'jnc-302', signalCode: 'SIG-C2-N', direction: 'NORTHBOUND', state: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-302-s', junctionId: 'jnc-302', signalCode: 'SIG-C2-S', direction: 'SOUTHBOUND', state: 'RED', isEmergencyRouteSignal: false },
          { id: 'sig-302-e', junctionId: 'jnc-302', signalCode: 'SIG-C2-E', direction: 'EASTBOUND', state: 'NORMAL', isEmergencyRouteSignal: true },
          { id: 'sig-302-w', junctionId: 'jnc-302', signalCode: 'SIG-C2-W', direction: 'WESTBOUND', state: 'RED', isEmergencyRouteSignal: false },
        ],
      },
    ],
  },
  ROAD_INCIDENT: {
    hospitalId: 'hosp-4',
    hospitalName: 'Lakeside Trauma Centre',
    address: 'Ulsoor Lake Corridor, Bengaluru',
    latitude: 12.9820,
    longitude: 77.6180,
    scenarioCode: 'ROAD_INCIDENT',
    scenarioTitle: 'Road Incident Corridor',
    scenarioDescription: 'Corridor with road incident requiring advance vehicle warning and route evaluation.',
    junctions: [
      {
        id: 'jnc-401',
        name: 'Kensington Road Intersection',
        code: 'JNC-L1',
        latitude: 12.9750,
        longitude: 77.6200,
        signals: createDirectionalSignals('jnc-401', 'L1', 'NORTHBOUND'),
      },
    ],
    incidents: [
      { id: 'inc-1', title: 'Vehicle Breakdown', latitude: 12.9780, longitude: 77.6190, severity: 'MODERATE' },
    ],
  },
  CAMERA_CORRIDOR: {
    hospitalId: 'hosp-5',
    hospitalName: 'Metro Emergency Hospital',
    address: 'Outer Ring Rd / Bellandur, Bengaluru',
    latitude: 12.9280,
    longitude: 77.6850,
    scenarioCode: 'CAMERA_CORRIDOR',
    scenarioTitle: 'Camera Monitored Corridor',
    scenarioDescription: 'Roadside AI camera points provide real-time lane obstruction and congestion intelligence.',
    junctions: [
      {
        id: 'jnc-501',
        name: 'Agara Junction',
        code: 'JNC-ORR1',
        latitude: 12.9240,
        longitude: 77.6500,
        signals: createDirectionalSignals('jnc-501', 'ORR1', 'EASTBOUND'),
      },
      {
        id: 'jnc-502',
        name: 'Iblur Junction',
        code: 'JNC-ORR2',
        latitude: 12.9255,
        longitude: 77.6680,
        signals: createDirectionalSignals('jnc-502', 'ORR2', 'EASTBOUND'),
      },
    ],
    cameras: [
      { id: 'cam-1', name: 'Camera Point 01 - Agara Flyover', latitude: 12.9245, longitude: 77.6530, status: 'CLEAR' },
      { id: 'cam-2', name: 'Camera Point 02 - Bellandur Intake', latitude: 12.9270, longitude: 77.6780, status: 'OBSTRUCTION_DETECTED' },
    ],
  },
};

const DEMO_HOSPITALS_LIST = Object.values(DEMO_SCENARIOS).map((s) => ({
  id: s.hospitalId,
  name: s.hospitalName,
  address: s.address,
  latitude: s.latitude,
  longitude: s.longitude,
  scenarioCode: s.scenarioCode,
  scenarioTitle: s.scenarioTitle,
  scenarioDescription: s.scenarioDescription,
  emergencyAvailable: true,
  isActive: true,
}));

function getScenarioByCode(scenarioCode) {
  return DEMO_SCENARIOS[scenarioCode] || DEMO_SCENARIOS.INTERSECTION_CORRIDOR;
}

function getScenarioByHospitalId(hospitalId) {
  for (const s of Object.values(DEMO_SCENARIOS)) {
    if (s.hospitalId === hospitalId) return s;
  }
  return DEMO_SCENARIOS.INTERSECTION_CORRIDOR;
}

function getAllDemoHospitals() {
  return DEMO_HOSPITALS_LIST;
}

module.exports = {
  DEMO_SCENARIOS,
  DEMO_HOSPITALS_LIST,
  getScenarioByCode,
  getScenarioByHospitalId,
  getAllDemoHospitals,
};
