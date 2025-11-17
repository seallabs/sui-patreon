# Corrected zkLogin Documentation for Sui Ecosystem

```markdown
# 5. zkLogin (Authentication)

### Overview
zkLogin enables Web2 social login for Web3 apps using zero-knowledge proofs.

### Key Features
- **Social Login**: Google, Facebook, Twitch, Apple, Microsoft, Slack, Kakao
- **No Seed Phrases**: Familiar OAuth flow
- **Self-Custodial**: User maintains control
- **Privacy Preserving**: No credentials on-chain
- **Two-Factor**: OAuth + Salt

### Architecture

```
┌─────────────────────────────────────────────┐
│  1. User clicks "Login with Google"         │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  2. Generate ephemeral keypair + nonce      │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  3. Redirect to Google OAuth                │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  4. User authenticates → JWT returned       │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  5. Generate Zero-Knowledge Proof           │
│     (JWT + Salt → ZKP)                      │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  6. Derive Sui address from OAuth ID        │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  7. Sign transactions with ephemeral key    │
│     + ZKP for verification                  │
└─────────────────────────────────────────────┘
```

### Installation

```bash
npm install @mysten/sui
# or
yarn add @mysten/sui
# or
pnpm add @mysten/sui
```

### Implementation

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { 
  generateNonce, 
  generateRandomness,
  getZkLoginSignature,
  jwtToAddress,
  getExtendedEphemeralPublicKey,
  genAddressSeed
} from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';

// Configuration
const CONFIG = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  REDIRECT_URL: 'http://localhost:3000/auth/callback',
  PROVER_URL: 'https://prover-dev.mystenlabs.com/v1',
  OPENID_PROVIDER: 'https://accounts.google.com',
  FULLNODE_URL: getFullnodeUrl('devnet'), // or 'testnet', 'mainnet'
};

// Initialize Sui client
const suiClient = new SuiClient({ url: CONFIG.FULLNODE_URL });

// JWT Payload Interface
interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}

// Step 1: Initiate login
async function initiateLogin() {
  // Generate ephemeral keypair
  const ephemeralKeyPair = new Ed25519Keypair();
  const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
  
  // Get current epoch and set max epoch
  const { epoch } = await suiClient.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + 2; // Valid for 2 epochs
  
  // Generate randomness and nonce
  const randomness = generateRandomness();
  const nonce = generateNonce(
    ephemeralPublicKey, 
    maxEpoch, 
    randomness
  );
  
  // Store for later use (use sessionStorage for security)
  sessionStorage.setItem('ephemeral_keypair', 
    JSON.stringify(Array.from(ephemeralKeyPair.getSecretKey())));
  sessionStorage.setItem('randomness', randomness);
  sessionStorage.setItem('max_epoch', maxEpoch.toString());
  
  // Redirect to OAuth
  const authUrl = new URL(`${CONFIG.OPENID_PROVIDER}/o/oauth2/v2/auth`);
  authUrl.searchParams.set('client_id', CONFIG.CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', CONFIG.REDIRECT_URL);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('nonce', nonce);
  
  window.location.href = authUrl.toString();
}

// Step 2: Handle callback
async function handleCallback() {
  try {
    // Extract JWT from URL fragment
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const jwt = hashParams.get('id_token');
    
    if (!jwt) {
      throw new Error('No JWT token found in callback');
    }
    
    // Retrieve stored values
    const ephemeralKeyPairData = sessionStorage.getItem('ephemeral_keypair');
    const randomness = sessionStorage.getItem('randomness');
    const maxEpoch = sessionStorage.getItem('max_epoch');
    
    if (!ephemeralKeyPairData || !randomness || !maxEpoch) {
      throw new Error('Missing stored authentication data');
    }
    
    // Reconstruct ephemeral keypair
    const secretKey = new Uint8Array(JSON.parse(ephemeralKeyPairData));
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKey);
    
    // Decode JWT
    const decodedJwt = jwtDecode<JwtPayload>(jwt);
    
    // Get salt (should be stored securely)
    const salt = await getSalt(decodedJwt.sub!);
    
    // Generate ZK proof
    const zkProof = await getZkProof(
      jwt,
      ephemeralKeyPair,
      parseInt(maxEpoch),
      randomness,
      salt
    );
    
    // Derive Sui address
    const userAddress = jwtToAddress(jwt, salt);
    
    // Generate address seed for signing
    const addressSeed = genAddressSeed(
      BigInt(salt),
      'sub',
      decodedJwt.sub!,
      decodedJwt.aud as string
    ).toString();
    
    return {
      address: userAddress,
      ephemeralKeyPair,
      zkProof,
      maxEpoch: parseInt(maxEpoch),
      jwt,
      salt,
      addressSeed,
    };
  } catch (error) {
    console.error('Error handling callback:', error);
    throw error;
  }
}

// Step 3: Get ZK Proof from prover service
async function getZkProof(
  jwt: string,
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number,
  randomness: string,
  salt: string
) {
  try {
    // Get extended ephemeral public key
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
      ephemeralKeyPair.getPublicKey()
    );
    
    // Prepare request payload
    const payload = {
      jwt,
      extendedEphemeralPublicKey: extendedEphemeralPublicKey.toString(),
      maxEpoch: maxEpoch.toString(),
      jwtRandomness: randomness,
      salt: salt,
      keyClaimName: 'sub'
    };
    
    // Call prover service
    const response = await fetch(CONFIG.PROVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Prover request failed: ${response.statusText}`);
    }
    
    const zkProof = await response.json();
    return zkProof;
  } catch (error) {
    console.error('Error getting ZK proof:', error);
    throw error;
  }
}

// Step 4: Sign transactions
async function signTransaction(
  tx: Transaction,
  zkLoginData: {
    address: string;
    ephemeralKeyPair: Ed25519Keypair;
    zkProof: any;
    maxEpoch: number;
    addressSeed: string;
  }
) {
  try {
    // Set transaction sender
    tx.setSender(zkLoginData.address);
    
    // Sign with ephemeral key
    const { bytes, signature: userSignature } = await tx.sign({
      client: suiClient,
      signer: zkLoginData.ephemeralKeyPair,
    });
    
    // Combine with ZK proof to create zkLogin signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...zkLoginData.zkProof,
        addressSeed: zkLoginData.addressSeed,
      },
      maxEpoch: zkLoginData.maxEpoch,
      userSignature,
    });
    
    return { bytes, signature: zkLoginSignature };
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
}

// Step 5: Execute transaction
async function executeTransaction(
  tx: Transaction,
  zkLoginData: any
) {
  try {
    const { bytes, signature } = await signTransaction(tx, zkLoginData);
    
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: signature,
    });
    
    return result;
  } catch (error) {
    console.error('Error executing transaction:', error);
    throw error;
  }
}

// Salt management (CRITICAL - must be backed up)
async function getSalt(userIdentifier: string): Promise<string> {
  try {
    // Check if salt exists in storage
    let salt = await loadSalt(userIdentifier);
    
    if (!salt) {
      // Generate new salt (16-byte value or integer < 2^128)
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      salt = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store salt securely
      await storeSalt(userIdentifier, salt);
      
      // IMPORTANT: Display to user for backup
      displaySaltBackup(salt);
    }
    
    return salt;
  } catch (error) {
    console.error('Error managing salt:', error);
    throw error;
  }
}

// Helper: Load salt from storage (implement based on your backend)
async function loadSalt(userIdentifier: string): Promise<string | null> {
  // Option 1: From localStorage (client-side)
  return localStorage.getItem(`salt_${userIdentifier}`);
  
  // Option 2: From your backend service
  // const response = await fetch(`/api/salt/${userIdentifier}`);
  // return response.ok ? await response.text() : null;
  
  // Option 3: Use Mysten Labs salt service (requires whitelisting)
  // See: https://docs.enoki.mystenlabs.com/
}

// Helper: Store salt securely
async function storeSalt(userIdentifier: string, salt: string): Promise<void> {
  // Option 1: Store in localStorage (for demo only)
  localStorage.setItem(`salt_${userIdentifier}`, salt);
  
  // Option 2: Store in your backend database
  // await fetch('/api/salt', {
  //   method: 'POST',
  //   body: JSON.stringify({ userIdentifier, salt })
  // });
}

// Helper: Display salt backup warning
function displaySaltBackup(salt: string): void {
  console.warn('⚠️ IMPORTANT: Save your salt securely!');
  console.warn('Salt:', salt);
  // Show modal/dialog to user with backup instructions
}
```

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

interface ZkLoginState {
  isAuthenticated: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  signAndExecuteTransaction: (tx: Transaction) => Promise<any>;
}

export function useZkLogin(): ZkLoginState {
  const [address, setAddress] = useState<string | null>(null);
  const [zkLoginData, setZkLoginData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if returning from OAuth
    if (window.location.hash.includes('id_token')) {
      setIsLoading(true);
      handleCallback()
        .then(data => {
          setAddress(data.address);
          setZkLoginData(data);
          // Store in sessionStorage (NOT localStorage for security)
          sessionStorage.setItem('zklogin_data', JSON.stringify({
            address: data.address,
            maxEpoch: data.maxEpoch,
            addressSeed: data.addressSeed,
            salt: data.salt,
          }));
          // Clear URL hash
          window.history.replaceState(null, '', window.location.pathname);
        })
        .catch(err => {
          console.error('Login failed:', err);
          setError(err.message);
        })
        .finally(() => setIsLoading(false));
    } else {
      // Check existing session
      const stored = sessionStorage.getItem('zklogin_data');
      if (stored) {
        const data = JSON.parse(stored);
        setAddress(data.address);
        setZkLoginData(data);
      }
    }
  }, []);
  
  const login = () => {
    setError(null);
    initiateLogin().catch(err => {
      setError(err.message);
    });
  };
  
  const logout = () => {
    sessionStorage.removeItem('zklogin_data');
    sessionStorage.removeItem('ephemeral_keypair');
    sessionStorage.removeItem('randomness');
    sessionStorage.removeItem('max_epoch');
    setAddress(null);
    setZkLoginData(null);
    setError(null);
  };
  
  const signAndExecuteTransaction = async (tx: Transaction) => {
    if (!zkLoginData) {
      throw new Error('Not authenticated');
    }
    
    try {
      setIsLoading(true);
      const result = await executeTransaction(tx, zkLoginData);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isAuthenticated: !!address,
    address,
    isLoading,
    error,
    login,
    logout,
    signAndExecuteTransaction,
  };
}

// Usage in component
function LoginButton() {
  const { 
    isAuthenticated, 
    address, 
    isLoading, 
    error, 
    login, 
    logout 
  } = useZkLogin();
  
  if (isLoading) {
    return <button disabled>Loading...</button>;
  }
  
  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={login}>Try Again</button>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return (
      <div>
        <p>Logged in as: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }
  
  return (
    <button onClick={login}>
      <img src="/google-logo.svg" alt="Google" />
      Sign in with Google
    </button>
  );
}

// Example: Send a transaction
function SendTransaction() {
  const { signAndExecuteTransaction, isAuthenticated } = useZkLogin();
  
  const handleSend = async () => {
    if (!isAuthenticated) return;
    
    try {
      const tx = new Transaction();
      
      // Example: Split coins
      const [coin] = tx.splitCoins(tx.gas, [1000]);
      tx.transferObjects([coin], '0xRecipientAddress');
      
      const result = await signAndExecuteTransaction(tx);
      console.log('Transaction successful:', result);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };
  
  return (
    <button onClick={handleSend} disabled={!isAuthenticated}>
      Send Transaction
    </button>
  );
}
```

### Salt Management Best Practices

**Critical**: The salt is essential for deriving the zkLogin address. Loss of the salt means loss of access to the wallet.

#### Option 1: Client-Side Storage
```typescript
// Store in localStorage (for demo/testing only)
localStorage.setItem(`zklogin_salt_${userId}`, salt);

// ⚠️ Risk: Users lose access if they clear browser data or change devices
```

#### Option 2: Backend Service
```typescript
// Store in your database
async function storeSalt(userId: string, salt: string) {
  await fetch('/api/user/salt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, salt }),
  });
}

// Retrieve from database
async function getSalt(userId: string): Promise<string> {
  const response = await fetch(`/api/user/salt/${userId}`);
  return response.json();
}
```

#### Option 3: Derived from Master Seed (Recommended for Production)
```typescript
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

// Use HKDF to derive salt from master seed
function deriveSalt(
  masterSeed: string,
  iss: string,
  aud: string,
  sub: string
): string {
  const ikm = Buffer.from(masterSeed, 'hex');
  const salt = Buffer.from(`${iss}${aud}`);
  const info = Buffer.from(sub);
  
  const derived = hmac(sha256, salt, hmac(sha256, ikm, info));
  return derived.toString('hex');
}

// ⚠️ Note: Cannot rotate master seed or change client ID
// Different values = different address = loss of funds
```

#### Option 4: Mysten Labs Salt Service
```typescript
// Requires whitelisting - contact Mysten Labs
async function getMystenSalt(jwt: string): Promise<string> {
  const response = await fetch('https://salt.api.mystenlabs.com/get_salt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: jwt }),
  });
  
  const data = await response.json();
  return data.salt;
}
```

### Security Considerations

1. **Ephemeral Key Storage**
   - ✅ Use `sessionStorage` (cleared when browser closes)
   - ❌ Don't use `localStorage` (persists indefinitely)
   - ❌ Never expose ephemeral private key

2. **Salt Security**
   - Salt compromise → links OAuth ID to on-chain address (privacy leak)
   - Salt compromise ≠ loss of funds (still need OAuth access)
   - Always backup salt securely

3. **ZK Proof Caching**
   - Cache proof for the session (until maxEpoch)
   - Reuse proof for multiple transactions
   - Regenerate when epoch expires

4. **CORS Handling**
   - Prover calls should go through your backend
   - Avoid exposing sensitive data in frontend

### Production Checklist

- [ ] Run your own prover service (16+ cores, 16GB+ RAM recommended)
- [ ] Implement secure salt management (backend service)
- [ ] Use dedicated RPC nodes (not public endpoints)
- [ ] Handle OAuth errors gracefully
- [ ] Implement epoch expiration handling
- [ ] Add transaction retry logic
- [ ] Monitor prover performance (3-5 seconds per proof)
- [ ] Set up proper error logging
- [ ] Test salt recovery flow
- [ ] Document salt backup process for users

### Resources

- [Official zkLogin Documentation](https://docs.sui.io/concepts/cryptography/zklogin)
- [zkLogin Integration Guide](https://docs.sui.io/guides/developer/cryptography/zklogin-integration)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Working Demo](https://github.com/juzybits/polymedia-zklogin-demo)
- [zkLogin Research Paper](https://arxiv.org/abs/2401.11735)
```