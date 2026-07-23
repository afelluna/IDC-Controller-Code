export interface DeviceInfo {
  device_name: string;
  location: string;
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = 'usher-device-info';

// Device identity/location, kept client-side until the backend build on the
// gateway device is redeployed with the /updateDeviceInfo route + DB columns.
// The planned report-generation feature should read this via getDeviceInfo().
export function getDeviceInfo(): DeviceInfo | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceInfo;
  } catch {
    return null;
  }
}

export function saveDeviceInfo(info: DeviceInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}
