// Shared session timing constants.
// Keep all session flow timings centralized to avoid drift between App, LoginScreen and guard hooks.

export const ACTIVE_TAB_FRESH_MS = 10000;
export const SESSION_HEARTBEAT_MS = 2000;
export const SESSION_EARLY_CLAIM_DELAYS_MS = [150, 600];
export const POST_LOGIN_CLEANUP_DELAY_MS = 5000;
export const SESSION_RELOAD_DELAY_MS = 100;
export const SESSION_NOTICE_KEY = 'chatlon_session_notice';
export const SESSION_NOTICE_TTL_MS = 5 * 60 * 1000;

export const SESSION_POST_CLOSE_RELOAD = 'reload';
export const SESSION_POST_CLOSE_STAY_ON_LOGIN = 'stay_on_login';
export const SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD = 'shutdown_boot_reload';

export const SESSION_CLOSE_REASON_CONFLICT = 'conflict';
export const SESSION_CLOSE_REASON_MANUAL_LOGOFF = 'manual_logoff';
export const SESSION_CLOSE_REASON_MANUAL_SHUTDOWN = 'manual_shutdown';
