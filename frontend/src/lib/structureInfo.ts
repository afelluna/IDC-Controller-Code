export type BuildingType = 'Lowrise Building' | 'Highrise Building' | 'Other';

export interface StructureInfo {
  structure_name: string;
  building_type: BuildingType;
  location: string;
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = 'usher-structure-info';

// Structure identity — the building/site this device monitors (name, type,
// location, coordinates). This is the subject of the ERI report, not the
// monitoring hardware itself; see deviceInfo.ts for the device/node identity.
// Stored client-side in localStorage for the same reason as deviceInfo.ts:
// the deployed backend build predates a dedicated route + DB columns for it.
export function getStructureInfo(): StructureInfo | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StructureInfo;
  } catch {
    return null;
  }
}

export function saveStructureInfo(info: StructureInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}
