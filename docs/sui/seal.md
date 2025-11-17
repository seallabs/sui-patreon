## 2. Seal (Encryption & Access Control)

### Overview
Seal is a decentralized secrets management service that provides client-side encryption with on-chain access control policies.

### Key Features
- **Client-Side Encryption**: Data encrypted before leaving device
- **Threshold Encryption**: t-out-of-n key server model
- **On-Chain Policies**: Move smart contracts enforce access
- **IBE Cryptography**: Identity-Based Encryption
- **Storage Agnostic**: Works with any storage solution

### Architecture

```
┌─────────────┐
│   Client    │
│             │
│ 1. Encrypt  │ ──────┐
└─────────────┘       │
                      │ Encrypted Data
                      ↓
              ┌───────────────┐
              │    Walrus     │
              │   (Storage)   │
              └───────────────┘

┌─────────────┐       ┌──────────────┐
│   Client    │       │ Sui Blockchain│
│             │       │               │
│ 2. Request  │ ───── │ 3. Verify     │
│    Access   │       │    Policy     │
└─────────────┘       └──────────────┘
      │                       │
      │ 4. If approved        │
      ↓                       ↓
┌─────────────────────────────────────┐
│         Key Servers (t-out-of-n)    │
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │ Server │  │ Server │  │ Server ││
│  │   1    │  │   2    │  │   3    ││
│  └────────┘  └────────┘  └────────┘│
│                                     │
│  5. Generate decryption key         │
└─────────────────────────────────────┘
      │
      │ 6. Decrypt client-side
      ↓
┌─────────────┐
│   Client    │
│             │
│ 7. View     │
│    Content  │
└─────────────┘
```

### Installation

```bash
npm install @mystenlabs/seal-sdk
```

### Seal SDK Usage

```typescript
import { SealClient } from '@mystenlabs/seal-sdk';
import { SuiClient } from '@mysten/sui.js/client';

// Initialize Seal client
const seal = new SealClient({
  suiClient: new SuiClient({ url: getFullnodeUrl('testnet') }),
  network: 'testnet',
});

// Encrypt content
async function encryptContent(
  content: Uint8Array,
  policyId: string
): Promise<Uint8Array> {
  const encrypted = await seal.encrypt(content, {
    policyId: policyId,
  });
  
  return encrypted;
}

// Decrypt content
async function decryptContent(
  encrypted: Uint8Array,
  subscriptionNFT: string,
  keypair: Ed25519Keypair
): Promise<Uint8Array> {
  // Build transaction to verify subscription
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::access_policy::seal_approve`,
    arguments: [
      tx.object(subscriptionNFT),
      tx.object(policyId),
    ],
  });
  
  // Sign and execute to get approval
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
  
  // Request decryption from Seal
  const decrypted = await seal.decrypt(encrypted, {
    txDigest: result.digest,
  });
  
  return decrypted;
}
```

### Access Policy in Move

```move
module creator_platform::access_policy {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use std::option::{Self, Option};
    
    struct AccessPolicy has key {
        id: UID,
        creator: address,
        policy_type: u8, // 0=subscription, 1=payment, 2=whitelist
        required_tier: Option<ID>,
        valid_from: Option<u64>,
        valid_until: Option<u64>,
        whitelist: vector<address>,
    }
    
    // Called by Seal to verify access
    public fun seal_approve(
        policy: &AccessPolicy,
        subscription: &ActiveSubscription,
        ctx: &TxContext
    ): bool {
        // Verify subscription is active
        let current_epoch = tx_context::epoch(ctx);
        if (subscription.expires_at < current_epoch) {
            return false
        };
        
        // Verify tier matches if specified
        if (option::is_some(&policy.required_tier)) {
            let required = option::borrow(&policy.required_tier);
            if (subscription.tier_id != *required) {
                return false
            }
        };
        
        // Verify time bounds
        if (option::is_some(&policy.valid_from)) {
            if (*option::borrow(&policy.valid_from) > current_epoch) {
                return false
            }
        };
        
        if (option::is_some(&policy.valid_until)) {
            if (*option::borrow(&policy.valid_until) < current_epoch) {
                return false
            }
        };
        
        true
    }
}
```

### Integration Pattern

```typescript
// Complete flow: Upload encrypted content
async function uploadSecureContent(
  file: File,
  tierIds: string[],
  keypair: Ed25519Keypair
) {
  // 1. Read file
  const content = await file.arrayBuffer();
  const contentBytes = new Uint8Array(content);
  
  // 2. Create access policy on Sui
  const tx = new TransactionBlock();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_policy::create_policy`,
    arguments: [
      tx.pure(tierIds),
    ],
  });
  
  const policyResult = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
  
  const policyId = extractObjectId(policyResult);
  
  // 3. Encrypt content
  const encrypted = await seal.encrypt(contentBytes, {
    policyId: policyId,
  });
  
  // 4. Upload to Walrus
  const blobId = await walrus.upload(encrypted);
  
  // 5. Store metadata on Sui
  const contentTx = new TransactionBlock();
  contentTx.moveCall({
    target: `${PACKAGE_ID}::content::create_content`,
    arguments: [
      contentTx.pure(file.name),
      contentTx.pure(Array.from(blobId)),
      contentTx.pure(policyId),
    ],
  });
  
  await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: contentTx,
  });
  
  return { blobId, policyId };
}
```
