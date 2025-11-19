# Sui TypeScript SDK Guide

## Installation

```bash
npm install @mysten/sui @mysten/walrus @mysten/seal
```

## Core Principles

### 1. Client Initialization Pattern
```typescript
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { WalrusClient } from '@mysten/walrus';
import { SealClient, SessionKey } from '@mysten/seal';

// Network: 'testnet' | 'mainnet' | 'devnet' | 'localnet'
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

// Keypair from private key (Bech32 or hex)
const keypair = Ed25519Keypair.fromSecretKey('suiprivkey1...');

// Walrus for storage
const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
});

// Seal for encryption/access control
const sealObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

const sealClient = new SealClient({
  suiClient,
  serverConfigs: sealObjectIds.map((id) => ({ objectId: id, weight: 1 })),
  verifyKeyServers: false,
});
```

### 2. Transaction Building Pattern
```typescript
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

const tx = new Transaction();

// Move call structure
tx.moveCall({
  target: `${PACKAGE_ID}::module::function`,
  arguments: [
    tx.object(registryId),           // Object reference
    tx.pure.string('value'),         // String primitive
    tx.pure.u64(12345),              // Number primitive
    tx.pure.id(objectId),            // ID type
    tx.pure.address(walletAddress),  // Address type
    tx.pure.vector('id', [id1, id2]), // Vector of IDs
    tx.object(SUI_CLOCK_OBJECT_ID),  // Clock for timestamps
  ],
});
```

### 3. Type Mapping (Move ↔ TypeScript)
```typescript
// Move Type          → TypeScript Method
// ------------------------------------
// String             → tx.pure.string(value)
// u8/u64/u128        → tx.pure.u8/u64/u128(value)
// address            → tx.pure.address(value)
// ID                 → tx.pure.id(value)
// vector<ID>         → tx.pure.vector('id', array)
// vector<u8>         → tx.pure.vector('u8', array)
// Object<T>          → tx.object(objectId)
// &Clock             → tx.object(SUI_CLOCK_OBJECT_ID)
```

## Transaction Execution Patterns

### Backend (Node.js) - Direct Signing
```typescript
const result = await suiClient.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: {
    showObjectChanges: true,
    showEffects: true,
    showEvents: true,
  },
});

console.log('Digest:', result.digest);
console.log('Events:', result.events);
console.log('Created:', result.objectChanges?.filter(c => c.type === 'created'));
```

### Frontend (React) - zkLogin with Hook
```typescript
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

const { digest } = await signAndExecuteTransaction({
  transaction: tx,
});
```

### Frontend (React) - Walrus Multi-Step Flow
```typescript
// Step 1: Encode (instant)
const flow = walrusClient.writeFilesFlow({ files });
await flow.encode();

// Step 2: Register (requires user signature)
const registerTx = flow.register({
  epochs: 3,
  owner: userAddress,
  deletable: true,
});
const { digest: registerDigest } = await signAndExecuteTransaction({
  transaction: registerTx,
});

// Step 3: Upload to storage nodes
await flow.upload({ digest: registerDigest });

// Step 4: Certify (requires user signature)
const certifyTx = flow.certify();
await signAndExecuteTransaction({ transaction: certifyTx });

// Get uploaded files
const files = await flow.listFiles();
```

## Real Contract Examples

### Create Profile
```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::profile::create_profile`,
  arguments: [
    tx.object(PROFILE_REGISTRY),
    tx.pure.string('alice.sui'),           // name
    tx.pure.string('Digital creator'),     // bio
    tx.pure.string('https://...jpg'),      // avatarUrl
    tx.object(SUI_CLOCK_OBJECT_ID),
  ],
});

const result = await suiClient.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### Create Subscription Tier
```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::subscription::create_tier`,
  arguments: [
    tx.object(TIER_REGISTRY),
    tx.pure.string('Premium'),
    tx.pure.string('Access to all content'),
    tx.pure.u64(10_000_000),  // 10 USDC (6 decimals)
    tx.object(SUI_CLOCK_OBJECT_ID),
  ],
});
```

### Purchase Subscription
```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::subscription::purchase_subscription`,
  arguments: [
    tx.object(TIER_REGISTRY),
    tx.pure.address(creatorAddress),
    tx.pure.id(tierId),
    tx.object(paymentCoinId),  // USDC coin object
    tx.object(SUI_CLOCK_OBJECT_ID),
  ],
});
```

### Create Content
```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::content::create_content`,
  arguments: [
    tx.object(CONTENT_REGISTRY),
    tx.pure.u64(1),                           // nonce
    tx.pure.string('Video Title'),
    tx.pure.string('Description'),
    tx.pure.string('video/mp4'),              // contentType
    tx.pure.string(previewPatchId),           // preview
    tx.pure.string(sealedPatchId),            // sealed (encrypted)
    tx.pure.vector('id', [tierId1, tierId2]), // access control
    tx.object(SUI_CLOCK_OBJECT_ID),
  ],
});
```

## Walrus Integration Patterns

### Upload with Encryption
```typescript
import { WalrusFile } from '@mysten/walrus';

// 1. Encrypt content with Seal
const { encryptedObject } = await sealClient.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: computeContentId(nonce),
  data: contentBytes,
});

// 2. Create WalrusFile
const file = WalrusFile.from({
  contents: encryptedObject,
  identifier: 'content.enc',
  tags: { 'content-type': 'application/encrypted' },
});

// 3. Upload flow
const flow = walrusClient.writeFilesFlow({ files: [file] });
await flow.encode();

const registerTx = flow.register({
  epochs: 3,
  owner: address,
  deletable: true,
});

const { digest } = await suiClient.signAndExecuteTransaction({
  transaction: registerTx,
  signer: keypair,
});

await flow.upload({ digest });

const certifyTx = flow.certify();
await suiClient.signAndExecuteTransaction({
  transaction: certifyTx,
  signer: keypair,
});
```

### Download and Decrypt
```typescript
import { EncryptedObject } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';

// 1. Get content metadata from Sui
const content = await suiClient.getObject({
  id: contentId,
  options: { showContent: true },
});

const patchId = (content.data?.content as any).fields.sealed_patch_id;

// 2. Download from Walrus
const [patch] = await walrusClient.getFiles({ ids: [patchId] });
const encryptedBytes = await patch.bytes();

// 3. Build approval transaction
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::content::seal_approve`,
  arguments: [
    tx.pure.vector('u8', fromHex(EncryptedObject.parse(encryptedBytes).id)),
    tx.object(contentId),
    tx.object(subscriptionId),
    tx.object(SUI_CLOCK_OBJECT_ID),
  ],
});

const txBytes = await tx.build({
  client: suiClient,
  onlyTransactionKind: true,
});

// 4. Decrypt with Seal
const decryptedBytes = await sealClient.decrypt({
  data: encryptedBytes,
  sessionKey,
  txBytes,
});

const result = new TextDecoder('utf-8').decode(new Uint8Array(decryptedBytes));
```

## Seal Session Management

```typescript
import { SessionKey } from '@mysten/seal';

// Create session key
const sessionKey = await SessionKey.create({
  address: keypair.toSuiAddress(),
  packageId: PACKAGE_ID,
  ttlMin: 10,  // 10 minute lifetime
  suiClient,
});

// Sign personal message (user confirms in wallet)
const message = sessionKey.getPersonalMessage();
const { signature } = await keypair.signPersonalMessage(message);
sessionKey.setPersonalMessageSignature(signature);

// Now ready for decrypt operations
```

## Query Patterns

### Get Owned Objects by Type
```typescript
const objects = await suiClient.getOwnedObjects({
  owner: address,
  filter: {
    StructType: `${PACKAGE_ID}::profile::CreatorProfile`,
  },
  options: {
    showContent: true,
    showType: true,
  },
});
```

### Get Object Details
```typescript
const object = await suiClient.getObject({
  id: objectId,
  options: {
    showContent: true,
    showOwner: true,
    showType: true,
  },
});

const fields = (object.data?.content as any)?.fields;
```

### Subscribe to Events
```typescript
const unsubscribe = await suiClient.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::profile::ProfileCreated`,
  },
  onMessage: (event) => {
    console.log('New profile:', event.parsedJson);
  },
});
```

## Error Handling

```typescript
try {
  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
} catch (error: any) {
  if (error.message?.includes('InsufficientBalance')) {
    console.error('Not enough SUI for gas');
  } else if (error.message?.includes('ObjectNotFound')) {
    console.error('Object does not exist');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

## Environment Configuration

```bash
# .env
PRIVATE_KEY=suiprivkey1...
PACKAGE_ID=0x...
PROFILE_REGISTRY=0x...
TIER_REGISTRY=0x...
CONTENT_REGISTRY=0x...
SUI_NETWORK=testnet
```

```typescript
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  PACKAGE_ID: process.env.PACKAGE_ID!,
  PROFILE_REGISTRY: process.env.PROFILE_REGISTRY!,
  TIER_REGISTRY: process.env.TIER_REGISTRY!,
  CONTENT_REGISTRY: process.env.CONTENT_REGISTRY!,
  NETWORK: (process.env.SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet',
};
```

## Utility Helpers

### Extract Created Objects
```typescript
function extractCreatedObjects(result: any) {
  if (!result.objectChanges) return [];

  return result.objectChanges
    .filter((c: any) => c.type === 'created')
    .map((c: any) => ({
      type: c.objectType.split('::').pop(),
      id: c.objectId,
    }));
}
```

### Parse Events
```typescript
function parseEvents(result: any) {
  if (!result.events) return [];

  return result.events.map((event: any) => ({
    type: event.type.split('::').pop(),
    data: event.parsedJson,
  }));
}
```

### Compute Content ID for Seal
```typescript
import { fromHex, toHex } from '@mysten/sui/utils';

function computeContentId(nonce: number, address: string): string {
  const nonceBytes = new Uint8Array(8);
  new DataView(nonceBytes.buffer).setBigUint64(0, BigInt(nonce), true);

  const addressBytes = fromHex(address);
  return toHex(new Uint8Array([...addressBytes, ...nonceBytes]));
}
```

## Best Practices

1. **Always use `SUI_CLOCK_OBJECT_ID`** for Move functions requiring `&Clock`
2. **Type safety**: Use `tx.pure.<type>()` methods, not raw `tx.pure()`
3. **Gas management**: Set sender with `tx.setSender(address)` before building
4. **Object changes**: Request `showObjectChanges: true` to track created objects
5. **Events**: Request `showEvents: true` for emitted events
6. **Keypair security**: Never commit private keys, use environment variables
7. **Testnet first**: Always test on testnet before mainnet deployment
8. **Walrus flows**: Use `writeFilesFlow()` for browser (wallet popup friendly)
9. **Seal sessions**: Cache session keys (10min TTL), recreate when expired
10. **Error handling**: Wrap all blockchain calls in try-catch blocks

## Common Pitfalls

❌ **Wrong**: `tx.pure(value)` - no type information
✅ **Correct**: `tx.pure.string(value)` - explicit type

❌ **Wrong**: Using raw bytes for object IDs
✅ **Correct**: `tx.pure.id(objectId)` or `tx.object(objectId)`

❌ **Wrong**: Hardcoding gas budget
✅ **Correct**: Let SDK estimate gas automatically

❌ **Wrong**: Single Walrus call with all operations
✅ **Correct**: Separate register/upload/certify for browser UX

❌ **Wrong**: Storing private keys in code
✅ **Correct**: Use environment variables + wallet integration
