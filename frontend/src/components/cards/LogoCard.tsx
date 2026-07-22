import usherMarker from '../../assets/usher-marker.svg';
import { Card } from '../ui/Card';

export function LogoCard() {
  return (
    <Card
      className="flex items-center justify-center px-2 h-[46px] shrink-0"
      style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-gradient-end) 100%)' }}
    >
      <img
        src={usherMarker}
        alt="USHER"
        className="h-7 w-auto brightness-0 invert"
      />
    </Card>
  );
}
