/**
 * zkLogin Module - Barrel Export
 * 
 * Provides a clean API for zkLogin functionality throughout the app
 */

// Auth functions
export {
  beginZkLogin,
  completeZkLogin,
  decodeJwt,
  signAndExecuteZkLoginTransaction,
  type JwtPayload,
  type DecodedJwt,
} from './auth';

// Configuration
export {
  ZKLOGIN_CONFIG,
  validateZkLoginConfig,
} from './config';

// Storage utilities
export {
  clearZkLoginSession,
  hasValidZkLoginSession,
  getUserAddress,
  getEphemeralKeyPair,
  getZkProof,
} from './storage';

/**
 * Logout function - clears all zkLogin session data
 */
export { clearZkLoginSession as logout } from './storage';

