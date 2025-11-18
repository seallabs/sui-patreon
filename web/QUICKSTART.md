# zkLogin Quick Start Guide

Get up and running with zkLogin in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or bun package manager
- A Google account

## Step 1: Install Dependencies (Already Done! ✅)

The required packages are already installed:
- `@mysten/sui` (v1.45.0)
- `@mysten/zklogin` (v0.8.1)
- `@mysten/dapp-kit` (v0.19.9)

## Step 2: Set Up Google OAuth (5 minutes)

### A. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Set **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   ```
7. Click **Create** and copy your **Client ID**

### B. Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Choose **External** (or Internal for Google Workspace)
3. Fill in:
   - App name: `Sui Patreon`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `openid`, `email`, `profile`
5. Add your email as a test user
6. Save

## Step 3: Configure Environment

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your Client ID:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   NEXT_PUBLIC_SUI_NETWORK=testnet
   NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 4: Test It!

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click **"Log in with Google"**

4. Complete the Google OAuth flow

5. You'll be redirected back and logged in! 🎉

## Verify Success

After logging in, check:
- ✅ Browser console shows your Sui address
- ✅ Browser sessionStorage contains zkLogin data
- ✅ Page shows you're logged in
- ✅ Can refresh page and stay logged in

To view your Sui address:
```javascript
// In browser console:
sessionStorage.getItem('zklogin_user_address')
```

## What Just Happened?

1. **Ephemeral keypair** was generated and stored in sessionStorage
2. **Nonce** was created from the keypair
3. You authenticated with **Google OAuth**
4. Google returned a **JWT token**
5. A **zero-knowledge proof** was generated (by Mysten Labs)
6. Your **Sui address** was derived from the JWT
7. You're now logged in and can sign transactions!

## Next Steps

### For Development
- ✅ You're ready to develop!
- Use `signAndExecuteZkLoginTransaction()` when smart contracts are ready
- Test logout with the logout button

### For Production (Before Deploying)
- ⚠️ **Implement backend salt service** (see ZKLOGIN_SETUP.md)
- ⚠️ **Add JWT validation**
- ⚠️ **Update OAuth credentials** with production URLs
- ⚠️ **Add monitoring and error tracking**

## Troubleshooting

### "Missing configuration" error
→ Make sure `.env.local` exists with valid `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
→ Restart dev server after creating `.env.local`

### "redirect_uri_mismatch" from Google
→ Verify redirect URI in Google Console matches exactly:
```
http://localhost:3000/auth/callback
```

### "Failed to generate proof"
→ Check network connection
→ Wait a few seconds and try again
→ Verify JWT is valid (not expired)

### Address changes on each login
→ This is expected in demo mode (deterministic salt)
→ In production, implement backend salt service for consistent addresses

## Documentation

- **Detailed Setup**: See `ZKLOGIN_SETUP.md`
- **Implementation Details**: See `ZKLOGIN_IMPLEMENTATION.md`
- **API Reference**: See `src/lib/zklogin/README.md`
- **Sui Official Docs**: https://docs.sui.io/guides/developer/cryptography/zklogin-integration

## Key Files

```
web/
├── src/
│   ├── lib/zklogin/           # Core zkLogin implementation
│   │   ├── auth.ts           # Authentication logic
│   │   ├── config.ts         # Configuration
│   │   ├── storage.ts        # Session storage
│   │   └── index.ts          # Public API
│   ├── components/auth/
│   │   ├── login-button.tsx  # Login button (updated)
│   │   └── logout-button.tsx # Logout button (new)
│   └── app/auth/callback/
│       └── page.tsx          # OAuth callback handler
└── .env.local                # Your credentials (create this!)
```

## Using zkLogin in Your Code

```typescript
// Start login
import { beginZkLogin } from '@/lib/zklogin';
const { loginUrl } = await beginZkLogin();
window.location.href = loginUrl;

// Logout
import { logout } from '@/lib/zklogin';
logout();

// Sign transaction
import { signAndExecuteZkLoginTransaction } from '@/lib/zklogin';
const digest = await signAndExecuteZkLoginTransaction(tx, userAddress);

// Get current address
import { getUserAddress } from '@/lib/zklogin';
const address = getUserAddress();
```

## Support

- **Setup Issues**: See `ZKLOGIN_SETUP.md` troubleshooting section
- **Sui zkLogin**: Discord #zklogin channel
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2

---

**Ready to go?** Start the dev server and click that login button! 🚀

