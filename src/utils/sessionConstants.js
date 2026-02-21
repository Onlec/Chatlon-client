// Shared session timing constants.
// Keep all session flow timings centralized to avoid drift between App, LoginScreen and guard hooks.

export const ACTIVE_TAB_FRESH_MS = 10000;
export const SESSION_HEARTBEAT_MS = 2000;
export const SESSION_EARLY_CLAIM_DELAYS_MS = [150, 600];
export const POST_LOGIN_CLEANUP_DELAY_MS = 5000;
export const SESSION_RELOAD_DELAY_MS = 100;
