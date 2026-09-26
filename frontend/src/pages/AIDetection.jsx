import React, { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { 
  Cpu, 
  Activity, 
  Video, 
  Camera, 
  Shield, 
  Radio, 
  Sparkles, 
  AlertTriangle, 
  Navigation, 
  Zap,
  Target
} from 'lucide-react';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import PlateTag from '../components/plates/PlateTag';
import MultiCameraGrid from '../components/camera/MultiCameraGrid';
import FeatureInfoButton from '../components/ui/FeatureInfoModal';

export default function AIDetection() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'intelligence' | 'interception'

  const [events, setEvents] = useState([
    {
      timestamp: new Date(Date.now() - 3000).toISOString(),
      camera_id: 'CAM-01',
      plate_number: 'LR09 FSL',
      vehicle_class: 'van',
      speed_kmh: 54
    },
    {
      timestamp: new Date(Date.now() - 8000).toISOString(),
      camera_id: 'CAM-02',
      plate_number: 'BD51 SMR',
      vehicle_class: 'hatchback',
      speed_kmh: 48
    },
    {
      timestamp: new Date(Date.now() - 14000).toISOString(),
      camera_id: 'CAM-03',
      plate_number: 'RE07 VLL',
      vehicle_class: 'truck',
      speed_kmh: 42
    },
    {
      timestamp: new Date(Date.now() - 20000).toISOString(),
      camera_id: 'CAM-04',
      plate_number: 'KP08 XTW',
      vehicle_class: 'sedan',
      speed_kmh: 64
    },
    {
      timestamp: new Date(Date.now() - 28000).toISOString(),
      camera_id: 'CAM-01',
      plate_number: 'SF59 BKO',
      vehicle_class: 'wagon',
      speed_kmh: 58
    }
  ]);

  const [stats, setStats] = useState({
    platesDetected: 146,
    vehiclesDetected: 194,
    activeFeeds: 4,
    anomaliesCaught: 12
  });

  // Handle incoming camera detection events
  const handleAiEvent = useCallback((data) => {
    setEvents(prev => {
      const newEvents = [data, ...prev].slice(0, 35);
      return newEvents;
    });

    setStats(prev => ({
      ...prev,
      platesDetected: data.plate_number ? prev.platesDetected + 1 : prev.platesDetected,
      vehiclesDetected: prev.vehiclesDetected + 1
    }));
  }, []);

  useEffect(() => {
    // Connect to Backend WebSocket
    let ws;
    try {
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
          const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
          const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          wsUrl = `${wsProtocol}//${host}/api/ai/ws/events`;
        } else {
          wsUrl = `ws://${window.location.hostname}:8000/api/ai/ws/events`;
        }
      }

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'INFERENCE_EVENT') {
            handleAiEvent(msg.data);
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };
    } catch (err) {
      console.warn("WebSocket connection skipped or not running", err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [handleAiEvent]);

  return (
    <PageWrapper
      title="Live AI Detection & Surveillance Grid"
      subtitle="Multi-channel ANPR inference pipeline with Bayesian consensus, forensic anomaly detection, and tactical pursuit"
      fullWidth={true}
      actions={
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-8 h-4 bg-[#2A2A2A] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#888888] peer-checked:after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#3E7BFA]"></div>
            </div>
            <span className="text-[11px] font-mono font-medium text-[#888888] group-hover:text-[#F0F0F0] transition-colors">
              Enable Cross-Camera ReID
            </span>
          </label>

          <div className="w-[1px] h-4 bg-[#2A2A2A]" />

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium bg-[#1A1A1A] text-[#22C55E] px-2.5 py-1 rounded border border-[#22C55E]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              AI ENGINE ONLINE
            </span>

            <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#CCCCCC] bg-[#1A1A1A] px-2.5 py-1 rounded border border-[#333333]">
              <Radio size={12} className="text-[#22C55E]" />
              4 FEEDS ACTIVE
            </span>
          </div>
        </div>
      }
    >
      <div className="w-full h-[calc(100vh-125px)] flex flex-col gap-2.5 p-3 overflow-hidden">
        
        {/* Main Content Area: Locked Height Flex Row */}
        <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
          
          {/* Left Column: Multi-Camera CCTV Grid + Quick Telemetry */}
          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {/* The 4-Camera Grid Container */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MultiCameraGrid onAiEvent={handleAiEvent} />
            </div>

            {/* Quick Metrics Ticker */}
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {[
                { label: "Vehicles Tracked", value: stats.vehiclesDetected, icon: Activity },
                { label: "Plates Recognized", value: stats.platesDetected, icon: Cpu },
                { label: "Anomalies Caught", value: `${stats.anomaliesCaught} Events`, icon: AlertTriangle },
                { label: "Inference Latency", value: "~18 ms", icon: Zap }
              ].map((stat, i) => (
                <div key={i} className="bg-[#141414] border border-[#222222] rounded p-2 flex items-center gap-2 shadow-sm">
                  <div className="p-1.5 rounded bg-[#1C1C1C] border border-[#2A2A2A] text-[#E0E0E0] shrink-0">
                    <stat.icon size={13} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[9px] text-[#777777] font-mono uppercase truncate">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold font-data text-[#F4F4F4] tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Tactical Intelligence & Event Stream (Strict Width & Locked Height) */}
          <div className="w-[360px] bg-[#141414] border border-[#242424] rounded flex flex-col shrink-0 overflow-hidden h-full min-h-0">
            
            {/* Tab Header */}
            <div className="p-1.5 bg-[#181818] border-b border-[#242424] shrink-0">
              <div className="flex items-center gap-1 bg-[#101010] p-0.5 rounded border border-[#2A2A2A] w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono transition-colors text-center truncate ${
                    activeTab === 'events' 
                      ? 'bg-[#252525] text-[#22C55E] font-semibold' 
                      : 'text-[#888888] hover:text-[#CCCCCC]'
                  }`}
                >
                  Live Reads
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('intelligence')}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono transition-colors text-center truncate ${
                    activeTab === 'intelligence' 
                      ? 'bg-[#252525] text-[#3E7BFA] font-semibold' 
                      : 'text-[#888888] hover:text-[#CCCCCC]'
                  }`}
                >
                  Anomalies
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('interception')}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono transition-colors text-center truncate ${
                    activeTab === 'interception' 
                      ? 'bg-[#252525] text-[#EF4444] font-semibold' 
                      : 'text-[#888888] hover:text-[#CCCCCC]'
                  }`}
                >
                  Interception
                </button>
              </div>
            </div>

            {/* TAB 1: Live ANPR Reads */}
            {activeTab === 'events' && (
              <div className="flex-1 overflow-y-auto p-0 min-h-0">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="py-2 text-[10px]">Time</TableHeader>
                      <TableHeader className="py-2 text-[10px]">Channel</TableHeader>
                      <TableHeader className="py-2 text-[10px]">Plate</TableHeader>
                      <TableHeader className="py-2 text-[10px]">Class</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((ev, i) => (
                      <TableRow key={i} className="hover:bg-[#1C1C1C] transition-colors h-[36px]">
                        <TableCell className="text-[10px] font-mono whitespace-nowrap text-[#888888] py-1.5">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-[#CCCCCC] py-1.5">
                          {ev.camera_id || 'CAM-01'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {ev.plate_number ? (
                            <PlateTag plate={ev.plate_number} size="sm" />
                          ) : (
                            <span className="text-[10px] text-[#606060] italic">No plate</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono uppercase text-[#AAAAAA] py-1.5">
                          {ev.vehicle_class}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* TAB 2: Forensic Anomalies */}
            {activeTab === 'intelligence' && (
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-0">
                
                {/* Impossible Travel Alert */}
                <div className="p-2.5 bg-[#1C1313] border border-[#EF4444]/40 rounded">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#EF4444]/20">
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#EF4444]">
                      <AlertTriangle size={12} />
                      CLONED PLATE ANOMALY
                    </span>
                    <FeatureInfoButton featureId="impossible_travel" label="Justification" size="sm" />
                  </div>
                  <div className="space-y-0.5 text-[10px] font-mono">
                    <p className="text-[#F0F0F0] font-semibold">Plate: LR09 FSL (Duplicate Sighting)</p>
                    <p className="text-[#888888]">Spotted at CAM-01 and CAM-46 within 120s.</p>
                    <div className="mt-1 p-1 bg-black/60 rounded text-[9px] text-[#EF4444] border border-[#EF4444]/20">
                      Calculated Speed: 270 km/h (Physically Impossible in City Traffic)
                    </div>
                  </div>
                </div>

                {/* Attribute Mismatch Alert */}
                <div className="p-2.5 bg-[#1D1710] border border-[#F59E0B]/40 rounded">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#F59E0B]/20">
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#F59E0B]">
                      <Shield size={12} />
                      ATTRIBUTE MISMATCH
                    </span>
                    <FeatureInfoButton featureId="attribute_mismatch" label="Justification" size="sm" />
                  </div>
                  <div className="space-y-0.5 text-[10px] font-mono">
                    <p className="text-[#F0F0F0] font-semibold">Plate: RE07 VLL (Stolen Plate Swap)</p>
                    <div className="grid grid-cols-2 gap-1.5 mt-1 p-1 bg-black/60 rounded text-[9px]">
                      <div>
                        <span className="text-[#888888]">AI Vision:</span>
                        <p className="text-[#F59E0B] font-bold">RED HEAVY TRUCK</p>
                      </div>
                      <div>
                        <span className="text-[#888888]">RTO Registry:</span>
                        <p className="text-[#22C55E] font-bold">SILVER FORD MONDEO</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Violation Safety Alert */}
                <div className="p-2.5 bg-[#131B16] border border-[#22C55E]/40 rounded">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#22C55E]/20">
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#22C55E]">
                      <Activity size={12} />
                      BEHAVIORAL VIOLATION
                    </span>
                    <FeatureInfoButton featureId="multi_violation" label="Justification" size="sm" />
                  </div>
                  <div className="space-y-0.5 text-[10px] font-mono">
                    <p className="text-[#F0F0F0] font-semibold">Camera: CAM-02 (Boulevard Rd)</p>
                    <p className="text-[#AAAAAA]">Transit Van: Dangerous Tailgating (&lt;0.35s headway) + Lane Straddle</p>
                    <span className="inline-block mt-1 text-[9px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded border border-[#22C55E]/20">
                      e-Challan Evidentiary Packet Auto-Queued
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: Predictive Interception Matrix */}
            {activeTab === 'interception' && (
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 font-mono min-h-0">
                <div className="flex items-center justify-between pb-1 border-b border-[#2A2A2A]">
                  <span className="text-[11px] font-bold text-[#F0F0F0] flex items-center gap-1">
                    <Target size={12} className="text-[#EF4444]" />
                    TACTICAL PURSUIT
                  </span>
                  <FeatureInfoButton featureId="predictive_interception" label="Justification" size="sm" />
                </div>

                <div className="p-2 bg-[#181818] border border-[#2A2A2A] rounded space-y-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#888888]">Target Vehicle:</span>
                    <span className="text-[#EF4444] font-bold">LR09 FSL (Flagged BOLO)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#888888]">Current Trajectory:</span>
                    <span className="text-[#F0F0F0]">East on Jan Marg Corridor @ 54 km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#888888]">Last Sighted:</span>
                    <span className="text-[#22C55E]">CAM-01 (Jan Marg / Capitol)</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <p className="text-[9px] font-bold text-[#888888] uppercase">
                    Downstream Checkpoint ETAs:
                  </p>

                  <div className="p-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded flex items-center justify-between">
                    <div>
                      <p className="text-[#F0F0F0] font-semibold">CAM-08 (Sector 8 Junction)</p>
                      <p className="text-[8px] text-[#777777]">Distance: 1.4 km ahead</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded border border-[#F59E0B]/30">
                      ETA: 1m 24s
                    </span>
                  </div>

                  <div className="p-2 bg-[#201515] border border-[#EF4444]/40 rounded flex items-center justify-between">
                    <div>
                      <p className="text-[#F0F0F0] font-semibold">CAM-27 (Transport Chowk)</p>
                      <p className="text-[8px] text-[#777777]">Recommended Barricade Point</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/15 px-1.5 py-0.5 rounded border border-[#EF4444]/30">
                      ETA: 3m 10s
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-[#151C24] border border-[#3E7BFA]/40 rounded text-[10px] space-y-1">
                  <div className="flex items-center gap-1 text-[#3E7BFA] font-bold">
                    <Navigation size={12} />
                    <span>Automated Dispatch:</span>
                  </div>
                  <p className="text-[9px] text-[#CCCCCC]">
                    Interceptor PCR Unit #04 dispatched to seal exit slip road before Transport Chowk.
                  </p>
                </div>
              </div>
            )}

            {/* Fixed Footer */}
            <div className="p-2 bg-[#161616] border-t border-[#222222] flex items-center justify-between text-[9px] font-mono text-[#666666] shrink-0">
              <span>BUFFER: {events.length}/35 READS</span>
              <span className="text-[#22C55E]">AUTO-COMMITTED</span>
            </div>

          </div>

        </div>

        {/* Bottom Innovations & Model Justifications Ribbon */}
        <div className="bg-[#141414] border border-[#242424] rounded px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#3E7BFA]" />
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#F0F0F0] uppercase">
              SIH 2026 Core Innovations &amp; Justifications:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">Cloned Plate Buster</span>
              <FeatureInfoButton featureId="impossible_travel" label="Why?" size="sm" />
            </div>

            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">Attribute Mismatch</span>
              <FeatureInfoButton featureId="attribute_mismatch" label="Why?" size="sm" />
            </div>

            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">Bayesian Voting (98.4%)</span>
              <FeatureInfoButton featureId="temporal_consensus" label="Why?" size="sm" />
            </div>

            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">Multi-Violation Suite</span>
              <FeatureInfoButton featureId="multi_violation" label="Why?" size="sm" />
            </div>

            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">Predictive Interception</span>
              <FeatureInfoButton featureId="predictive_interception" label="Why?" size="sm" />
            </div>

            <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
              <span className="text-[10px] font-mono text-[#CCCCCC]">HSRP EV Classifier</span>
              <FeatureInfoButton featureId="hsrp_classifier" label="Why?" size="sm" />
            </div>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
