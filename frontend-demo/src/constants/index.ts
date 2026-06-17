import type { IntensityScaleItem } from '../types';

// PEIS Intensity Scale — reference data (fixed standard)
export const INTENSITY_SCALE: IntensityScaleItem[] = [
  { level: 1, label: '1', range: '<0.0017', color: '#ffffff', text: '#1e293b' },
  { level: 2, label: '2', range: '0.0017 - 0.005', color: '#bfccff', text: '#1e293b' },
  { level: 3, label: '3', range: '0.005 - 0.014', color: '#a0e6ff', text: '#1e293b' },
  { level: 4, label: '4', range: '0.014 - 0.039', color: '#80ffff', text: '#1e293b' },
  { level: 5, label: '5', range: '0.039 - 0.092', color: '#7aff93', text: '#1e293b' },
  { level: 6, label: '6', range: '0.092 - 0.18', color: '#ffff00', text: '#1e293b' },
  { level: 7, label: '7', range: '0.18 - 0.34', color: '#ffc800', text: '#1e293b' },
  { level: 8, label: '8', range: '0.34 - 0.65', color: '#ff9100', text: '#ffffff' },
  { level: 9, label: '9', range: '0.65 - 1.24', color: '#ff0000', text: '#ffffff' },
  { level: 10, label: '10', range: '>1.24', color: '#c80000', text: '#ffffff' },
];

// Intensity message logic
export function getIntensityMessage(level: number) {
  if (level >= 10) return { title: "COMPLETELY DEVASTATING (X)", desc: "Some well-built wooden and most masonry structures destroyed with foundations." };
  if (level === 9) return { title: "DEVASTATING (IX)", desc: "Damage considerable in specially designed structures; well-designed frame structures thrown out of plumb." };
  if (level === 8) return { title: "VERY DESTRUCTIVE (VIII)", desc: "Damage slight in specially designed structures; considerable damage in ordinary substantial buildings." };
  if (level === 7) return { title: "DESTRUCTIVE (VII)", desc: "Damage negligible in buildings of good design; slight to moderate in well-built ordinary structures." };
  if (level === 6) return { title: "VERY STRONG (VI)", desc: "Felt by all, many frightened. Some heavy furniture moved. Damage slight." };
  if (level === 5) return { title: "STRONG (V)", desc: "Felt by nearly everyone; many awakened. Some dishes, windows broken. Unstable objects overturned." };
  if (level === 4) return { title: "MODERATELY STRONG (IV)", desc: "Felt indoors by many, outdoors by few during the day. At night, some awakened. Dishes, windows disturbed." };
  if (level === 3) return { title: "WEAK (III)", desc: "Felt noticeably indoors, especially on upper floors. Many people do not recognize it as an earthquake." };
  if (level === 2) return { title: "SLIGHTLY FELT (II)", desc: "Felt noticeably indoors, especially on upper floors. Many people do not recognize it as an earthquake." };
  return { title: "SCARCELY PERCEPTIBLE (I)", desc: "Not felt except by a very few under especially favorable conditions." };
}
