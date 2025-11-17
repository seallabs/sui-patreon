# Corrected Walrus Documentation

```markdown
# 3. Walrus (Decentralized Storage)

## Overview
Walrus is a decentralized blob storage protocol built on Sui blockchain with erasure coding for efficient, fault-tolerant data storage.

## Key Features
- **Erasure Coding**: 4-5x replication factor using RedStuff algorithm
- **High Availability**: 2/3 fault tolerance (Byzantine fault tolerant)
- **Cost Efficient**: Competitive with cloud storage, significantly cheaper than traditional blockchain storage
- **Programmable**: Storage as Sui objects with Move smart contract integration
- **Scalable**: Handles large blobs efficiently with distributed storage nodes

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Walrus Network                       │
│                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Storage │  │ Storage │  │ Storage │         │
│  │ Node 1  │  │ Node 2  │  │ Node 3  │  ...    │
│  └─────────┘  └─────────┘  └─────────┘         │
│       │             │             │              │
│       └─────────────┼─────────────┘              │
│                     │                             │
│         RedStuff Erasure Coding                  │
│         (Split into shards ~2200 nodes)          │
└──────────────────────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────┐
│              Sui Blockchain                       │
│                                                   │
│  • Blob metadata (size, type, ID)               │
│  • Proof of availability                         │
│  • Storage resource tokens                       │
│  • Access control                                │
│  • Certification and registration                │
└──────────────────────────────────────────────────┘
```

## Installation

```bash
# Install both Walrus SDK and Sui SDK
npm install @mysten/walrus @mysten/sui

# For CLI usage (optional)
# Download from official Walrus releases
curl -O https://walrus.storage/walrus-cli
```

## SDK Setup

### Basic Client Setup

```typescript
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Initialize Sui client
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'), // or 'mainnet'
});

// Initialize Walrus client
const walrusClient = new WalrusClient({
  network: 'testnet', // or 'mainnet'
  suiClient,
});

// Setup keypair (needs SUI for gas and WAL for storage)
const keypair = Ed25519Keypair.fromSecretKey('your-secret-key');
```

### With Upload Relay (Recommended for Production)

```typescript
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
  uploadRelay: {
    host: 'https://upload-relay.testnet.walrus.space',
    sendTip: {
      max: 1_000, // Maximum tip in MIST
    },
  },
});
```

**Note**: Upload relay reduces requests from ~2200 to much fewer for writes, making it more efficient for production use.

## Basic Operations

### Upload Blob

```typescript
async function uploadToWalrus(data: Uint8Array): Promise<{
  blobId: string;
  blobObject: any;
}> {
  const result = await walrusClient.writeBlob({
    blob: data,
    epochs: 100, // Storage duration in epochs (~1 day per epoch)
    deletable: true, // Set to false for permanent storage
    signer: keypair,
  });
  
  console.log(`Blob ID: ${result.blobId}`);
  console.log(`Blob Object ID: ${result.blobObject.id.id}`);
  
  return result;
}

// Example: Upload a file
async function uploadFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  const { blobId } = await uploadToWalrus(data);
  return blobId;
}

// Example: Upload text
async function uploadText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const { blobId } = await uploadToWalrus(data);
  return blobId;
}
```

### Download Blob

```typescript
async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    const blob = await walrusClient.readBlob({ blobId });
    return blob;
  } catch (error) {
    if (error instanceof RetryableWalrusClientError) {
      // Handle epoch transition errors
      walrusClient.reset();
      return await walrusClient.readBlob({ blobId });
    }
    throw error;
  }
}

// Example: Download as text
async function downloadAsText(blobId: string): Promise<string> {
  const data = await downloadFromWalrus(blobId);
  return new TextDecoder().decode(data);
}

// Example: Download to file (Node.js)
import { writeFileSync } from 'fs';

async function downloadToFile(blobId: string, filePath: string): Promise<void> {
  const data = await downloadFromWalrus(blobId);
  writeFileSync(filePath, data);
  console.log(`Blob saved to ${filePath}`);
}
```

### Working with Multiple Files (Quilts)

```typescript
import { WalrusFile } from '@mysten/walrus';

async function uploadMultipleFiles(): Promise<string[]> {
  // Create WalrusFile instances
  const file1 = WalrusFile.from('Hello World!', {
    identifier: 'hello.txt',
    tags: { 'content-type': 'text/plain' },
  });
  
  const file2 = WalrusFile.from(new Uint8Array([1, 2, 3, 4]), {
    identifier: 'data.bin',
    tags: { 'content-type': 'application/octet-stream' },
  });

  // Upload all files as a quilt
  const results = await walrusClient.writeFiles({
    files: [file1, file2],
    epochs: 100,
    deletable: true,
    signer: keypair,
  });

  return results.map(r => r.blobId);
}

// Read files from quilt
async function readFilesFromQuilt(blobId: string): Promise<WalrusFile[]> {
  const blob = await walrusClient.getBlob({ blobId });
  
  // Get all files
  const files = await blob.files();
  
  // Or get specific files by identifier
  const [readme] = await blob.files({ 
    identifiers: ['README.md'] 
  });
  
  // Or get by tags
  const textFiles = await blob.files({ 
    tags: [{ 'content-type': 'text/plain' }] 
  });
  
  return files;
}
```

### Delete Blob (if deletable)

```typescript
async function deleteBlob(blobObjectId: string): Promise<void> {
  try {
    const { digest } = await walrusClient.executeDeleteBlobTransaction({
      blobObjectId,
      signer: keypair,
    });
    
    console.log(`✅ Blob deleted successfully. Digest: ${digest}`);
  } catch (error) {
    console.error('Failed to delete blob:', error);
    throw error;
  }
}
```

## Browser Integration

For browser environments where wallet popups must be triggered by user actions:

```typescript
// Step 1: Create and encode the flow
const flow = walrusClient.writeFilesFlow({
  files: [
    WalrusFile.from({
      contents: new Uint8Array(fileData),
      identifier: 'my-file.txt',
    }),
  ],
});

await flow.encode();

// Step 2: Register (user clicks "Register" button)
async function handleRegister() {
  const registerTx = flow.register({
    epochs: 3,
    owner: currentAccount.address,
    deletable: true,
  });
  
  const { digest } = await signAndExecuteTransaction({ 
    transaction: registerTx 
  });
  
  // Step 3: Upload to storage nodes
  await flow.upload({ digest });
}

// Step 4: Certify (user clicks "Certify" button)
async function handleCertify() {
  const certifyTx = flow.certify();
  await signAndExecuteTransaction({ transaction: certifyTx });
  
  // Step 5: Get the uploaded files
  const files = await flow.listFiles();
  console.log('Uploaded files:', files);
}
```

## HTTP API Access (Alternative to SDK)

You can also access Walrus via HTTP API using publishers and aggregators:

```typescript
// Upload via Publisher
async function uploadViaHTTP(data: Uint8Array): Promise<string> {
  const publisherUrl = 'https://publisher.walrus-testnet.walrus.space';
  
  const response = await fetch(`${publisherUrl}/v1/store?epochs=100`, {
    method: 'PUT',
    body: data,
  });
  
  const result = await response.json();
  return result.blobId;
}

// Download via Aggregator
async function downloadViaHTTP(blobId: string): Promise<Uint8Array> {
  const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
  
  const response = await fetch(`${aggregatorUrl}/v1/${blobId}`);
  const arrayBuffer = await response.arrayBuffer();
  
  return new Uint8Array(arrayBuffer);
}
```

## Content Delivery

For serving content (like videos, images):

```typescript
// Get aggregator URL for content
function getContentUrl(blobId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const aggregator = network === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space';
    
  return `${aggregator}/v1/${blobId}`;
}

// React component for video player
function VideoPlayer({ blobId }: { blobId: string }) {
  const videoUrl = getContentUrl(blobId);
  
  return (
    <video controls>
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}

// React component for image
function ImageDisplay({ blobId }: { blobId: string }) {
  return <img src={getContentUrl(blobId)} alt="Walrus stored image" />;
}
```

## Storage Management on Sui

```move
module creator_platform::storage {
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    
    struct StorageAllocation has key {
        id: UID,
        owner: address,
        capacity_gb: u64,
        used_gb: u64,
        balance: Balance<SUI>, // Prepaid storage
    }
    
    struct BlobRegistered has copy, drop {
        owner: address,
        blob_id: vector<u8>,
        size_bytes: u64,
    }
    
    public entry fun purchase_storage(
        capacity_gb: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let allocation = StorageAllocation {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            capacity_gb,
            used_gb: 0,
            balance: coin::into_balance(payment),
        };
        
        transfer::transfer(allocation, tx_context::sender(ctx));
    }
    
    public entry fun register_blob(
        allocation: &mut StorageAllocation,
        blob_id: vector<u8>,
        size_bytes: u64,
        ctx: &TxContext
    ) {
        let size_gb = size_bytes / (1024 * 1024 * 1024);
        assert!(allocation.used_gb + size_gb <= allocation.capacity_gb, 0);
        
        allocation.used_gb = allocation.used_gb + size_gb;
        
        // Emit event for indexing
        event::emit(BlobRegistered {
            owner: tx_context::sender(ctx),
            blob_id,
            size_bytes,
        });
    }
}
```

## Error Handling

```typescript
import { RetryableWalrusClientError } from '@mysten/walrus';

async function robustUpload(data: Uint8Array, maxRetries: number = 3): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const { blobId } = await walrusClient.writeBlob({
        blob: data,
        epochs: 100,
        deletable: true,
        signer: keypair,
      });
      
      return blobId;
    } catch (error) {
      if (error instanceof RetryableWalrusClientError) {
        console.warn('Retryable error, resetting client...');
        walrusClient.reset();
        attempts++;
        
        if (attempts >= maxRetries) {
          throw new Error('Max retries exceeded');
        }
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Upload failed');
}
```

## Advanced Configuration

### Custom Storage Node Options

```typescript
const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
  storageNodeClientOptions: {
    timeout: 60_000, // 60 second timeout
    onError: (error) => console.log('Node error:', error),
    fetch: (url, options) => {
      console.log('Fetching:', url);
      return fetch(url, options);
    },
  },
});
```

### Computing Storage Costs

```typescript
async function calculateStorageCost(
  sizeBytes: number,
  epochs: number
): Promise<bigint> {
  const cost = await walrusClient.storageCost({
    size: sizeBytes,
    epochs,
  });
  
  console.log(`Cost for ${sizeBytes} bytes for ${epochs} epochs: ${cost} MIST`);
  return cost;
}
```

## Important Notes

1. **Network Requests**: Reading/writing blobs directly requires many requests (~2200 for write, ~335 for read). Use upload relay for production.

2. **Authentication**: All write operations require a signer (keypair) with:
   - SUI tokens for gas fees
   - WAL tokens for storage payments

3. **Epochs**: One epoch ≈ 1 day. Plan storage duration accordingly.

4. **Deletability**: Set during upload. Non-deletable blobs are permanent.

5. **Public Data**: All blobs are publicly accessible. Use client-side encryption for sensitive data (see Seal SDK).

6. **Mainnet vs Testnet**: 
   - Testnet: Free tokens, data may be wiped
   - Mainnet: Real tokens, production-ready

## Resources

- Official SDK Documentation: https://sdk.mystenlabs.com/walrus
- NPM Package: https://www.npmjs.com/package/@mysten/walrus
- Walrus Documentation: https://docs.wal.app
- GitHub Examples: https://github.com/MystenLabs/ts-sdks/tree/main/packages/walrus/examples
- Awesome Walrus: https://github.com/MystenLabs/awesome-walrus

## Network Endpoints

### Testnet
- Aggregator: `https://aggregator.walrus-testnet.walrus.space`
- Publisher: `https://publisher.walrus-testnet.walrus.space`
- Upload Relay: `https://upload-relay.testnet.walrus.space`

### Mainnet
- Aggregator: `https://aggregator.walrus.space`
- Publisher: `https://publisher.walrus.space`
- Upload Relay: Check official docs for latest endpoints
```