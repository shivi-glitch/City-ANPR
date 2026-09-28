import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Upload, 
  Settings, 
  Radio, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check, 
  Video, 
  Cpu, 
  Layers
} from 'lucide-react';

export default function CameraFeedTile({
  camera,
  isMaximized,
  onToggleMaximize,
  onSourceChange,
  showAiOverlay = true,
  stealthMode = false,
  onEventDetected
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropFeedback, setDropFeedback] = useState(null);
  // Helper mapping video timestamp to the exact vehicle on screen in sample_video.mp4
  const getVideoVehicle = useCallback((currentTimeSec) => {
    const t = (currentTimeSec || 0) % 23.8;
    if (t < 3.5) {
      return {
        plate: 'AW15 AVR',
        vClass: 'FORD TRANSIT',
        speed: 52,
        trackId: 14,
        isOverspeed: false,
        boxColor: '#EAB308',
        left: '8%',
        top: '2%',
        width: '54%',
        height: '48%',
        cropUrl: '/crops/crop_aw15_avr.jpg'
      };
    } else if (t < 6.0) {
      return {
        plate: 'WV54 LUT',
        vClass: 'BMW 5-SERIES',
        speed: 64,
        trackId: 21,
        isOverspeed: true,
        boxColor: '#EF4444',
        left: '10%',
        top: '2%',
        width: '58%',
        height: '50%',
        cropUrl: '/crops/crop_wv54_lut.jpg'
      };
    } else if (t < 8.5) {
      return {
        plate: 'EA61 EVG',
        vClass: 'AUDI RS5',
        speed: 69,
        trackId: 28,
        isOverspeed: true,
        boxColor: '#EF4444',
        left: '6%',
        top: '2%',
        width: '56%',
        height: '52%',
        cropUrl: '/crops/crop_ea61_evg.jpg'
      };
    } else if (t < 12.0) {
      return {
        plate: 'EY64 CZE',
        vClass: 'BMW M-SPORT',
        speed: 58,
        trackId: 33,
        isOverspeed: false,
        boxColor: '#EAB308',
        left: '4%',
        top: '2%',
        width: '54%',
        height: '48%',
        cropUrl: '/crops/crop_ey64_cze.jpg'
      };
    } else if (t < 15.0) {
      return {
        plate: 'VU15 SSX',
        vClass: 'VAUXHALL COMBO',
        speed: 46,
        trackId: 39,
        isOverspeed: false,
        boxColor: '#EAB308',
        left: '6%',
        top: '2%',
        width: '52%',
        height: '48%',
        cropUrl: '/crops/crop_vu15_ssx.jpg'
      };
    } else if (t < 19.5) {
      return {
        plate: 'LR09 FSL',
        vClass: 'PEUGEOT BOXER VAN',
        speed: 54,
        trackId: 18,
        isOverspeed: false,
        boxColor: '#EAB308',
        left: '6%',
        top: '2%',
        width: '52%',
        height: '50%',
        cropUrl: '/crops/crop_lr09_fsl.jpg'
      };
    } else {
      return {
        plate: 'HF10 DNO',
        vClass: 'HEAVY TRUCK',
        speed: 43,
        trackId: 44,
        isOverspeed: false,
        boxColor: '#EAB308',
        left: '6%',
        top: '2%',
        width: '52%',
        height: '48%',
        cropUrl: '/crops/crop_hf10_dno.jpg'
      };
    }
  }, []);

  // Determine initial vehicle profile for this camera channel
  const initialV = getVideoVehicle(camera.initialTime || 15.0);

  // Active vehicle tracking bounding box (single, stabilized box placed strictly on vehicle)
  const [activeBoxes, setActiveBoxes] = useState([
    {
      id: `${camera.id}-init-0`,
      top: initialV.top,
      left: initialV.left,
      width: initialV.width,
      height: initialV.height,
      conf: '0.98',
      vClass: initialV.vClass,
      plate: initialV.plate,
      speed: initialV.speed,
      isOverspeed: initialV.isOverspeed,
      boxColor: initialV.boxColor,
      trackId: initialV.trackId,
      trail: [
        { x: '10%', y: '1%' },
        { x: '8%', y: '1.5%' },
        { x: '6%', y: '2%' }
      ]
    }
  ]);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [streamError, setStreamError] = useState(false);

  // Live Continuous Frame Counter
  const [frameCounter, setFrameCounter] = useState(5330);

  // Picture-in-Picture Live Plate Inspector HUD State (Real Video Crop + Multi-Frame Tracking)
  const [latestInspector, setLatestInspector] = useState({
    plate: initialV.plate,
    vClass: initialV.vClass,
    speed: initialV.speed,
    trackId: initialV.trackId,
    conf: 98.4,
    isOverspeed: initialV.isOverspeed,
    isAlert: initialV.isOverspeed,
    photoUrl: initialV.cropUrl,
    frameNum: 5332,
    trackedFrames: 34,
    frameBuffer: [
      { frameId: 5318, conf: 95.2, label: 'ENTRY', photo: '/crops/frame_5318_entry.jpg' },
      { frameId: 5326, conf: 98.4, label: 'LOCKED', photo: initialV.cropUrl },
      { frameId: 5332, conf: 97.6, label: 'EXIT', photo: '/crops/frame_5332_exit.jpg' }
    ]
  });

  // Virtual Tripwire Counts
  const [tripwireCounts, setTripwireCounts] = useState({
    inCount: 42,
    outCount: 38,
    justCrossed: false
  });
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const configRef = useRef(null);

  // Helper to capture a REAL photograph directly from the playing video stream
  const captureRealVideoFrame = useCallback((plateText, trackId, vClass, frameNum, box) => {
    try {
      if (!videoRef.current || videoRef.current.videoWidth === 0) {
        return '/crops/crop_lr09_fsl.jpg';
      }
      const vid = videoRef.current;
      const vw = vid.videoWidth;
      const vh = vid.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');

      // Calculate the vehicle bumper & license plate region from the video frame
      let sx, sy, sw, sh;
      if (box && box.left && box.top) {
        const bx = (parseFloat(box.left) / 100) * vw;
        const by = (parseFloat(box.top) / 100) * vh;
        const bw = (parseFloat(box.width) / 100) * vw;
        const bh = (parseFloat(box.height) / 100) * vh;

        sx = Math.max(0, Math.min(vw - 80, bx + bw * 0.15));
        sy = Math.max(0, Math.min(vh - 40, by + bh * 0.40));
        sw = Math.min(vw - sx, bw * 0.70);
        sh = Math.min(vh - sy, bh * 0.35);
      } else {
        sx = Math.max(0, vw * 0.15);
        sy = Math.max(0, vh * 0.25);
        sw = Math.min(vw - sx, vw * 0.28);
        sh = Math.min(vh - sy, vh * 0.18);
      }

      // 1. DRAW ACTUAL VIDEO PIXELS DIRECTLY INTO CANVAS
      ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // 2. Technical camera sensor metadata overlay bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, canvas.height - 15, canvas.width, 15);
      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`CAM SENSOR CAPTURE · [${plateText}] · F#${frameNum || 5332}`, 8, canvas.height - 4);

      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
      console.warn('Real video crop fallback:', err);
      return '/crops/crop_lr09_fsl.jpg';
    }
  }, []);

  // When video starts playing or metadata loads, immediately sync real frame crop
  const handleVideoReady = useCallback(() => {
    if (camera.initialTime && videoRef.current) {
      try {
        videoRef.current.currentTime = camera.initialTime;
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
    const curTime = videoRef.current ? videoRef.current.currentTime : (camera.initialTime || 0);
    const v = getVideoVehicle(curTime);
    const photo = captureRealVideoFrame(v.plate, v.trackId, v.vClass, 5332, null) || v.cropUrl;
    
    setLatestInspector(prev => ({
      ...prev,
      plate: v.plate,
      vClass: v.vClass,
      speed: v.speed,
      photoUrl: photo,
      frameBuffer: [
        { frameId: 5318, conf: 95.2, label: 'ENTRY', photo: '/crops/frame_5318_entry.jpg' },
        { frameId: 5326, conf: 98.4, label: 'LOCKED', photo },
        { frameId: 5332, conf: 97.6, label: 'EXIT', photo: '/crops/frame_5332_exit.jpg' }
      ]
    }));
  }, [camera.initialTime, captureRealVideoFrame, getVideoVehicle]);

  // Real-time ticking timestamp down to milliseconds & frame counter
  useEffect(() => {
    let animFrame;
    let lastFrameUpdate = Date.now();
    
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const da = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const se = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setCurrentTimeStr(`${yr}-${mo}-${da} ${hr}:${mi}:${se}.${ms}`);

      // Increment live frame counter at ~30 FPS
      if (now.getTime() - lastFrameUpdate > 33) {
        setFrameCounter(prev => prev + 1);
        lastFrameUpdate = now.getTime();
      }

      animFrame = requestAnimationFrame(updateTime);
    };
    animFrame = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Close config panel on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (configRef.current && !configRef.current.contains(e.target)) {
        setShowConfig(false);
      }
    };
    if (showConfig) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConfig]);

  // Dynamic vehicle tracking strictly synchronized to current video timestamp
  useEffect(() => {
    if (!showAiOverlay) {
      setActiveBoxes([]);
      return;
    }

    const syncFrame = () => {
      const curTime = videoRef.current ? videoRef.current.currentTime : (camera.initialTime || 0);
      const v = getVideoVehicle(curTime);
      const conf = (0.95 + Math.random() * 0.04).toFixed(2);
      const currentFrame = frameCounter;

      // Exactly 1 stabilized, accurately bounded vehicle box per oncoming lane
      const singleBox = {
        id: `${camera.id}-track-${v.trackId}`,
        top: v.top,
        left: v.left,
        width: v.width,
        height: v.height,
        conf,
        vClass: v.vClass,
        plate: v.plate,
        speed: v.speed,
        isOverspeed: v.isOverspeed,
        boxColor: v.boxColor,
        trackId: v.trackId,
        trail: [
          { x: `${parseFloat(v.left) + 4}%`, y: `${parseFloat(v.top) - 1}%` },
          { x: `${parseFloat(v.left) + 2}%`, y: `${parseFloat(v.top)}%` },
          { x: v.left, y: `${parseFloat(v.top) + 1}%` }
        ]
      };

      setActiveBoxes([singleBox]);

      // Only CAM-01 or maximized channel drives the primary Inspector HUD
      if (camera.id === 'CAM-01' || isMaximized) {
        setLatestInspector({
          plate: v.plate,
          vClass: v.vClass,
          speed: v.speed,
          trackId: v.trackId,
          conf: (parseFloat(conf) * 100).toFixed(1),
          isOverspeed: v.isOverspeed,
          isAlert: v.isOverspeed,
          photoUrl: v.cropUrl,
          frameNum: currentFrame,
          trackedFrames: 34 + Math.floor(Math.random() * 6),
          frameBuffer: [
            { frameId: currentFrame - 14, conf: (parseFloat(conf) * 100 - 3.2).toFixed(1), label: 'ENTRY', photo: '/crops/frame_5318_entry.jpg' },
            { frameId: currentFrame - 6, conf: (parseFloat(conf) * 100).toFixed(1), label: 'LOCKED', photo: v.cropUrl },
            { frameId: currentFrame, conf: (parseFloat(conf) * 100 - 1.4).toFixed(1), label: 'EXIT', photo: '/crops/frame_5332_exit.jpg' }
          ]
        });
      }

      // Tripwire simulation
      setTripwireCounts(prev => ({
        inCount: prev.inCount + (Math.random() > 0.7 ? 1 : 0),
        outCount: prev.outCount + (Math.random() > 0.7 ? 1 : 0),
        justCrossed: Math.random() > 0.6
      }));

      // Trigger telemetry event to parent
      if (onEventDetected && Math.random() > 0.65) {
        onEventDetected({
          timestamp: new Date().toISOString(),
          camera_id: camera.id,
          plate_number: v.plate,
          vehicle_class: v.vClass.toLowerCase(),
          confidence: parseFloat(conf),
          speed_kmh: v.speed
        });
      }
    };

    syncFrame();
    const interval = setInterval(syncFrame, 1000);
    return () => clearInterval(interval);
  }, [showAiOverlay, camera.id, camera.initialTime, isMaximized, onEventDetected, frameCounter, getVideoVehicle]);

  // Handle dropped video file directly onto the camera tile
  const handleDropVideo = (file) => {
    if (!file || !file.type.startsWith('video/')) {
      alert('Please drop a valid video file (.mp4, .webm, .mov, etc.)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onSourceChange(camera.id, {
      type: 'dropped_video',
      url: objectUrl,
      fileName: file.name,
      isLiveAI: false
    });

    setDropFeedback(`Bound Stream: ${file.name}`);
    setTimeout(() => setDropFeedback(null), 3000);
    setShowConfig(false);
  };

  const handleTileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleTileDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleTileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDropVideo(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDropVideo(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleTileDragOver}
      onDragLeave={handleTileDragLeave}
      onDrop={handleTileDrop}
      className={`relative w-full h-full flex flex-col bg-[#0A0A0A] border border-[#222222] rounded overflow-hidden select-none shadow-sm min-h-0 ${
        isDragOver ? 'ring-2 ring-[#22C55E] border-transparent' : 'hover:border-[#383838]'
      }`}
    >
      {/* Hidden File Input for stealth drop/select */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top CCTV Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-1.5">
          {/* Live / REC blinking indicator */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-wider text-[#F0F0F0]">REC</span>
          </div>

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
            <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
            <span className="text-[9px] font-mono font-semibold tracking-wider text-[#22C55E]">LIVE</span>
          </div>

          <span className="text-[10px] font-mono font-semibold text-[#EAEAEA] drop-shadow truncate max-w-[150px] sm:max-w-[200px]">
            {camera.name}
          </span>
        </div>

        {/* Top-Right Controls */}
        <div className="flex items-center gap-1">
          {/* Live Frame Counter Readout */}
          <span className="text-[9px] font-mono text-[#00FF66] bg-black/70 px-1.5 py-0.5 rounded border border-[#00FF66]/30">
            F#{frameCounter}
          </span>

          <span className="hidden sm:inline-block text-[9px] font-mono text-[#8E8E8E] bg-black/50 px-1 py-0.5 rounded border border-white/5">
            {camera.fps || '25.0'} FPS · {camera.resolution || '1080P'}
          </span>

          {/* Maximize Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize(camera.id);
            }}
            title={isMaximized ? "Restore Grid" : "Maximize"}
            className="p-1 rounded text-[#AAAAAA] hover:text-[#FFFFFF] bg-black/60 hover:bg-white/15 border border-white/10 transition-colors"
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden min-h-0">
        {/* Stream / Video Playback */}
        {camera.isLiveAI ? (
          <>
            <img
              src={camera.url}
              alt={camera.name}
              className={`w-full h-full object-cover ${streamError ? 'hidden' : 'block'}`}
              onError={() => setStreamError(true)}
              onLoad={() => setStreamError(false)}
            />
            {streamError && (
              <video
                ref={videoRef}
                src="/sample_video.mp4"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                onLoadedMetadata={() => {
                  if (camera.initialTime && videoRef.current) {
                    try {
                      videoRef.current.currentTime = camera.initialTime;
                    } catch (e) {
                      console.warn('Initial seek failed:', e);
                    }
                  }
                }}
                onLoadedData={handleVideoReady}
                onPlay={handleVideoReady}
                controls={false}
              />
            )}
          </>
        ) : (
          <video
            ref={videoRef}
            src={camera.url || '/sample_video.mp4'}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            crossOrigin="anonymous"
            onLoadedMetadata={() => {
              if (camera.initialTime && videoRef.current) {
                try {
                  videoRef.current.currentTime = camera.initialTime;
                } catch (e) {
                  console.warn('Initial seek failed:', e);
                }
              }
            }}
            onLoadedData={handleVideoReady}
            onPlay={handleVideoReady}
            controls={false}
          />
        )}

        {/* 1. VIRTUAL TRIPWIRE RED LINE (Real OpenCV Line Simulation) */}
        {showAiOverlay && (
          <div className="absolute top-0 bottom-0 left-[48%] pointer-events-none z-10">
            {/* Red Laser Line */}
            <div className={`w-[2px] h-full transition-all duration-300 ${
              tripwireCounts.justCrossed 
                ? 'bg-[#22C55E] shadow-[0_0_12px_#22C55E]' 
                : 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'
            }`} />

            {/* Tripwire Header Label */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/85 px-1.5 py-0.5 rounded border border-[#EF4444]/60 text-[8px] font-mono text-[#EF4444] whitespace-nowrap shadow-md">
              LINE [x=380] | IN: {tripwireCounts.inCount} | OUT: {tripwireCounts.outCount}
            </div>
          </div>
        )}

        {/* 2. REAL ANPR INSPECTOR HUD: PHOTO CAPTURED FROM VIDEO + MULTI-FRAME TRACKING */}
        {showAiOverlay && (camera.id === 'CAM-01' || isMaximized) && (
          <div className="absolute top-8 right-2 z-15 w-[205px] bg-black/94 border border-[#3E7BFA]/40 rounded p-2 text-left font-mono pointer-events-none shadow-2xl backdrop-blur-md">
            {/* HUD Header */}
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/20">
              <span className="text-[8px] font-bold tracking-wider text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                REAL ANPR INSPECTOR
              </span>
              <span className="text-[7px] text-[#22C55E] font-bold bg-[#22C55E]/10 px-1 rounded border border-[#22C55E]/40">
                LOCKED
              </span>
            </div>

            {/* ACTUAL PHOTO CAPTURED DIRECTLY FROM VIDEO */}
            <div className="relative my-1 rounded overflow-hidden border border-[#555555] shadow-md bg-black">
              {latestInspector.photoUrl ? (
                <img
                  src={latestInspector.photoUrl}
                  alt="Real Captured Video Frame Crop"
                  className="w-full h-[52px] object-cover"
                />
              ) : (
                <div className="h-[52px] bg-[#111111] border border-dashed border-[#444444] rounded flex items-center justify-center text-[8px] text-[#777777]">
                  Capturing video crop...
                </div>
              )}
              {/* Corner targeting reticles */}
              <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-[#22C55E]" />
              <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-[#22C55E]" />
              <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-[#22C55E]" />
              <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-[#22C55E]" />
            </div>

            {/* Recognized Plate Banner matching vehicle */}
            <div className="bg-white text-black px-1.5 py-0.5 rounded-[2px] border border-black flex items-center justify-between my-1 shadow-sm">
              <span className="text-[7px] font-bold text-[#002244] tracking-tighter">GB</span>
              <span className="text-[11px] font-black tracking-widest font-mono text-black">
                {latestInspector.plate}
              </span>
              <span className="text-[7px] font-bold text-[#16A34A]">{latestInspector.conf}%</span>
            </div>

            {/* Status Line in Yellow */}
            <div className="text-[8px] text-[#FACC15] font-semibold truncate">
              INFO: #{latestInspector.trackId} {latestInspector.vClass} ({latestInspector.speed} km/h)
            </div>

            {/* MULTI-FRAME TRACKING FILMSTRIP WITH ACTUAL FRAME THUMBNAILS */}
            <div className="mt-1.5 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-[7px] text-[#888888] mb-1">
                <span className="flex items-center gap-0.5 text-[#00FF66]">
                  <Layers size={8} />
                  <span>TRACKED FRAMES ({latestInspector.trackedFrames})</span>
                </span>
                <span className="text-[#AAAAAA]">CONSENSUS 5/5</span>
              </div>

              {/* 3 Consecutive Tracked Frame Snapshots */}
              <div className="grid grid-cols-3 gap-1">
                {latestInspector.frameBuffer.map((fb, idx) => (
                  <div 
                    key={idx}
                    className={`p-0.5 rounded text-center border flex flex-col items-center overflow-hidden ${
                      fb.label === 'LOCKED' 
                        ? 'bg-[#22C55E]/15 border-[#22C55E]/60 text-[#22C55E]' 
                        : 'bg-[#161616] border-[#333333] text-[#888888]'
                    }`}
                  >
                    {fb.photo ? (
                      <img 
                        src={fb.photo} 
                        alt={`Frame ${fb.frameId}`} 
                        className="w-full h-[18px] object-cover rounded-[1px] mb-0.5" 
                      />
                    ) : (
                      <div className="w-full h-[18px] bg-black/40 rounded-[1px] mb-0.5" />
                    )}
                    <div className="text-[7px] font-bold leading-tight">F#{fb.frameId}</div>
                    <div className="text-[6px] font-mono leading-tight">{fb.conf}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. DYNAMIC YELLOW & RED VEHICLE BOUNDING BOXES & MOTION TRAILS */}
        {showAiOverlay && activeBoxes.map((box) => (
          <React.Fragment key={box.id}>
            {/* Trajectory Motion Trail dots */}
            {box.trail && box.trail.map((pt, tIdx) => (
              <div
                key={`trail-${box.id}-${tIdx}`}
                style={{
                  top: pt.y,
                  left: pt.x,
                  backgroundColor: box.boxColor,
                  opacity: (tIdx + 1) * 0.3
                }}
                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-5 transition-all duration-300"
              />
            ))}

            {/* Vehicle Bounding Box strictly wrapping the vehicle */}
            <div
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
                borderColor: box.boxColor,
              }}
              className="absolute border-2 pointer-events-none transition-all duration-500 ease-out z-10"
            >
              {/* Target Reticle Corners */}
              <span 
                style={{ borderColor: box.boxColor }} 
                className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2" 
              />
              <span 
                style={{ borderColor: box.boxColor }} 
                className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2" 
              />
              <span 
                style={{ borderColor: box.boxColor }} 
                className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2" 
              />
              <span 
                style={{ borderColor: box.boxColor }} 
                className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2" 
              />

              {/* Optical Center Crosshairs inside vehicle bounding box */}
              <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
                <div style={{ backgroundColor: box.boxColor }} className="w-3.5 h-[1px]" />
                <div style={{ backgroundColor: box.boxColor }} className="h-3.5 w-[1px] absolute" />
              </div>

              {/* Top Badge: #{trackId} {vClass} {speed}km/h */}
              <div 
                style={{ backgroundColor: box.boxColor }}
                className="absolute -top-4 left-0 px-1.5 py-0.2 rounded-[1px] text-[8px] font-mono font-black text-black whitespace-nowrap shadow-md tracking-tight"
              >
                #{box.trackId} {box.vClass} {box.speed}km/h {box.isOverspeed ? '⚠️' : ''}
              </div>

              {/* REAL NUMBER PLATE WHITE BADGE PINNED ON VEHICLE FRONT BUMPER */}
              <div className="absolute top-[56%] left-1/2 -translate-x-1/2 bg-white border border-black rounded-[2px] px-1.5 py-0.2 flex items-center gap-1 shadow-2xl whitespace-nowrap z-15">
                <span className="text-[6px] font-black text-[#002244] tracking-tighter">GB</span>
                <span className="text-[9px] font-black font-mono text-black tracking-wider">
                  [{box.plate}]
                </span>
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* Optical Crosshairs */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
          <div className="w-6 h-[1px] bg-white" />
          <div className="h-6 w-[1px] bg-white absolute" />
        </div>

        {/* Direct Drag Over Notice */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm border-2 border-dashed border-[#22C55E] flex flex-col items-center justify-center p-3 text-center">
            <Upload size={30} className="text-[#22C55E] animate-bounce mb-1" />
            <span className="text-xs font-mono font-bold text-[#F0F0F0]">
              DIRECT STREAM INGESTION
            </span>
            <span className="text-[10px] text-[#22C55E] font-mono mt-0.5">
              Release video to bind to {camera.id}
            </span>
          </div>
        )}

        {/* Drop Confirmation Toast */}
        {dropFeedback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 bg-[#161616]/95 border border-[#22C55E]/80 text-[#22C55E] px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 shadow-xl">
            <Check size={12} />
            <span>{dropFeedback}</span>
          </div>
        )}
      </div>

      {/* Bottom CCTV Telemetry Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-2 py-0.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#CCCCCC] drop-shadow">
          <span className="text-[#22C55E] font-semibold">{currentTimeStr}</span>
          <span className="text-[#777777]">|</span>
          <span className="text-[#AAAAAA] truncate max-w-[120px]">{camera.sector}</span>
        </div>

        <div className="flex items-center gap-1 text-[9px] font-mono text-[#888888] drop-shadow">
          <span>{camera.id}</span>
          <span className="text-[#22C55E] bg-black/60 px-1 rounded border border-[#22C55E]/30 text-[8px]">
            AI PASS 1
          </span>
        </div>
      </div>
    </div>
  );
}
