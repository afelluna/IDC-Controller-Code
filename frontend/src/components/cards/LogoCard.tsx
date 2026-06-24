import usherMarker from '../../assets/usher-marker.svg';
import { Card } from '../ui/Card';

export function LogoCard() {
  return (
    <Card
      className="flex items-center justify-center px-2 h-[46px] shrink-0"
      style={{ background: 'linear-gradient(135deg, #2D61D3 0%, #1d4ed8 100%)' }}
    >
      <img
        src={usherMarker}
        alt="USHER"
        className="h-7 w-auto brightness-0 invert"
      />
    </Card>
  );
}
