# zkLogin Setup Guide

This guide walks you through setting up zkLogin with Google OAuth for the Sui Patreon platform.

## Prerequisites

- Node.js 18+ installed
- A Google Cloud Platform account
- Basic understanding of OAuth 2.0

## Step 1: Set Up Google OAuth

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API for your project

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (or Internal if using Google Workspace)
3. Fill in the required information:
   - **App name**: Sui Patreon
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (for development)
6. Save and continue

### 1.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Sui Patreon Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - Your production domain (when deployed)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for development)
     - Your production callback URL (when deployed)
5. Click **Create**
6. **Copy the Client ID** - you'll need this for the next step

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your values:
   ```env
   # Google OAuth Client ID from Step 1.3
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com

   # Sui Network (testnet, devnet, or mainnet)
   NEXT_PUBLIC_SUI_NETWORK=testnet

   # Sui RPC URL
   NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

   # Application URL (update for production)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 3: Install Dependencies

Dependencies are already installed if you've run `npm install`, but ensure these are present:

```bash
npm install @mysten/sui @mysten/zklogin @mysten/dapp-kit
```

## Step 4: Test the zkLogin Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Click the "Log in with Google" button

4. Complete the Google OAuth flow

5. You should be redirected back to the app with a Sui address derived from your Google account

## How zkLogin Works

### The Flow

1. **User clicks login** → App generates an ephemeral keypair and nonce
2. **User redirected to Google** → User authenticates with Google
3. **Google returns JWT** → Callback page receives JWT token
4. **Generate ZK proof** → App requests proof from Mysten Labs prover
5. **Derive Sui address** → Address is derived from JWT and user salt
6. **User is logged in** → Can now sign transactions with zkLogin

### Key Concepts

- **Ephemeral Keypair**: Temporary key pair valid for ~2 epochs (2-4 days)
- **Nonce**: Cryptographic value linking the ephemeral key to the OAuth flow
- **JWT (JSON Web Token)**: Contains user identity from Google
- **Zero-Knowledge Proof**: Proves you have valid JWT without revealing it
- **User Salt**: Deterministic value ensuring consistent address derivation
- **zkLogin Signature**: Combines ephemeral signature + ZK proof for transactions

### Security Features

- **No Private Keys**: Users don't manage traditional private keys
- **Privacy**: OAuth provider doesn't know your Sui address
- **Blockchain Privacy**: Blockchain doesn't know your OAuth identity
- **Session-Based**: Ephemeral keys stored in sessionStorage (clears on close)

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         │ 1. Click Login
         ▼
┌─────────────────────────┐
│   LoginButton.tsx       │
│  - Generate keypair     │
│  - Create nonce         │
│  - Build OAuth URL      │
└────────┬────────────────┘
         │
         │ 2. Redirect to Google
         ▼
┌─────────────────────────┐
│   Google OAuth          │
│  - User authenticates   │
│  - Returns JWT in URL   │
└────────┬────────────────┘
         │
         │ 3. Redirect to /auth/callback
         ▼
┌─────────────────────────┐
│   AuthCallback.tsx      │
│  - Extract JWT          │
│  - Get user salt        │
│  - Request ZK proof     │
│  - Derive Sui address   │
│  - Update user context  │
└────────┬────────────────┘
         │
         │ 4. Redirect home (logged in)
         ▼
┌─────────────────────────┐
│   HomePage              │
│  - User authenticated   │
│  - Can sign txs         │
└─────────────────────────┘
```

## Production Considerations

### User Salt Management

**Current Implementation** (Development Only):
- Salt is derived deterministically from the user's OAuth subject ID
- Stored in sessionStorage
- **NOT SECURE FOR PRODUCTION**

**Production Requirements**:
You MUST implement a backend service that:
1. Validates the JWT from OAuth
2. Stores a unique, random salt for each user in your database
3. Returns the same salt for the same user on subsequent logins
4. Never exposes salt generation logic to the client

Example backend API endpoint:
```typescript
// /api/zklogin/salt
export async function POST(request: Request) {
  const { jwt } = await request.json();
  
  // Validate JWT
  const decoded = validateJwt(jwt);
  
  // Get or create salt for user
  const salt = await db.getSaltForUser(decoded.sub);
  
  return Response.json({ salt });
}
```

### Proving Service

**Current Implementation**:
- Uses Mysten Labs public proving service
- Free tier available
- May have rate limits

**Production Options**:
1. **Mysten Labs Service** (Recommended for most apps)
   - Managed and maintained
   - Auto-scaling
   - Contact Mysten Labs for enterprise plans

2. **Self-Hosted Prover** (For high-volume apps)
   - Requires significant computational resources (16+ cores, 64GB+ RAM)
   - See [Sui zkLogin docs](https://docs.sui.io/guides/developer/cryptography/zklogin-integration#run-the-proving-service-in-your-backend) for setup

### Environment Variables for Production

Update your production environment variables:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-production-client-id
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### OAuth Redirect URIs

Remember to add your production URLs to Google Cloud Console:
- Authorized JavaScript origins: `https://your-production-domain.com`
- Authorized redirect URIs: `https://your-production-domain.com/auth/callback`

## Troubleshooting

### "Missing configuration" Error
- Ensure `.env.local` exists and contains all required variables
- Restart the dev server after creating/modifying `.env.local`

### "Failed to generate zero-knowledge proof"
- Check network connectivity
- Verify JWT is valid
- Try again (proving service might be temporarily unavailable)

### "Invalid JWT token"
- JWT might be expired (valid for ~1 hour)
- Try logging in again

### Redirect Loop
- Verify redirect URI in Google Cloud Console matches exactly
- Check for CORS issues in browser console

### Address Changes on Each Login
- User salt is not consistent
- Implement proper backend salt management (see Production Considerations)

## Additional Resources

- [Sui zkLogin Documentation](https://docs.sui.io/guides/developer/cryptography/zklogin-integration)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Mysten Labs zkLogin GitHub](https://github.com/MystenLabs/sui/tree/main/sdk/zklogin)

## Support

For issues specific to:
- **This implementation**: Check the console logs and verify environment variables
- **zkLogin**: [Sui Discord #zklogin channel](https://discord.gg/sui)
- **Google OAuth**: [Google OAuth Support](https://developers.google.com/identity/protocols/oauth2)

