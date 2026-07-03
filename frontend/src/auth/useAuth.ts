import { useCallback, useState } from 'react';
import { seismicApi } from '../api/seismicApi';

/**
 * Tech-support admin auth.
 *
 * SECURITY NOTE: the backend `/loginUser` does a plaintext compare against
 * config_tbl.admin_def_username / admin_def_pass over plain HTTP — there is no
 * token or server-side session. This gate is the React equivalent of the
 * original Angular app's `this.auth` boolean: it keeps the tech-support
 * dashboard out of the kiosk operator's reach, but it is NOT real security.
 * Hardening (hashing, tokens) is intentionally out of scope and would require
 * backend changes.
 *
 * We use sessionStorage (not localStorage) so the session ends when the
 * browser/tab is closed.
 */
const AUTH_KEY = 'usher-admin-auth';

export function isAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function setAuthed(value: boolean): void {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

export interface UseAuth {
  authed: boolean;
  /** Returns `{ ok, message }`. `ok` true means login succeeded. */
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

export function useAuth(): UseAuth {
  const [authed, setAuthedState] = useState<boolean>(isAuthed);

  const login = useCallback(async (username: string, password: string) => {
    const res = await seismicApi.loginUser(username, password);
    // After client.ts normalization, `success` reflects the backend `error`
    // flag. The backend returns HTTP 200 with error:true for invalid creds.
    if (res.success) {
      setAuthed(true);
      setAuthedState(true);
      return { ok: true, message: res.message };
    }
    return { ok: false, message: res.message || 'Invalid username or password' };
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    setAuthedState(false);
  }, []);

  return { authed, login, logout };
}
