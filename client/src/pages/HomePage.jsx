import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Activity,
  Radio,
  Clock,
  ArrowRight,
  Menu,
  X,
  MapPin,
  CheckCircle2,
  Navigation,
  Layers,
  Zap,
  Building2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#182230] font-sans flex flex-col">
      {/* 1. PUBLIC NAVBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-[#172033]">
            <div className="w-8 h-8 bg-[#172033] text-white rounded-[8px] flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#182230] leading-none">
                LifeLane
              </span>
              <span className="text-[10px] font-medium text-[#667085] tracking-wider uppercase leading-none mt-1">
                Emergency Network
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#platform" className="text-xs font-medium text-[#667085] hover:text-[#182230] transition-colors">
              Platform
            </a>
            <a href="#how-it-works" className="text-xs font-medium text-[#667085] hover:text-[#182230] transition-colors">
              How it works
            </a>
            <a href="#network" className="text-xs font-medium text-[#667085] hover:text-[#182230] transition-colors">
              Emergency Network
            </a>
            <a href="#intelligence" className="text-xs font-medium text-[#667085] hover:text-[#182230] transition-colors">
              Intelligence
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-3.5 py-2 text-xs font-semibold text-[#182230] hover:text-[#172033] transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              Access LifeLane
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#667085] hover:text-[#182230] rounded-[6px]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E4E7EC] px-4 py-4 space-y-3">
            <a
              href="#platform"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[#182230] py-1.5"
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[#182230] py-1.5"
            >
              How it works
            </a>
            <a
              href="#network"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[#182230] py-1.5"
            >
              Emergency Network
            </a>
            <a
              href="#intelligence"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[#182230] py-1.5"
            >
              Intelligence
            </a>
            <div className="pt-3 border-t border-[#E4E7EC] space-y-2">
              <Link
                to="/login"
                className="block w-full text-center py-2 bg-[#F6F7F9] text-[#182230] text-xs font-semibold rounded-[8px]"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="block w-full text-center py-2.5 bg-[#172033] text-white text-xs font-semibold rounded-[8px]"
              >
                Access LifeLane
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="bg-white border-b border-[#E4E7EC] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[6px] text-xs font-semibold text-[#172033]">
                <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse" />
                LIFELANE &bull; Emergency Mobility Network
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182230] tracking-tight leading-tight">
                Every second on the road matters.
              </h1>

              <p className="text-sm sm:text-base text-[#667085] leading-relaxed max-w-xl">
                LifeLane coordinates emergency vehicles, traffic operations, signal priority, hospitals and mobility intelligence through one real-time response network.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-[#172033] hover:bg-[#0F172A] text-white text-xs sm:text-sm font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  Access LifeLane
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="px-6 py-3 bg-white hover:bg-[#F6F7F9] text-[#182230] border border-[#E4E7EC] text-xs sm:text-sm font-semibold rounded-[8px] transition-colors flex items-center justify-center"
                >
                  See how it works
                </a>
              </div>

              {/* Status metrics bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E4E7EC]">
                <div>
                  <div className="text-xl font-extrabold text-[#182230]">60-90s</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Response Corridor</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-[#16794A]">100%</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Signal Priority</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-[#175CD3]">Real-time</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Hospital Sync</div>
                </div>
              </div>
            </div>

            {/* Right Operations Visual (HTML/CSS Operational Corridor) */}
            <div className="lg:col-span-6">
              <div className="bg-[#F6F7F9] border border-[#E4E7EC] rounded-[12px] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC]">
                  <div className="text-xs font-semibold text-[#182230] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#175CD3]" />
                    Emergency Corridor Live Network
                  </div>
                  <span className="text-[10px] font-bold text-[#16794A] bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.5 rounded-[4px]">
                    CORRIDOR ACTIVE
                  </span>
                </div>

                {/* Corridor Flow Graphic */}
                <div className="space-y-3">
                  {/* Node 1: Ambulance */}
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded-[8px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[6px] flex items-center justify-center font-bold text-xs">
                        AMB
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#182230]">AMB-1042 En Route</div>
                        <div className="text-[11px] text-[#667085]">Koramangala 5th Block &rarr; City General</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#175CD3] font-mono">06:24 ETA</span>
                  </div>

                  {/* Connecting Line */}
                  <div className="flex justify-center my-1">
                    <div className="w-0.5 h-4 bg-[#172033]/20" />
                  </div>

                  {/* Node 2: Traffic Operations & Signals */}
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded-[8px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] rounded-[6px] flex items-center justify-center font-bold text-xs">
                        JNC
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#182230]">Junction 02 (Dairy Circle)</div>
                        <div className="text-[11px] text-[#B54708] font-medium">Emergency Signal Priority Active</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#16794A] bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.5 rounded-[4px]">
                      GREEN WAVE
                    </span>
                  </div>

                  {/* Connecting Line */}
                  <div className="flex justify-center my-1">
                    <div className="w-0.5 h-4 bg-[#172033]/20" />
                  </div>

                  {/* Node 3: Hospital Intake */}
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded-[8px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#F0FDF4] border border-[#DCFCE7] text-[#16794A] rounded-[6px] flex items-center justify-center font-bold text-xs">
                        HSP
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#182230]">City General Hospital</div>
                        <div className="text-[11px] text-[#667085]">Emergency Intake Ready &bull; Cardiac</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#16794A] font-mono">3.8 km</span>
                  </div>
                </div>

                <div className="pt-2 text-center text-[11px] text-[#667085]">
                  Automated signal clearance &bull; Synchronized response network
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION (THE CHALLENGE) */}
      <section id="platform" className="py-16 bg-[#F6F7F9] border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-[#175CD3] uppercase tracking-wider block mb-1">
              THE CHALLENGE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182230] tracking-tight">
              Emergency vehicles lose critical time before reaching care.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Challenge 1 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] shadow-xs space-y-3">
              <div className="w-10 h-10 bg-[#FEF3F2] border border-[#FECDCA] text-[#C62828] rounded-[8px] flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#182230]">Traffic Congestion</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Emergency vehicles can become trapped in traffic when surrounding road users receive no advance warning or clear signal clearance.
              </p>
            </div>

            {/* Challenge 2 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] shadow-xs space-y-3">
              <div className="w-10 h-10 bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] rounded-[8px] flex items-center justify-center font-bold">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#182230]">Disconnected Coordination</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Ambulance drivers, traffic officers, signals and hospitals often operate through separate, un-synchronized communication channels.
              </p>
            </div>

            {/* Challenge 3 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] shadow-xs space-y-3">
              <div className="w-10 h-10 bg-[#EFF8FF] border border-[#B2DDFF] text-[#175CD3] rounded-[8px] flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#182230]">Static Routing</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                The shortest geographical route is not always the fastest route when congestion, incidents and intersection delays change dynamically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW LIFELANE WORKS */}
      <section id="how-it-works" className="py-16 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-[#16794A] uppercase tracking-wider block mb-1">
              COORDINATED WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182230] tracking-tight">
              How LifeLane Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[10px] space-y-3">
              <div className="text-xl font-extrabold text-[#172033] font-mono">01</div>
              <h3 className="text-sm font-bold text-[#182230]">Emergency journey begins</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Ambulance driver selects destination hospital and initiates emergency journey protocol.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[10px] space-y-3">
              <div className="text-xl font-extrabold text-[#175CD3] font-mono">02</div>
              <h3 className="text-sm font-bold text-[#182230]">Mobility intelligence evaluates route</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                System analyzes congestion, intersection delays, and route alternatives to recommend the optimal path.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[10px] space-y-3">
              <div className="text-xl font-extrabold text-[#B54708] font-mono">03</div>
              <h3 className="text-sm font-bold text-[#182230]">Traffic operations coordinate corridor</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Automated signal priority and traffic officer alerts clear intersections ahead of vehicle arrival.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[10px] space-y-3">
              <div className="text-xl font-extrabold text-[#16794A] font-mono">04</div>
              <h3 className="text-sm font-bold text-[#182230]">Hospital receives live arrival info</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Intake center tracks real-time ETA, distance, and emergency type to prepare medical teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NETWORK SECTION */}
      <section id="network" className="py-16 bg-[#F6F7F9] border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-[#172033] uppercase tracking-wider block mb-1">
              INTEGRATED INFRASTRUCTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182230] tracking-tight">
              One coordinated emergency network.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Area 1 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] space-y-3">
              <div className="w-9 h-9 bg-[#F6F7F9] border border-[#E4E7EC] text-[#172033] rounded-[6px] flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h3 className="text-sm font-bold text-[#182230]">Emergency Vehicles</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Live GPS position streaming, OSRM routing, real-time ETA countdown, and turn-by-turn guidance for ambulance operators.
              </p>
            </div>

            {/* Area 2 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] space-y-3">
              <div className="w-9 h-9 bg-[#F6F7F9] border border-[#E4E7EC] text-[#172033] rounded-[6px] flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h3 className="text-sm font-bold text-[#182230]">Traffic Operations</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Real-time corridor monitoring, 1km/500m proximity alerts, officer tracking access, and automated junction clearance.
              </p>
            </div>

            {/* Area 3 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] space-y-3">
              <div className="w-9 h-9 bg-[#F6F7F9] border border-[#E4E7EC] text-[#172033] rounded-[6px] flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h3 className="text-sm font-bold text-[#182230]">Signal Priority</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Dynamic traffic signal control, transitioning from normal operation to emergency priority to clear intersection gridlock.
              </p>
            </div>

            {/* Area 4 */}
            <div className="p-6 bg-white border border-[#E4E7EC] rounded-[12px] space-y-3">
              <div className="w-9 h-9 bg-[#F6F7F9] border border-[#E4E7EC] text-[#172033] rounded-[6px] flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h3 className="text-sm font-bold text-[#182230]">Emergency Intake</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Clinical dashboard providing live incoming ambulance tracking, ETA updates, and pre-arrival intake preparation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTELLIGENCE SECTION */}
      <section id="intelligence" className="py-16 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold text-[#175CD3] uppercase tracking-wider block">
                MOBILITY INTELLIGENCE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#182230] tracking-tight">
                Decisions based on the road ahead.
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                LifeLane evaluates route conditions, predicted delays and disruptions to support faster emergency routing while automatically recalculating coordination when conditions change.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[#175CD3] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#182230]">Predictive Route Scoring</div>
                    <div className="text-[11px] text-[#667085] leading-relaxed mt-0.5">
                      Evaluates travel time based on congestion scores, signal delays, and road restrictions rather than static geographical distance.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#16794A] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#182230]">Automated Corridor Rerouting</div>
                    <div className="text-[11px] text-[#667085] leading-relaxed mt-0.5">
                      Detects sudden traffic disruptions on active corridors and recalculates signal priority dynamically from the vehicle's current position.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="lg:col-span-6">
              <div className="p-6 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[12px] space-y-4">
                <div className="text-xs font-bold text-[#182230] uppercase tracking-wider">
                  Route Evaluation Metric Comparison
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded-[8px] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#182230]">Route A (Direct Corridor)</div>
                      <div className="text-[11px] text-[#667085]">4.4 km &bull; High Congestion (78/100)</div>
                    </div>
                    <span className="font-bold text-[#C62828] font-mono">13 min ETA</span>
                  </div>

                  <div className="p-3 bg-white border border-[#16794A] rounded-[8px] flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <div className="font-semibold text-[#182230] flex items-center gap-1.5">
                        Route B (Arterial Bypass)
                        <span className="text-[10px] font-bold text-[#16794A] bg-[#F0FDF4] border border-[#DCFCE7] px-1.5 py-0.5 rounded-[4px]">
                          RECOMMENDED
                        </span>
                      </div>
                      <div className="text-[11px] text-[#667085]">5.1 km &bull; Low Congestion (18/100)</div>
                    </div>
                    <span className="font-bold text-[#16794A] font-mono">9 min ETA</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#667085] leading-relaxed p-2.5 bg-white border border-[#E4E7EC] rounded-[6px]">
                  <strong>Key Finding:</strong> Route A is geographically shorter by 0.7 km, but Route B reaches the intake facility 4 minutes faster.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DEMO DISCLAIMER */}
      <section className="py-8 bg-[#F6F7F9] border-b border-[#E4E7EC] text-center">
        <div className="max-w-4xl mx-auto px-4 text-xs text-[#667085] leading-relaxed">
          &ldquo;LifeLane is currently demonstrated as a prototype environment. Traffic signal and infrastructure integrations represent authorized production integration capabilities.&rdquo;
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#172033] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Shield className="w-5 h-5 text-white" />
              <span className="font-bold text-base tracking-tight">LifeLane</span>
            </div>
            <p className="text-xs text-[#94A3B8]">Emergency Mobility Network</p>
            <p className="text-[11px] text-[#64748B] pt-1">
              Prototype developed for the AI for Smart Mobility challenge.
            </p>
          </div>

          <div>
            <Link
              to="/login"
              className="px-5 py-2.5 bg-white text-[#172033] hover:bg-[#F6F7F9] text-xs font-semibold rounded-[8px] transition-colors inline-flex items-center gap-1.5"
            >
              Access LifeLane
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
