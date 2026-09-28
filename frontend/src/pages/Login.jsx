import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [isBlinking, setIsBlinking] = useState(false);
  const [lookX, setLookX] = useState(0);
  const blinkTimeoutRef = useRef(null);
  const lookTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const scheduleNextBlink = () => {
      // frequent blinks: every 1.5s - 3.5s
      const delay = 1500 + Math.random() * 2000;
      blinkTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        setIsBlinking(true);
        blinkTimeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          setIsBlinking(false);
          scheduleNextBlink();
        }, 260);
      }, delay);
    };

    const scheduleNextLook = () => {
      // shift gaze every 2s - 5s
      const delay = 2000 + Math.random() * 3000;
      lookTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        // pick a new horizontal offset: left, center, or right
        const options = [-14, -7, 0, 7, 14];
        const next = options[Math.floor(Math.random() * options.length)];
        setLookX(next);
        scheduleNextLook();
      }, delay);
    };

    scheduleNextBlink();
    scheduleNextLook();
    return () => {
      cancelled = true;
      clearTimeout(blinkTimeoutRef.current);
      clearTimeout(lookTimeoutRef.current);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    const success = await login(username, password);
    if (success) navigate('/dashboard');
  };

  const eyelidTopStyle = {
    transform: isBlinking ? 'translateY(0px)' : 'translateY(-170px)',
    transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
  };
  const eyelidBottomStyle = {
    transform: isBlinking ? 'translateY(0px)' : 'translateY(170px)',
    transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
  };
  const pupilGroupStyle = {
    transform: `translateX(${lookX}px)`,
    transition: 'transform 900ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="w-screen h-screen flex bg-[#111111] overflow-hidden select-none">

      {/* Left panel — identity */}
      <div className="md:w-[52%] h-full border-r border-[#2A2A2A] relative overflow-hidden flex flex-col justify-end p-6 pb-6 pl-8 hidden md:flex">

        <svg
          viewBox="0 0 340 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] w-[320px] h-[320px]"
        >
          <defs>
            <clipPath id="eyeClip">
              <path d="M20 170 Q170 62 320 170 Q170 278 20 170Z" />
            </clipPath>
          </defs>

          {/* Outer concentric radar rings - thicker & prominent */}
          <circle cx="170" cy="170" r="158" stroke="#383838" strokeWidth="2.5" />
          <circle cx="170" cy="170" r="145" stroke="#333333" strokeWidth="2" strokeDasharray="5 8" />
          
          {/* Main Eye Contour Outline - High contrast & bold */}
          <path d="M20 170 Q170 62 320 170 Q170 278 20 170Z" stroke="#666666" strokeWidth="3" />

          {/* Calibrated Ticks / HUD Marks */}
          <g stroke="#484848" strokeWidth="2">
            <line x1="170" y1="98" x2="170" y2="84" />
            <line x1="170" y1="242" x2="170" y2="256" />
            <line x1="98" y1="170" x2="84" y2="170" />
            <line x1="242" y1="170" x2="256" y2="170" />
            <line x1="119" y1="119" x2="109" y2="109" />
            <line x1="221" y1="221" x2="231" y2="231" />
            <line x1="221" y1="119" x2="231" y2="109" />
            <line x1="119" y1="221" x2="109" y2="231" />
            <line x1="142" y1="100" x2="136" y2="86" />
            <line x1="198" y1="240" x2="204" y2="254" />
            <line x1="100" y1="198" x2="86" y2="204" />
            <line x1="240" y1="142" x2="254" y2="136" />
            <line x1="198" y1="100" x2="204" y2="86" />
            <line x1="142" y1="240" x2="136" y2="254" />
            <line x1="240" y1="198" x2="254" y2="204" />
            <line x1="100" y1="142" x2="86" y2="136" />
          </g>

          <line x1="48" y1="170" x2="292" y2="170" stroke="#333333" strokeWidth="1.8" strokeDasharray="3 8" />
          <line x1="170" y1="48" x2="170" y2="292" stroke="#333333" strokeWidth="1.8" strokeDasharray="3 8" />

          {/* Dynamic Ocular Iris & Eyelids */}
          <g clipPath="url(#eyeClip)">
            <circle cx="170" cy="170" r="72" stroke="#505050" strokeWidth="2.5" />
            <circle cx="170" cy="170" r="54" stroke="#444444" strokeWidth="2.2" />
            <circle cx="170" cy="170" r="36" stroke="#555555" strokeWidth="2" />

            {/* pupil/iris group — drifts left/right for a "looking around" effect */}
            <g style={pupilGroupStyle}>
              <circle cx="170" cy="170" r="22" fill="#111111" stroke="#BBBBBB" strokeWidth="2.5" />
              <circle cx="170" cy="170" r="13" fill="#1E1E1E" stroke="#DDDDDD" strokeWidth="2" />
              <circle cx="170" cy="170" r="5.5" fill="#FFFFFF" opacity="0.95" />
              <circle cx="163" cy="163" r="2.5" fill="#FFFFFF" opacity="0.75" />
            </g>

            {/* Eyelids for opening/closing blink effect */}
            <rect x="0" y="0" width="340" height="170" fill="#111111" style={eyelidTopStyle} />
            <rect x="0" y="170" width="340" height="170" fill="#111111" style={eyelidBottomStyle} />
          </g>

          {/* Outer Viewport Corner Target Brackets */}
          <g stroke="#484848" strokeWidth="2.2">
            <line x1="20" y1="20" x2="36" y2="20" /><line x1="20" y1="20" x2="20" y2="36" />
            <line x1="320" y1="20" x2="304" y2="20" /><line x1="320" y1="20" x2="320" y2="36" />
            <line x1="20" y1="320" x2="36" y2="320" /><line x1="20" y1="320" x2="20" y2="304" />
            <line x1="320" y1="320" x2="304" y2="320" /><line x1="320" y1="320" x2="320" y2="304" />
          </g>
        </svg>

        <div className="relative z-10 mb-0 ml-0">
          <h1 className="font-serif text-[38px] font-bold text-[#F0F0F0] leading-none mb-2 tracking-tight">
            Dri<em className="italic text-[#888888]">shti</em>
          </h1>
          <p className="text-[13px] text-[#777777] font-ui tracking-wide">
            Urban traffic intelligence &amp; ANPR
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 md:w-[48%] h-full bg-[#161616] flex items-center justify-center px-12">
        <div className="w-full max-w-[320px] flex flex-col">
          <h2 className="font-serif text-[28px] font-bold text-[#F0F0F0] mb-2 leading-tight tracking-tight">
            Sign in
          </h2>
          <p className="text-[13px] text-[#777777] font-ui mb-10 leading-relaxed">
            Authorised operators only
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <Input
                label="Operator ID"
                type="text"
                mono
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (error) clearError(); }}
                placeholder="operator username"
                autoFocus
                required
              />
            </div>
            <div className="mb-5">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#EF4444] font-ui mb-4">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full mt-4 bg-[#F0F0F0] text-[#111111] hover:bg-[#DEDEDE] font-semibold"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}