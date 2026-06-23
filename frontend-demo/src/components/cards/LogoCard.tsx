import usherMarker from '../../assets/usher-marker.svg';
import { Card } from '../ui/Card';

export function LogoCard() {
  return (
    <Card
      className="flex items-center gap-3 px-4 h-[72px] shrink-0"
      style={{ backgroundColor: '#0869d9' }}
    >
      <img
        src={usherMarker}
        alt="USHER"
        className="h-11 w-auto brightness-0 invert shrink-0"
        style={{ maxWidth: '42px' }}
      />
      <div className="w-px h-10 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <div className="flex flex-col justify-center">
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '17px', lineHeight: 1, letterSpacing: '-0.02em' }}>
          ERI IDC
        </span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '12px', lineHeight: 1.4, letterSpacing: '0.04em', marginTop: '2px' }}>
          Seismic Monitor
        </span>
      </div>
    </Card>
  );
}
