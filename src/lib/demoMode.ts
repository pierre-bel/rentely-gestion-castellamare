// Pure client-side demo mode state - no Supabase auth required
// This module is used by useAuth, useUserRole, and DemoContext

export type DemoRole = "guest" | "host" | "admin";

interface DemoState {
  active: boolean;
  role: DemoRole;
  userId: string;
  email: string;
}

const DEMO_STATE_KEY = "rentely_demo_state";

const DEMO_USERS: Record<DemoRole, { userId: string; email: string; firstName: string; lastName: string }> = {
  guest: { userId: "demo-guest-0000-0000-000000000001", email: "guest@demo.com", firstName: "Demo", lastName: "Guest" },
  host: { userId: "demo-host-0000-0000-000000000002", email: "host@demo.com", firstName: "Demo", lastName: "Host" },
  admin: { userId: "demo-admin-0000-0000-000000000003", email: "admin@demo.com", firstName: "Demo", lastName: "Admin" },
};

let _state: DemoState | null = null;

// Initialize from localStorage on module load
try {
  const stored = localStorage.getItem(DEMO_STATE_KEY);
  if (stored) _state = JSON.parse(stored);
} catch { /* ignore */ }

export function getDemoState(): DemoState | null {
  return _state;
}

export function activateDemo(role: DemoRole): DemoState {
  const user = DEMO_USERS[role];
  _state = { active: true, role, userId: user.userId, email: user.email };
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(_state));
  // Clear any stale Supabase session to prevent refresh token errors
  const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
  if (sbKey) localStorage.removeItem(sbKey);
  return _state;
}

export function deactivateDemo() {
  _state = null;
  localStorage.removeItem(DEMO_STATE_KEY);
}

export function isDemoActive(): boolean {
  return _state?.active === true;
}

export function getDemoUser(role?: DemoRole) {
  const r = role || _state?.role;
  if (!r) return null;
  return DEMO_USERS[r];
}

export function getDemoFakeUser(): any | null {
  if (!_state) return null;
  const user = DEMO_USERS[_state.role];
  return {
    id: user.userId,
    email: user.email,
    user_metadata: { first_name: user.firstName, last_name: user.lastName },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
}
