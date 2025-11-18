# zkLogin Implementation

This directory contains the complete zkLogin implementation for Sui Patreon, enabling passwordless authentication using Google OAuth with zero-knowledge proofs.

## Files Overview

### `config.ts`
Configuration and environment variables for zkLogin:
- Google OAuth settings
- Sui network configuration
- Prover service URLs
- Storage keys
- Configuration validation

### `auth.ts`
Core authentication logic:
- `beginZkLogin()` - Starts the OAuth flow with ephemeral keypair generation
- `completeZkLogin()` - Completes login after OAuth callback
- `decodeJwt()` - Parses JWT tokens from Google
- `getUserSalt()` - Gets deterministic user salt (needs backend for production)
- `getZkProof()` - Requests ZK proof from Mysten Labs prover
- `signAndExecuteZkLoginTransaction()` - Signs and executes Sui transactions

### `storage.ts`
Persistent storage utilities (uses localStorage):
- Ephemeral keypair storage/retrieval
- ZK proof caching
- User address persistence
- Session validation
- Logout (clear all data)
- Persists across browser restarts

### `index.ts`
Barrel export providing clean API:
```typescript
import { beginZkLogin, logout, getUserAddress } from '@/lib/zklogin';
```

## Usage Examples

### Login Flow
```typescript
import { beginZkLogin } from '@/lib/zklogin';

// Start login
const { loginUrl } = await beginZkLogin();
window.location.href = loginUrl;

// After OAuth callback (in /auth/callback):
import { completeZkLogin } from '@/lib/zklogin';
const { address, decodedJwt } = await completeZkLogin(jwt);
```

### Logout
```typescript
import { logout } from '@/lib/zklogin';

logout(); // Clears all zkLogin session data
```

### Sign Transactions
```typescript
import { signAndExecuteZkLoginTransaction } from '@/lib/zklogin';
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
// ... build transaction

const digest = await signAndExecuteZkLoginTransaction(tx, userAddress);
```

## Security Considerations

### ✅ Implemented
- Ephemeral keys stored in localStorage (persist across browser sessions)
- ZK proofs cached securely
- Nonce generation tied to ephemeral key
- JWT validation before processing
- Login persists until explicit logout or key expiration

### ⚠️ Production Requirements

#### User Salt Management
**Current**: Deterministic salt from OAuth sub ID (DEMO ONLY)

**Required**: Backend service that:
1. Validates JWTs
2. Stores unique salt per user in database
3. Returns consistent salt for same user
4. Never exposes salt generation to client

Example:
```typescript
// backend/api/zklogin/salt.ts
export async function POST(request: Request) {
  const { jwt } = await request.json();
  const decoded = await validateJwt(jwt);
  const salt = await db.getSaltForUser(decoded.sub);
  return Response.json({ salt });
}
```

#### Proving Service
**Current**: Public Mysten Labs prover

**Options**:
1. Mysten Labs service (recommended) - Contact for enterprise
2. Self-hosted prover - Requires 16+ cores, 64GB+ RAM

## Architecture Flow

```
┌──────────────┐
│ User clicks  │
│ "Login"      │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ beginZkLogin()          │
│ • Generate keypair      │
│ • Create nonce          │
│ • Store in session      │
└──────┬──────────────────┘
       │
       ▼ Redirect
┌─────────────────────────┐
│ Google OAuth            │
│ • User authenticates    │
│ • Returns JWT           │
└──────┬──────────────────┘
       │
       ▼ Callback
┌─────────────────────────┐
│ completeZkLogin()       │
│ • Decode JWT            │
│ • Get user salt         │
│ • Request ZK proof      │
│ • Derive Sui address    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ User logged in!         │
│ • Has Sui address       │
│ • Can sign transactions │
└─────────────────────────┘
```

## Testing

### Development Setup
1. Copy `.env.local.example` to `.env.local`
2. Add your Google OAuth Client ID
3. Start dev server: `npm run dev`
4. Click login button
5. Complete Google OAuth
6. Should redirect back with address

### Verify Implementation
- Check browser console for logs
- Inspect sessionStorage for zkLogin data
- Test transaction signing (once contracts deployed)
- Verify address consistency across logins

## Troubleshooting

### Common Issues

**"Missing configuration"**
→ Create `.env.local` with required variables

**"Failed to generate proof"**
→ Check network, verify JWT validity, try again

**"Invalid JWT token"**
→ JWT expired, try logging in again

**Address changes each login**
→ Salt not consistent, need backend implementation

## Resources

- [Sui zkLogin Docs](https://docs.sui.io/guides/developer/cryptography/zklogin-integration)
- [Setup Guide](../../../ZKLOGIN_SETUP.md)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)

## Next Steps for Production

- [ ] Implement backend salt service
- [ ] Add proper JWT validation
- [ ] Consider self-hosted prover (if high volume)
- [ ] Add monitoring/logging
- [ ] Implement session refresh
- [ ] Add error recovery mechanisms
- [ ] Set up rate limiting
- [ ] Configure production OAuth credentials

