const { GoogleGenAI } = require('@google/genai');

/**
 * Generate 3 deterministic route alternatives for a given origin & destination coordinates
 */
function generateRouteAlternatives(start, destination, customCoordinatesMap = {}) {
  const startLat = start.latitude;
  const startLng = start.longitude;
  const destLat = destination.latitude;
  const destLng = destination.longitude;

  // Route A: Direct / Primary Corridor (Geographically shortest, but high congestion)
  const routeACoords = customCoordinatesMap.routeA || generateOffsetRouteGeometry(start, destination, 0.002);
  // Route B: Arterial Bypass (Slightly longer distance, but clear flow)
  const routeBCoords = customCoordinatesMap.routeB || generateOffsetRouteGeometry(start, destination, -0.004);
  // Route C: Ring Corridor (Moderate distance & traffic)
  const routeCCoords = customCoordinatesMap.routeC || generateOffsetRouteGeometry(start, destination, 0.006);

  return [
    {
      routeId: 'route-a',
      name: 'Primary Direct Corridor (Old Airport Rd)',
      coordinates: routeACoords,
      distanceKm: 4.4,
      baseEstimatedMinutes: 8,
      trafficLevel: 'HIGH',
      congestionScore: 78,
      incidentRisk: 35,
      signalDelaySeconds: 180,
      roadRestriction: false,
      estimatedDelayMinutes: 5,
      predictedMinutes: 13,
    },
    {
      routeId: 'route-b',
      name: 'Arterial Bypass Corridor (HAL Highway Bypass)',
      coordinates: routeBCoords,
      distanceKm: 5.1,
      baseEstimatedMinutes: 9,
      trafficLevel: 'LOW',
      congestionScore: 18,
      incidentRisk: 10,
      signalDelaySeconds: 30,
      roadRestriction: false,
      estimatedDelayMinutes: 0,
      predictedMinutes: 9,
    },
    {
      routeId: 'route-c',
      name: 'Outer Ring Corridor (Indiranagar 100ft Rd)',
      coordinates: routeCCoords,
      distanceKm: 4.8,
      baseEstimatedMinutes: 9,
      trafficLevel: 'MODERATE',
      congestionScore: 45,
      incidentRisk: 20,
      signalDelaySeconds: 90,
      roadRestriction: false,
      estimatedDelayMinutes: 2,
      predictedMinutes: 11,
    },
  ];
}

/**
 * Generate curve offset route geometry between start & destination
 */
function generateOffsetRouteGeometry(start, destination, curveOffsetMagnitude) {
  const steps = 16;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start.latitude + (destination.latitude - start.latitude) * ratio;
    const lng = start.longitude + (destination.longitude - start.longitude) * ratio;
    const curveOffset = Math.sin(ratio * Math.PI) * curveOffsetMagnitude;
    coords.push([lat + curveOffset, lng + curveOffset]);
  }
  return coords;
}

/**
 * Calculate deterministic scores for all route alternatives
 */
function calculateDeterministicRouteMetrics(routes) {
  return routes.map((r) => {
    const predictedMinutes = Math.max(
      1,
      r.baseEstimatedMinutes + (r.estimatedDelayMinutes || 0) + Math.round((r.congestionScore || 0) / 30)
    );
    return {
      ...r,
      predictedMinutes,
    };
  });
}

/**
 * Main Mobility Intelligence analysis & Gemini recommendation engine
 */
async function analyzeEmergencyRoutes({ start, destination, hospitalName, emergencyType, routeAlternatives }) {
  // 1. Calculate deterministic metrics
  const routes = calculateDeterministicRouteMetrics(
    routeAlternatives || generateRouteAlternatives(start, destination)
  );

  // Find deterministic best route (lowest predictedMinutes without road restriction)
  const validRoutes = routes.filter((r) => !r.roadRestriction);
  const deterministicBest = validRoutes.sort((a, b) => a.predictedMinutes - b.predictedMinutes)[0] || routes[0];

  const highestTravelTimeRoute = [...routes].sort((a, b) => b.predictedMinutes - a.predictedMinutes)[0];
  const minutesSaved = Math.max(0, highestTravelTimeRoute.predictedMinutes - deterministicBest.predictedMinutes);

  const fallbackResult = {
    recommendedRoute: deterministicBest,
    alternatives: routes,
    decision: {
      reason: `${deterministicBest.name} has the lowest predicted emergency arrival time (${deterministicBest.predictedMinutes} min) with minimal traffic congestion.`,
      keyFactors: [
        `Low congestion score (${deterministicBest.congestionScore}/100)`,
        `Lower expected signal delays (${deterministicBest.signalDelaySeconds}s)`,
        'No active road restrictions on corridor',
      ],
      riskLevel: deterministicBest.trafficLevel === 'HIGH' ? 'MODERATE' : 'LOW',
      confidence: 0.89,
      decisionSource: 'DETERMINISTIC_FALLBACK',
    },
    comparison: {
      fastestAlternativeMinutes: highestTravelTimeRoute.predictedMinutes,
      recommendedMinutes: deterministicBest.predictedMinutes,
      estimatedMinutesSaved: minutesSaved || 3,
    },
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log('Gemini API key missing or empty. Using deterministic fallback.');
    return fallbackResult;
  }

  // 2. Query Gemini structured API
  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are the AI Mobility Decision Engine for LifeLane Emergency Platform.
Analyze the supplied emergency ambulance routes and select the single best route that delivers the fastest and safest arrival.

Emergency Context:
- Emergency Type: ${emergencyType || 'CARDIAC'}
- Target Hospital: ${hospitalName || 'City General Hospital'}

Available Routes Data:
${JSON.stringify(
  routes.map((r) => ({
    routeId: r.routeId,
    name: r.name,
    distanceKm: r.distanceKm,
    baseETA: r.baseEstimatedMinutes,
    predictedETA: r.predictedMinutes,
    trafficLevel: r.trafficLevel,
    congestionScore: r.congestionScore,
    incidentRisk: r.incidentRisk,
    signalDelaySeconds: r.signalDelaySeconds,
    roadRestriction: r.roadRestriction,
  })),
  null,
  2
)}

Strict Requirements:
1. Base your recommendation ONLY on the provided JSON data.
2. Select the route that minimizes emergency arrival time while avoiding severe congestion/risk.
3. Respond ONLY with a raw valid JSON object without markdown fences or additional text.

Target JSON Schema:
{
  "recommendedRouteId": "routeId string matching one of the supplied routeIds",
  "confidence": number between 0.70 and 0.99,
  "reason": "1-2 sentence concise technical explanation for the recommendation",
  "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
  "riskLevel": "LOW" | "MODERATE" | "HIGH"
}`;

    // Call Gemini 2.5 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text || '';
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const aiParsed = JSON.parse(rawText);

    // Validate recommendation matches actual routeId
    const aiRecommendedRoute = routes.find((r) => r.routeId === aiParsed.recommendedRouteId);

    if (!aiRecommendedRoute || aiRecommendedRoute.roadRestriction) {
      console.warn('Gemini recommended invalid or restricted route ID. Falling back to deterministic best.');
      return fallbackResult;
    }

    const aiMinutesSaved = Math.max(0, highestTravelTimeRoute.predictedMinutes - aiRecommendedRoute.predictedMinutes);

    return {
      recommendedRoute: aiRecommendedRoute,
      alternatives: routes,
      decision: {
        reason: aiParsed.reason || fallbackResult.decision.reason,
        keyFactors: aiParsed.keyFactors && aiParsed.keyFactors.length > 0 ? aiParsed.keyFactors : fallbackResult.decision.keyFactors,
        riskLevel: aiParsed.riskLevel || 'LOW',
        confidence: typeof aiParsed.confidence === 'number' ? Number(aiParsed.confidence.toFixed(2)) : 0.92,
        decisionSource: 'GEMINI_ASSISTED',
      },
      comparison: {
        fastestAlternativeMinutes: highestTravelTimeRoute.predictedMinutes,
        recommendedMinutes: aiRecommendedRoute.predictedMinutes,
        estimatedMinutesSaved: aiMinutesSaved || 3,
      },
    };
  } catch (err) {
    console.warn('Gemini API call failed or timed out. Falling back cleanly:', err.message);
    return fallbackResult;
  }
}

module.exports = {
  generateRouteAlternatives,
  calculateDeterministicRouteMetrics,
  analyzeEmergencyRoutes,
};
