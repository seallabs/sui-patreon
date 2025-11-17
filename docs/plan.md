# CreatorChain MVP - User Stories for AI Agent Coding

## 🎯 Implementation Order

**Week 1: Smart Contracts (Stories 1-5)**
**Week 2: Backend & Integration (Stories 6-12)**
**Week 3: Frontend & Demo (Stories 13-20)**

---

## Week 1: Smart Contracts

### Story 1: Profile Smart Contract

**Context**: Create the foundation for creator identity on-chain

**What to build**: Move smart contract for creator profiles

**Code to generate**:
```move
// File: contracts/sources/profile.move
module creator_platform::profile {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;

    struct CreatorProfile has key {
        id: UID,
        creator: address,
        name: String,
        bio: String,
        avatar_url: String,
        created_at: u64,
    }

    struct ProfileCreated has copy, drop {
        profile_id: ID,
        creator: address,
        name: String,
        timestamp: u64,
    }

    public entry fun create_profile(
        name: String,
        bio: String,
        avatar_url: String,
        ctx: &mut TxContext
    ) {
        // TODO: Create profile NFT
        // TODO: Emit ProfileCreated event
        // TODO: Transfer to sender
    }

    public entry fun update_profile(
        profile: &mut CreatorProfile,
        bio: String,
        avatar_url: String,
    ) {
        // TODO: Update profile fields
    }
}
```

**Requirements**:
- Profile is an NFT (has `key` ability)
- Only owner can update
- Emit event for indexing
- Include timestamp

**Test cases**:
1. Create profile successfully
2. Update profile successfully
3. Non-owner cannot update

---

### Story 2: Subscription Tier Contract

**Context**: Creators need to define subscription tiers with pricing

**What to build**: Smart contract for creating and managing tiers

**Code to generate**:
```move
// File: contracts/sources/subscription.move
module creator_platform::subscription {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;

    struct SubscriptionTier has key, store {
        id: UID,
        creator: address,
        name: String,
        description: String,
        price_monthly: u64, // in MIST
        is_active: bool,
    }

    struct TierCreated has copy, drop {
        tier_id: ID,
        creator: address,
        name: String,
        price: u64,
    }

    public entry fun create_tier(
        name: String,
        description: String,
        price_monthly: u64,
        ctx: &mut TxContext
    ) {
        // TODO: Create tier as shared object
        // TODO: Emit TierCreated event
    }

    public entry fun update_tier_price(
        tier: &mut SubscriptionTier,
        new_price: u64,
        ctx: &TxContext
    ) {
        // TODO: Verify sender is creator
        // TODO: Update price
    }

    public entry fun deactivate_tier(
        tier: &mut SubscriptionTier,
        ctx: &TxContext
    ) {
        // TODO: Verify sender is creator
        // TODO: Set is_active = false
    }
}
```

**Requirements**:
- Tier is shared object (multiple people interact)
- Only creator can modify
- Price in MIST (1 SUI = 1,000,000,000 MIST)
- Support activation/deactivation

**Test cases**:
1. Create tier with valid price
2. Update tier price
3. Deactivate tier
4. Non-creator cannot modify

---

### Story 3: Subscription Purchase Contract

**Context**: Fans need to purchase subscriptions and receive NFTs

**What to build**: Function to purchase subscription with SUI payment

**Code to generate**:
```move
// Add to contracts/sources/subscription.move

struct ActiveSubscription has key, store {
    id: UID,
    subscriber: address,
    creator: address,
    tier_id: ID,
    tier_name: String,
    started_at: u64,
    expires_at: u64,
}

struct SubscriptionPurchased has copy, drop {
    subscription_id: ID,
    subscriber: address,
    creator: address,
    tier_id: ID,
    amount: u64,
    expires_at: u64,
}

public entry fun purchase_subscription(
    tier: &SubscriptionTier,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // TODO: Verify tier is active
    // TODO: Verify payment amount >= tier.price_monthly
    // TODO: Calculate expiration (30 days)
    // TODO: Create subscription NFT
    // TODO: Transfer payment to creator
    // TODO: Transfer subscription NFT to subscriber
    // TODO: Emit SubscriptionPurchased event
}

public fun is_active(sub: &ActiveSubscription, current_epoch: u64): bool {
    // TODO: Check if expires_at >= current_epoch
}
```

**Requirements**:
- Accept Coin<SUI> payment
- Verify amount matches tier price
- Mint subscription NFT valid for 30 days
- Transfer payment directly to creator
- Emit event for indexing

**Test cases**:
1. Purchase with exact amount
2. Purchase with overpayment (should work)
3. Purchase with underpayment (should fail)
4. Purchase inactive tier (should fail)

---

### Story 4: Content Registry Contract

**Context**: Track content metadata and access requirements on-chain

**What to build**: Smart contract to register content with access policies

**Code to generate**:
```move
// File: contracts/sources/content.move
module creator_platform::content {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;
    use std::vector;

    struct Content has key {
        id: UID,
        creator: address,
        title: String,
        description: String,
        content_type: String,
        walrus_blob_id: String,
        preview_blob_id: String,
        required_tier_ids: vector<ID>,
        created_at: u64,
        is_public: bool,
    }

    struct ContentCreated has copy, drop {
        content_id: ID,
        creator: address,
        title: String,
        tier_ids: vector<ID>,
    }

    public entry fun create_content(
        title: String,
        description: String,
        content_type: String,
        walrus_blob_id: String,
        preview_blob_id: String,
        required_tier_ids: vector<ID>,
        is_public: bool,
        ctx: &mut TxContext
    ) {
        // TODO: Create content object
        // TODO: Make it a shared object
        // TODO: Emit ContentCreated event
    }
}
```

**Requirements**:
- Content is shared object
- Store Walrus blob IDs
- Support multiple tier access
- Support public content (free preview)

**Test cases**:
1. Create content with tier requirements
2. Create public content
3. Update content metadata

---

### Story 5: Access Verification Function

**Context**: Verify subscription NFT grants access to content

**What to build**: Function to check if user can access content

**Code to generate**:
```move
// Add to contracts/sources/content.move

use creator_platform::subscription::{ActiveSubscription};

public fun verify_access(
    content: &Content,
    subscription: &ActiveSubscription,
    ctx: &TxContext
): bool {
    // TODO: If content is public, return true
    // TODO: Check subscription is active (not expired)
    // TODO: Check subscription tier is in required_tier_ids
    // TODO: Return true if all checks pass
}

// Entry function for Seal to call
public entry fun seal_approve(
    content: &Content,
    subscription: &ActiveSubscription,
    ctx: &TxContext
) {
    assert!(verify_access(content, subscription, ctx), 0);
}
```

**Requirements**:
- Check subscription expiration
- Check tier matches content requirements
- Public content always accessible
- Used by Seal for decryption approval

**Test cases**:
1. Valid subscription grants access
2. Expired subscription denied
3. Wrong tier denied
4. Public content always works

---

## Week 2: Backend & Integration

### Story 6: Express Server Setup

**Context**: Set up backend API with health check and CORS

**What to build**: Basic Express server with TypeScript and Bun

**Code to generate**:
```typescript
// File: backend/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    runtime: 'bun',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Powered by Bun ${Bun.version}`);
});

export default app;
```

**Requirements**:
- CORS enabled for frontend
- JSON body parsing (50MB limit for file uploads)
- Error handling middleware
- Health check endpoint

**Test**:
```bash
curl http://localhost:3001/health
```

---

### Story 7: Prisma Database Setup

**Context**: Set up PostgreSQL database with Prisma ORM

**What to build**: Database schema for creators, tiers, subscriptions, content

**Code to generate**:
```prisma
// File: backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Creator {
  id        String   @id @default(uuid())
  address   String   @unique
  profileId String   @unique
  name      String   @unique
  bio       String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tiers     Tier[]
  content   Content[]
  
  @@index([address])
  @@index([name])
}

model Tier {
  id          String   @id @default(uuid())
  tierId      String   @unique
  creatorId   String
  name        String
  description String?
  price       BigInt
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  creator       Creator        @relation(fields: [creatorId], references: [id])
  subscriptions Subscription[]
  contentTiers  ContentTier[]
  
  @@index([creatorId])
  @@index([tierId])
}

model Subscription {
  id             String   @id @default(uuid())
  subscriptionId String   @unique
  subscriber     String
  tierId         String
  startsAt       DateTime
  expiresAt      DateTime
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  
  tier Tier @relation(fields: [tierId], references: [id])
  
  @@index([subscriber])
  @@index([subscriptionId])
}

model Content {
  id            String   @id @default(uuid())
  contentId     String   @unique
  creatorId     String
  title         String
  description   String?
  contentType   String
  walrusBlobId  String
  previewBlobId String?
  isPublic      Boolean  @default(false)
  createdAt     DateTime @default(now())
  
  creator Creator       @relation(fields: [creatorId], references: [id])
  tiers   ContentTier[]
  
  @@index([creatorId])
  @@index([contentId])
}

model ContentTier {
  contentId String
  tierId    String
  
  content Content @relation(fields: [contentId], references: [id])
  tier    Tier    @relation(fields: [tierId], references: [id])
  
  @@id([contentId, tierId])
}
```

**Requirements**:
- Use UUIDs for primary keys
- Index frequently queried fields
- Relationships between models
- Timestamps for audit

**Commands**:
```bash
cd backend
bunx prisma migrate dev --name init
bunx prisma generate
```

---

### Story 8: Sui Event Indexer

**Context**: Listen to on-chain events and sync to database

**What to build**: Service that subscribes to Sui events and indexes them

**Code to generate**:
```typescript
// File: backend/src/indexer.ts
import { SuiClient } from '@mysten/sui.js/client';
import { PrismaClient } from '@prisma/client';

const sui = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
const prisma = new PrismaClient();

const PACKAGE_ID = process.env.PACKAGE_ID!;

async function indexEvents() {
  console.log('🔍 Starting event indexer...');
  console.log(`📦 Package: ${PACKAGE_ID}`);
  
  // Subscribe to ProfileCreated events
  await sui.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::profile::ProfileCreated`
    },
    onMessage: async (event) => {
      console.log('📨 ProfileCreated:', event);
      
      const { profile_id, creator, name } = event.parsedJson as any;
      
      await prisma.creator.upsert({
        where: { address: creator },
        update: {
          profileId: profile_id,
          name: name,
        },
        create: {
          address: creator,
          profileId: profile_id,
          name: name,
        }
      });
      
      console.log('✅ Indexed creator:', name);
    }
  });
  
  // Subscribe to TierCreated events
  await sui.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::TierCreated`
    },
    onMessage: async (event) => {
      console.log('📨 TierCreated:', event);
      
      const { tier_id, creator, name, price } = event.parsedJson as any;
      
      const creatorRecord = await prisma.creator.findUnique({
        where: { address: creator }
      });
      
      if (creatorRecord) {
        await prisma.tier.create({
          data: {
            tierId: tier_id,
            creatorId: creatorRecord.id,
            name: name,
            price: BigInt(price),
          }
        });
        
        console.log('✅ Indexed tier:', name);
      }
    }
  });
  
  // Subscribe to SubscriptionPurchased events
  await sui.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::subscription::SubscriptionPurchased`
    },
    onMessage: async (event) => {
      console.log('📨 SubscriptionPurchased:', event);
      
      const { 
        subscription_id, 
        subscriber, 
        tier_id, 
        expires_at 
      } = event.parsedJson as any;
      
      const tier = await prisma.tier.findUnique({
        where: { tierId: tier_id }
      });
      
      if (tier) {
        await prisma.subscription.create({
          data: {
            subscriptionId: subscription_id,
            subscriber: subscriber,
            tierId: tier.id,
            startsAt: new Date(),
            expiresAt: new Date(expires_at * 1000),
          }
        });
        
        console.log('✅ Indexed subscription:', subscription_id);
      }
    }
  });
  
  // Subscribe to ContentCreated events
  await sui.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::content::ContentCreated`
    },
    onMessage: async (event) => {
      console.log('📨 ContentCreated:', event);
      
      const { content_id, creator, title, tier_ids } = event.parsedJson as any;
      
      const creatorRecord = await prisma.creator.findUnique({
        where: { address: creator }
      });
      
      if (creatorRecord) {
        const content = await prisma.content.create({
          data: {
            contentId: content_id,
            creatorId: creatorRecord.id,
            title: title,
            contentType: 'video',
            walrusBlobId: '',
            isPublic: false,
          }
        });
        
        // Link to tiers
        for (const tierId of tier_ids) {
          const tier = await prisma.tier.findUnique({
            where: { tierId }
          });
          
          if (tier) {
            await prisma.contentTier.create({
              data: {
                contentId: content.id,
                tierId: tier.id,
              }
            });
          }
        }
        
        console.log('✅ Indexed content:', title);
      }
    }
  });
  
  console.log('✅ Event indexer running...');
}

indexEvents().catch(console.error);
```

**Requirements**:
- Subscribe to all contract events
- Parse event data
- Upsert to database (handle duplicates)
- Log success/errors

**Run**:
```bash
bun run dev:indexer
```

---

### Story 9: Walrus Storage Service

**Context**: Upload and download files from Walrus

**What to build**: Service class for Walrus operations

**Code to generate**:
```typescript
// File: backend/src/services/storage.service.ts
import axios from 'axios';

const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER_URL || 
  'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL || 
  'https://aggregator.walrus-testnet.walrus.space';

export class WalrusStorage {
  async upload(data: Buffer, epochs: number = 100): Promise<string> {
    try {
      console.log(`📤 Uploading ${data.length} bytes to Walrus...`);
      
      const response = await axios.put(
        `${WALRUS_PUBLISHER}/v1/store?epochs=${epochs}`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );
      
      const blobId = 
        response.data.newlyCreated?.blobObject?.blobId ||
        response.data.alreadyCertified?.blobId;
      
      if (!blobId) {
        throw new Error('No blob ID in response');
      }
      
      console.log(`✅ Uploaded to Walrus: ${blobId}`);
      return blobId;
    } catch (error: any) {
      console.error('❌ Walrus upload failed:', error.message);
      throw new Error(`Walrus upload failed: ${error.message}`);
    }
  }
  
  async download(blobId: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading ${blobId} from Walrus...`);
      
      const response = await axios.get(
        `${WALRUS_AGGREGATOR}/v1/${blobId}`,
        {
          responseType: 'arraybuffer',
        }
      );
      
      console.log(`✅ Downloaded ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('❌ Walrus download failed:', error.message);
      throw new Error(`Walrus download failed: ${error.message}`);
    }
  }
  
  getUrl(blobId: string): string {
    return `${WALRUS_AGGREGATOR}/v1/${blobId}`;
  }
  
  async exists(blobId: string): Promise<boolean> {
    try {
      await axios.head(`${WALRUS_AGGREGATOR}/v1/${blobId}`);
      return true;
    } catch {
      return false;
    }
  }
}

export const walrus = new WalrusStorage();
```

**Requirements**:
- Upload with configurable epochs
- Download and return Buffer
- Generate CDN URLs
- Check if blob exists
- Error handling

**Test**:
```typescript
const testData = Buffer.from('Hello Walrus!');
const blobId = await walrus.upload(testData);
const downloaded = await walrus.download(blobId);
console.log(downloaded.toString()); // "Hello Walrus!"
```

---

### Story 10: Seal Encryption Service

**Context**: Encrypt/decrypt content with Seal

**What to build**: Service class for Seal operations

**Code to generate**:
```typescript
// File: backend/src/services/encryption.service.ts
import { SealClient } from '@mystenlabs/seal-sdk';
import { SuiClient } from '@mysten/sui.js/client';

export class SealEncryption {
  private seal: SealClient;
  
  constructor() {
    const sui = new SuiClient({
      url: 'https://fullnode.testnet.sui.io'
    });
    
    this.seal = new SealClient({
      suiClient: sui,
      network: 'testnet',
    });
  }
  
  async encrypt(
    data: Buffer,
    policyId: string
  ): Promise<Buffer> {
    try {
      console.log(`🔒 Encrypting ${data.length} bytes...`);
      
      const encrypted = await this.seal.encrypt(
        new Uint8Array(data),
        { policyId }
      );
      
      console.log(`✅ Encrypted: ${encrypted.length} bytes`);
      return Buffer.from(encrypted);
    } catch (error: any) {
      console.error('❌ Seal encryption failed:', error.message);
      throw new Error(`Seal encryption failed: ${error.message}`);
    }
  }
  
  async decrypt(
    encryptedData: Buffer,
    txDigest: string
  ): Promise<Buffer> {
    try {
      console.log(`🔓 Decrypting ${encryptedData.length} bytes...`);
      
      const decrypted = await this.seal.decrypt(
        new Uint8Array(encryptedData),
        { txDigest }
      );
      
      console.log(`✅ Decrypted: ${decrypted.length} bytes`);
      return Buffer.from(decrypted);
    } catch (error: any) {
      console.error('❌ Seal decryption failed:', error.message);
      throw new Error(`Seal decryption failed: ${error.message}`);
    }
  }
}

export const seal = new SealEncryption();
```

**Requirements**:
- Client-side encryption
- Policy-based access control
- Transaction-based decryption
- Error handling

---

### Story 11: Content Upload API Endpoint

**Context**: API endpoint for creators to upload content

**What to build**: POST endpoint that encrypts and stores content

**Code to generate**:
```typescript
// File: backend/src/routes/upload.ts
import { Router, Request, Response } from 'express';
import { walrus } from '../services/storage.service';
import { seal } from '../services/encryption.service';

const router = Router();

interface UploadRequest {
  file: string; // base64 encoded
  contentType: string;
  policyId: string;
  encrypt?: boolean;
}

router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { 
      file, 
      contentType, 
      policyId, 
      encrypt = true 
    }: UploadRequest = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Decode base64
    const fileBuffer = Buffer.from(file, 'base64');
    console.log(`📦 Received file: ${fileBuffer.length} bytes`);
    
    let dataToUpload = fileBuffer;
    
    // Encrypt if requested
    if (encrypt && policyId) {
      dataToUpload = await seal.encrypt(fileBuffer, policyId);
    }
    
    // Upload to Walrus
    const blobId = await walrus.upload(dataToUpload);
    
    res.json({
      success: true,
      blobId,
      url: walrus.getUrl(blobId),
      size: fileBuffer.length,
      encrypted: encrypt,
      contentType,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:blobId', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.params;
    const { decrypt: shouldDecrypt, txDigest } = req.query;
    
    let data = await walrus.download(blobId);
    
    // Decrypt if requested
    if (shouldDecrypt === 'true' && txDigest) {
      data = await seal.decrypt(data, txDigest as string);
    }
    
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Requirements**:
- Accept base64 file
- Encrypt with Seal
- Upload to Walrus
- Return blob ID and URL
- Support download with decryption

**Mount in main app**:
```typescript
// backend/src/index.ts
import uploadRouter from './routes/upload';
app.use('/api', uploadRouter);
```

---

### Story 12: Creator & Content API Routes

**Context**: CRUD endpoints for creators and content

**What to build**: REST API endpoints for frontend

**Code to generate**:
```typescript
// File: backend/src/routes/creators.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get creator by address
router.get('/:address', async (req, res) => {
  try {
    const creator = await prisma.creator.findUnique({
      where: { address: req.params.address },
      include: {
        tiers: true,
        content: {
          include: { tiers: true }
        }
      }
    });
    
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    
    res.json(creator);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search creators
router.get('/', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    const creators = await prisma.creator.findMany({
      where: query ? {
        name: {
          contains: query as string,
          mode: 'insensitive'
        }
      } : undefined,
      take: Number(limit),
      include: {
        tiers: true,
      }
    });
    
    res.json(creators);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get creator's content
router.get('/:address/content', async (req, res) => {
  try {
    const creator = await prisma.creator.findUnique({
      where: { address: req.params.address }
    });
    
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    
    const content = await prisma.content.findMany({
      where: { creatorId: creator.id },
      include: { tiers: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// Mount in backend/src/index.ts
// app.use('/api/creators', creatorsRouter);
```

**Requirements**:
- Get creator by address
- Search creators by name
- Get creator's content
- Include relationships
- Pagination support

---

## Week 3: Frontend & Demo

### Story 13: Sui Client Setup

**Context**: Configure Sui SDK for frontend

**What to build**: Sui client singleton and contract helpers

**Code to generate**:
```typescript
// File: web/lib/sui/client.ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export const suiClient = new SuiClient({ 
  url: getFullnodeUrl('testnet') 
});

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

// Helper to extract object ID from transaction result
export function extractObjectId(result: any): string | null {
  const created = result.effects?.created?.[0];
  return created?.reference?.objectId || null;
}

// Helper to get gas object
export async function getGasObject(address: string) {
  const coins = await suiClient.getCoins({ owner: address });
  return coins.data[0];
}
```

**Requirements**:
- Singleton Sui client
- Environment-based configuration
- Helper functions
- Type safety

---

### Story 14: Smart Contract Interaction Functions

**Context**: TypeScript wrappers for smart contract calls

**What to build**: Functions to interact with Move contracts

**Code to generate**:
```typescript
// File: web/lib/sui/contracts.ts
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { suiClient, PACKAGE_ID } from './client';

export async function createProfile(
  signer: any,
  name: string,
  bio: string,
  avatarUrl: string
) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::profile::create_profile`,
    arguments: [
      tx.pure(name),
      tx.pure(bio),
      tx.pure(avatarUrl),
    ],
  });
  
  return await suiClient.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });
}

export async function createTier(
  signer: any,
  name: string,
  description: string,
  priceInSui: number
) {
  const tx = new TransactionBlock();
  const priceInMist = Math.floor(priceInSui * 1_000_000_000);
  
  tx.moveCall({
    target: `${PACKAGE_ID}::subscription::create_tier`,
    arguments: [
      tx.pure(name),
      tx.pure(description),
      tx.pure(priceInMist.toString()),
    ],
  });
  
  return await suiClient.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });
}

export async function purchaseSubscription(
  signer: any,
  tierObjectId: string,
  priceInSui: number
) {
  const tx = new TransactionBlock();
  const priceInMist = Math.floor(priceInSui * 1_000_000_000);
  
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(priceInMist.toString())]);
  
  tx.moveCall({
    target: `${PACKAGE_ID}::subscription::purchase_subscription`,
    arguments: [
      tx.object(tierObjectId),
      coin,
    ],
  });
  
  return await suiClient.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
  });
}

export async function getCreatorProfile(address: string) {
  const objects = await suiClient.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${PACKAGE_ID}::profile::CreatorProfile`
    },
    options: {
      showContent: true,
      showType: true,
    }
  });
  
  return objects.data[0];
}

export async function getSubscriptions(address: string) {
  const objects = await suiClient.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${PACKAGE_ID}::subscription::ActiveSubscription`
    },
    options: {
      showContent: true,
    }
  });
  
  return objects.data;
}
```

**Requirements**:
- Type-safe wrappers
- Handle SUI to MIST conversion
- Return full transaction results
- Query object functions

---

### Story 15: zkLogin Authentication Hook

**Context**: React hook for zkLogin social authentication

**What to build**: Custom hook for Google OAuth login

**Code to generate**:
```typescript
// File: web/hooks/useZkLogin.ts
'use client';

import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce, generateRandomness, jwtToAddress } from '@mysten/zklogin';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const REDIRECT_URL = process.env.NEXT_PUBLIC_REDIRECT_URL!;

export function useZkLogin() {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Check existing session
    const stored = localStorage.getItem('zklogin_data');
    if (stored) {
      const data = JSON.parse(stored);
      setAddress(data.address);
    }
  }, []);
  
  const login = async () => {
    setIsLoading(true);
    
    try {
      // Generate ephemeral keypair
      const ephemeralKeyPair = new Ed25519Keypair();
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      
      // Generate randomness and nonce
      const maxEpoch = 10;
      const randomness = generateRandomness();
      const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);
      
      // Store for callback
      sessionStorage.setItem('ephemeral_keypair', 
        JSON.stringify(ephemeralKeyPair.export()));
      sessionStorage.setItem('randomness', randomness);
      sessionStorage.setItem('max_epoch', maxEpoch.toString());
      
      // Redirect to Google OAuth
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URL);
      authUrl.searchParams.set('response_type', 'id_token');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('nonce', nonce);
      
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };
  
  const handleCallback = async () => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const jwt = hashParams.get('id_token');
    
    if (!jwt) return;
    
    try {
      // For hackathon: use static salt (in production, use secure salt management)
      const salt = 'hackathon-salt-12345';
      
      // Derive address
      const userAddress = jwtToAddress(jwt, salt);
      
      // Store session
      localStorage.setItem('zklogin_data', JSON.stringify({
        address: userAddress,
        jwt,
      }));
      
      setAddress(userAddress);
      
      // Clear hash
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      console.error('Callback failed:', error);
    }
  };
  
  const logout = () => {
    localStorage.removeItem('zklogin_data');
    sessionStorage.clear();
    setAddress(null);
  };
  
  return {
    address,
    isLoading,
    isAuthenticated: !!address,
    login,
    logout,
    handleCallback,
  };
}
```

**Requirements**:
- Google OAuth integration
- Ephemeral keypair generation
- ZK proof generation
- Session management
- Callback handling

---

### Story 16: Login Button Component

**Context**: UI component for authentication

**What to build**: Button with Google branding

**Code to generate**:
```typescript
// File: web/components/auth/LoginButton.tsx
'use client';

import { useZkLogin } from '@/hooks/useZkLogin';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const { isAuthenticated, address, login, logout, isLoading } = useZkLogin();
  
  if (isAuthenticated && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button onClick={logout} variant="outline" size="sm">
          Logout
        </Button>
      </div>
    );
  }
  
  return (
    <Button 
      onClick={login} 
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>Loading...</>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            {/* Google logo SVG */}
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </>
      )}
    </Button>
  );
}
```

**Requirements**:
- Show address when logged in
- Google branding
- Loading state
- Clean UI with shadcn

---

### Story 17: Creator Profile Form

**Context**: Form for creators to set up profile

**What to build**: Form with name, bio, avatar inputs

**Code to generate**:
```typescript
// File: web/components/creator/CreateProfileForm.tsx
'use client';

import { useState } from 'react';
import { useZkLogin } from '@/hooks/useZkLogin';
import { createProfile } from '@/lib/sui/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function CreateProfileForm() {
  const { address } = useZkLogin();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    setLoading(true);
    
    try {
      // TODO: Get signer from zkLogin
      const signer = null; // Implement this
      
      const result = await createProfile(
        signer,
        formData.name,
        formData.bio,
        formData.avatarUrl
      );
      
      console.log('Profile created:', result);
      alert('Profile created successfully!');
    } catch (error) {
      console.error('Profile creation failed:', error);
      alert('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium mb-2">
          Creator Name
        </label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="yourname"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          This will be your unique identifier (like @username)
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Bio
        </label>
        <Textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell your audience about yourself..."
          rows={4}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Avatar URL
        </label>
        <Input
          type="url"
          value={formData.avatarUrl}
          onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
          placeholder="https://example.com/avatar.jpg"
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={loading || !formData.name}
        className="w-full"
      >
        {loading ? 'Creating Profile...' : 'Create Profile'}
      </Button>
    </form>
  );
}
```

**Requirements**:
- Form validation
- Loading states
- Error handling
- Transaction feedback

---

### Story 18: Content Upload Form

**Context**: Form for uploading encrypted content

**What to build**: File upload with encryption

**Code to generate**:
```typescript
// File: web/components/content/UploadForm.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Read file as base64
      setProgress('Reading file...');
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      
      // Upload to backend (encrypts + stores in Walrus)
      setProgress('Encrypting and uploading...');
      const uploadRes = await axios.post(`${API_URL}/api/upload`, {
        file: base64,
        contentType: file.type,
        policyId: 'demo-policy-id', // TODO: Use actual policy
        encrypt: true,
      });
      
      const { blobId } = uploadRes.data;
      setProgress('Creating on-chain record...');
      
      // TODO: Call createContent smart contract
      
      alert('Content uploaded successfully!');
      setProgress('');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <form onSubmit={handleUpload} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium mb-2">
          Title
        </label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="My awesome content"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your content..."
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          File
        </label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept="video/*,image/*"
          required
        />
        {file && (
          <p className="text-sm text-gray-500 mt-1">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>
      
      {progress && (
        <div className="text-sm text-blue-600">
          {progress}
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={uploading || !file}
        className="w-full"
      >
        {uploading ? 'Uploading...' : 'Upload Content'}
      </Button>
    </form>
  );
}
```

**Requirements**:
- File selection
- Base64 encoding
- Upload to backend
- Progress indicators
- Create on-chain record

---

### Story 19: Landing Page

**Context**: Homepage with hero and features

**What to build**: Landing page with CTA

**Code to generate**:
```typescript
// File: web/app/page.tsx
import Link from 'next/link';
import { LoginButton } from '@/components/auth/LoginButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">CreatorChain</h1>
        <LoginButton />
      </nav>
      
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6">
          Own Your Creator Economy
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Decentralized platform for creators. Own your content, 
          your audience, and your revenue. Built on Sui.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/creator/dashboard"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Become a Creator
          </Link>
          <Link 
            href="/discover"
            className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Discover Creators
          </Link>
        </div>
        
        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 text-left">
          <FeatureCard
            emoji="🔒"
            title="True Ownership"
            description="Your content, encrypted and stored on Walrus. No platform can take it down."
          />
          <FeatureCard
            emoji="💰"
            title="Lower Fees"
            description="2% platform fee vs 5-12% on traditional platforms. Keep what you earn."
          />
          <FeatureCard
            emoji="🌐"
            title="Censorship Resistant"
            description="Decentralized infrastructure ensures your content is always accessible."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
```

**Requirements**:
- Hero section
- Feature cards
- CTAs
- Responsive design

---

### Story 20: OAuth Callback Handler

**Context**: Handle OAuth redirect from Google

**What to build**: Callback page that processes JWT

**Code to generate**:
```typescript
// File: web/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useZkLogin } from '@/hooks/useZkLogin';

export default function AuthCallback() {
  const router = useRouter();
  const { handleCallback } = useZkLogin();
  
  useEffect(() => {
    handleCallback().then(() => {
      // Redirect to dashboard after successful login
      router.push('/creator/dashboard');
    });
  }, [handleCallback, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg">Completing login...</p>
      </div>
    </div>
  );
}
```

**Requirements**:
- Handle OAuth redirect
- Process JWT token
- Redirect to dashboard
- Loading state

---

## 🎯 Implementation Checklist

Use this to track progress:

```
Week 1: Smart Contracts
☐ Story 1: Profile Contract
☐ Story 2: Tier Contract
☐ Story 3: Subscription Purchase
☐ Story 4: Content Registry
☐ Story 5: Access Verification
☐ Deploy to testnet
☐ Save PACKAGE_ID

Week 2: Backend
☐ Story 6: Express Server
☐ Story 7: Prisma Setup
☐ Story 8: Event Indexer
☐ Story 9: Walrus Service
☐ Story 10: Seal Service
☐ Story 11: Upload API
☐ Story 12: Creator API

Week 3: Frontend
☐ Story 13: Sui Client
☐ Story 14: Contract Functions
☐ Story 15: zkLogin Hook
☐ Story 16: Login Button
☐ Story 17: Profile Form
☐ Story 18: Upload Form
☐ Story 19: Landing Page
☐ Story 20: OAuth Callback

Demo Prep
☐ Test complete flow
☐ Record demo video
☐ Prepare presentation
☐ Deploy to testnet
```

---

## 💡 Tips for AI Coding Agents

Each story includes:
- ✅ **Context**: Why this exists
- ✅ **What to build**: Clear objective
- ✅ **Code structure**: Complete examples
- ✅ **Requirements**: Functional specs
- ✅ **Test cases**: Validation criteria

Copy a story and ask your AI agent:
> "Implement Story X based on these specifications"

The AI will have all context needed to generate working code!