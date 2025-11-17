# Sui Blockchain & Move Language
## Overview
Sui is a layer-1 blockchain with parallel transaction processing and object-oriented architecture, powered by the Move programming language.
## Key Features
- Parallel Execution: Process independent transactions simultaneously
- Object Model: First-class objects with ownership semantics
- Move Language: Resource-oriented programming with built-in safety
- PTBs: Up to 1024 function calls in a single transaction
- Sub-second Finality: Fast transaction confirmation

## Move Project Structure
```
creator_platform/
├── Move.toml
├── sources/
│   ├── profile.move
│   ├── subscription.move
│   ├── content.move
│   ├── payment.move
│   ├── access_policy.move
│   └── messaging.move
├── tests/
│   ├── profile_tests.move
│   ├── subscription_tests.move
│   └── integration_tests.move
└── scripts/
    ├── deploy.sh
    └── upgrade.sh
```
## Move.toml Configuration
```toml
toml[package]
name = "creator_platform"
version = "0.1.0"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }

[addresses]
creator_platform = "0x0"
sui = "0x2"
```
## Core Move Concepts
```move
Objects with Key Ability
movestruct CreatorProfile has key {
    id: UID,              // Unique identifier
    suins_name: String,
    metadata: Metadata,
}
```
## Store Ability for Nesting
```move
movestruct Metadata has store {
    display_name: String,
    bio: String,
    avatar_url: String,
}
```
## Entry Functions (Callable from transactions)
```move
movepublic entry fun create_profile(
    name: String,
    ctx: &mut TxContext
) {
    let profile = CreatorProfile {
        id: object::new(ctx),
        suins_name: name,
        metadata: Metadata { ... },
    };
    transfer::transfer(profile, tx_context::sender(ctx));
}
```
## Events for Indexing
```move
movestruct ProfileCreated has copy, drop {
    profile_id: ID,
    creator: address,
    name: String,
    timestamp: u64,
}

public entry fun create_profile(...) {
    // ... profile creation logic
    
    event::emit(ProfileCreated {
        profile_id: object::uid_to_inner(&profile.id),
        creator: tx_context::sender(ctx),
        name,
        timestamp: tx_context::epoch(ctx),
    });
}
```
## TypeScript Integration
```typescript
typescriptimport { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

// Initialize Sui client
const client = new SuiClient({ 
  url: getFullnodeUrl('testnet') 
});

// Create profile transaction
async function createProfile(
  keypair: Ed25519Keypair,
  packageId: string,
  name: string
) {
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${packageId}::profile::create_profile`,
    arguments: [
      tx.pure(name),
    ],
  });
  
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });
  
  return result;
}

// Query objects
async function getCreatorProfile(address: string) {
  const objects = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${PACKAGE_ID}::profile::CreatorProfile`
    }
  });
  
  return objects;
}

// Subscribe to events
async function subscribeToProfileEvents() {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::profile::ProfileCreated`
    },
    onMessage: (event) => {
      console.log('New profile created:', event);
    }
  });
  
  return unsubscribe;
}
```