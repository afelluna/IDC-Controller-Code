export interface DeviceInfo {
  device_name: string;
}

const STORAGE_KEY = 'usher-device-info';

// Device/hardware identity — just the friendly label for this monitoring
// unit. Location and structure identity live in structureInfo.ts instead,
// since those describe the building being monitored, not the device.
// Stored in localStorage rather than the backend/DB: the gateway device's
// deployed backend build predates the /updateDeviceInfo route and the DB
// migration for these columns, so hitting it just fails ("could not reach
// device"). Switch this to seismicApi.updateDeviceInfo once that backend is
// redeployed.
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
