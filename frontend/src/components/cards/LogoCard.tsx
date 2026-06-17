import usherMarker from '../../assets/usher-marker.svg';
import { Card } from '../ui/Card';

interface LogoCardProps {
  isLive: boolean;
  isDark: boolean;
  onThemeToggle: () => void;
}

export function LogoCard({ isLive, isDark, onThemeToggle }: LogoCardProps) {
  return (
    <Card
      className="flex items-center gap-2 px-3 h-[72px] shrink-0"
      style={{ background: 'linear-gradient(135deg, #0869d9 0%, #1d4ed8 100%)' }}
    >
      <img
        src={usherMarker}
        alt="USHER"
        className="h-10 w-auto brightness-0 invert shrink-0"
        style={{ maxWidth: '38px' }}
      />
      <div className="w-px h-8 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <div className="flex flex-col justify-center min-w-0">
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '14px', lineHeight: 1, letterSpacing: '-0.02em' }}>
          ERI IDC
        </span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, fontSize: '10px', lineHeight: 1.4, letterSpacing: '0.03em', marginTop: '2px' }}>
          Seismic Monitor
        </span>
      </div>

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {/* Live connection indicator dot */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-green-400 animate-pulse' : 'bg-amber-300'}`}
          title={isLive ? 'Sensor connected' : 'No sensor signal'}
        />

        {/* Light / dark mode toggle */}
        <button
          onClick={onThemeToggle}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="text-white leading-none" style={{ fontSize: '12px' }}>
            {isDark ? '☀' : '☾'}
          </span>
        </button>
      </div>
    </Card>
  );
}
