# zkLogin Troubleshooting Guide

This guide helps you resolve common issues with zkLogin implementation.

## Common Errors

### 1. "429 Too Many Requests" from Prover Service

**Symptom:**
```
Error: Prover returned 429: TooManyRequestsError
Same JWT submitted multiple times within 5 sec
```

**Causes:**
- React Strict Mode in development (calls effects twice)
- User clicking login button multiple times
- Multiple browser tabs open
- Page refreshing during OAuth flow

**Solution:**
✅ **Already Fixed!** The implementation now includes:
- Request deduplication (prevents duplicate prover calls)
- Proof caching (reuses existing proofs)
- React Strict Mode protection (cleanup function)

**If you still see this:**
1. Wait 10-15 seconds before trying again
2. Clear browser sessionStorage: `sessionStorage.clear()`
3. Close all other tabs
4. Try login again

**For Development:**
You can temporarily disable React Strict Mode:
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Remove <React.StrictMode> wrapper */}
      <body>{children}</body>
    </html>
  );
}
```

---

### 2. "Missing configuration" Error

**Symptom:**
```
Error: Missing configuration: NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

**Solution:**
1. Create `.env.local` file in web directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Google OAuth Client ID:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. **Restart the dev server** (required after env changes):
   ```bash
   npm run dev
   ```

---

### 3. "redirect_uri_mismatch" from Google

**Symptom:**
Google shows error: "Error 400: redirect_uri_mismatch"

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click your OAuth Client ID
4. Verify **Authorized redirect URIs** includes:
   ```
   http://localhost:3000/auth/callback
   ```
   (Must match EXACTLY, including the port)

5. For production, add:
   ```
   https://yourdomain.com/auth/callback
   ```

---

### 4. "No JWT token found in callback URL"

**Symptom:**
Redirected to `/auth/callback` but error shows no JWT

**Causes:**
- Google OAuth not configured correctly
- User cancelled OAuth flow
- Browser blocked popup/redirect
- Cookie/storage blocked

**Solution:**
1. Check browser console for errors
2. Verify OAuth consent screen is configured
3. Check if browser allows redirects
4. Try incognito/private browsing
5. Verify redirect URI is correct

---

### 5. "Failed to generate zero-knowledge proof"

**Symptom:**
```
Error: Failed to generate zero-knowledge proof. Please try again.
```

**Causes:**
- Network connectivity issues
- Prover service temporarily down
- Invalid JWT format
- JWT expired (JWTs expire in ~1 hour)

**Solution:**
1. Check internet connection
2. Wait a few seconds and try again
3. If JWT expired, start login flow again
4. Check browser console for detailed error
5. Verify you're using testnet (not devnet for production keys)

---

### 6. Address Changes on Each Login

**Symptom:**
Different Sui address every time you log in

**Cause:**
This is **expected in development mode**. The demo implementation uses a deterministic but not persistent salt.

**Solution:**
For production, implement a backend salt service:

```typescript
// backend/api/zklogin/salt/route.ts
export async function POST(request: Request) {
  const { jwt } = await request.json();
  
  // Validate JWT
  const decoded = await validateJWT(jwt);
  
  // Get or create salt for user
  const salt = await db.users.findOrCreate({
    where: { oauthSub: decoded.sub },
    defaults: { salt: generateRandomSalt() }
  });
  
  return Response.json({ salt: salt.value });
}
```

---

### 7. "Invalid JWT token"

**Symptom:**
```
Error: Invalid JWT token
```

**Causes:**
- JWT has expired (they last ~1 hour)
- JWT corrupted during URL parsing
- JWT not properly Base64 encoded

**Solution:**
1. Try logging in again (get fresh JWT)
2. Check browser console for JWT value
3. Test JWT at [jwt.io](https://jwt.io)
4. Clear sessionStorage and retry

---

### 8. Session Lost on Page Refresh

**Symptom:**
User logged out after refreshing page

**Cause:**
Using `localStorage` instead of `sessionStorage`, or session data cleared

**Solution:**
✅ **Already implemented correctly** - using sessionStorage

If sessions still clear:
1. Check if browser is in private/incognito mode
2. Verify browser allows sessionStorage
3. Check if browser extensions are clearing storage
4. Ensure ephemeral key hasn't expired (check current epoch)

---

### 9. CORS Errors

**Symptom:**
```
Access to fetch at 'https://prover-dev.mystenlabs.com/v1' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:**
This should not happen with the Mysten Labs prover, but if it does:

1. Check if you're using correct prover URL
2. Verify you're making POST request (not GET)
3. Check if VPN/proxy is interfering
4. Try different network

---

## Development Tips

### Enable Debug Logging

Add console logs to track zkLogin flow:

```typescript
// In auth.ts, add logging
console.log('Step 1: Begin zkLogin');
console.log('Step 2: JWT received', jwt);
console.log('Step 3: Salt generated', userSalt);
console.log('Step 4: Proof received', proof);
console.log('Step 5: Address derived', address);
```

### Check Session Storage

View current zkLogin session:
```javascript
// In browser console
console.log('Ephemeral keypair:', sessionStorage.getItem('zklogin_ephemeral_keypair'));
console.log('ZK proof:', sessionStorage.getItem('zklogin_proof'));
console.log('User address:', sessionStorage.getItem('zklogin_user_address'));
console.log('Max epoch:', sessionStorage.getItem('zklogin_max_epoch'));
```

### Clear All Session Data

If something is stuck:
```javascript
// In browser console
sessionStorage.clear();
location.reload();
```

### Test Different Networks

Switch between Sui networks:
```env
# In .env.local

# Testnet (recommended for development)
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Devnet (for testing)
NEXT_PUBLIC_SUI_NETWORK=devnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.devnet.sui.io:443

# Mainnet (production only)
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

---

## Prover Service Issues

### Check Prover Status

Test if prover is accessible:
```bash
curl -X POST https://prover-dev.mystenlabs.com/v1 \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: Error response (but proves it's reachable)

### Rate Limits

Mysten Labs prover has rate limits:
- **Same JWT**: Max 1 request per 5 seconds
- **Per IP**: Check with Mysten Labs for limits
- **Proof generation**: ~2-5 seconds per request

**For high-volume apps**, consider:
1. Self-hosting prover (requires beefy server)
2. Contact Mysten Labs for enterprise tier
3. Implement better client-side caching

---

## Google OAuth Issues

### Test Users

During development, only added test users can log in:
1. Go to Google Cloud Console
2. OAuth consent screen > Test users
3. Add user emails

### Production Publishing

To allow all users:
1. Complete OAuth consent screen
2. Submit for verification
3. Wait for Google approval

### Scopes

Required scopes:
- `openid` - Required
- `email` - For email address
- `profile` - For name and picture

---

## Network & Performance

### Slow Proof Generation

Proof generation takes 2-5 seconds normally. If slower:
1. Check network speed
2. Try different network (WiFi vs mobile)
3. Contact Mysten Labs about prover status

### Timeout Errors

If requests timeout:
1. Increase timeout in fetch call (default varies)
2. Check network stability
3. Verify firewall not blocking requests

---

## Production Checklist

Before deploying:

- [ ] Implement backend salt service
- [ ] Add server-side JWT validation
- [ ] Update OAuth with production URLs
- [ ] Test with real users
- [ ] Add monitoring and error tracking
- [ ] Set up rate limiting
- [ ] Configure proper error messages
- [ ] Test on multiple devices/browsers
- [ ] Verify HTTPS is working
- [ ] Test logout functionality

---

## Getting Help

### Still Stuck?

1. **Check Browser Console**: Often shows detailed errors
2. **Review Documentation**: See `ZKLOGIN_SETUP.md` and `ZKLOGIN_IMPLEMENTATION.md`
3. **Test with Example**: Try official Sui zkLogin examples
4. **Sui Discord**: Join #zklogin channel at https://discord.gg/sui
5. **GitHub Issues**: Check Sui SDK issues

### Useful Commands

```bash
# Check if dev server is running
curl http://localhost:3000

# View environment variables (Next.js only shows NEXT_PUBLIC_* in browser)
npm run dev
# Then check browser console: console.log(process.env)

# Rebuild and clear cache
rm -rf .next
npm run dev

# Check Sui network status
curl https://fullnode.testnet.sui.io:443

# Test TypeScript compilation
npx tsc --noEmit
```

### Report a Bug

Include:
1. Error message (full stack trace)
2. Browser console logs
3. Network tab screenshot
4. Steps to reproduce
5. Browser/OS version
6. Environment variables (without sensitive values)

---

## Quick Fixes Summary

| Error | Quick Fix |
|-------|-----------|
| 429 Too Many Requests | Wait 15 seconds, clear sessionStorage, retry |
| Missing configuration | Create `.env.local`, add `GOOGLE_CLIENT_ID` |
| redirect_uri_mismatch | Add exact callback URL to Google Console |
| No JWT in callback | Check OAuth setup, verify redirect URI |
| Failed ZK proof | Check network, wait and retry |
| Address changes | Expected in dev, implement salt service for production |
| Invalid JWT | Start fresh login flow |
| CORS error | Check network, prover URL |
| Session lost | Check browser settings, verify sessionStorage enabled |

---

**Remember**: Most errors are configuration-related. Double-check your `.env.local` and Google OAuth settings first!

