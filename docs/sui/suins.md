```markdown
# SuiNS (Sui Name Service)

## Overview
SuiNS provides human-readable blockchain addresses similar to ENS on Ethereum, built natively on the Sui blockchain.

## Key Features
- **Human-Readable**: `creator.sui` instead of `0x123...`
- **NFT-Based**: Names are NFTs, fully owned and transferable
- **Portable**: Use across all Sui apps
- **Subdomains**: Support for `blog.creator.sui`
- **Metadata**: Attach avatars, IPFS sites, and more

## Pricing
- 5+ characters: 20 SUI/year
- 4 characters: 100 SUI/year
- 3 characters: 500 SUI/year
- Registration period: 1-5 years

---

## TypeScript SDK Integration

### Installation

```bash
npm install @mysten/suins @mysten/sui
```

### Initialize SuiNS Client

```typescript
import { SuinsClient } from '@mysten/suins';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

// Create a Sui client
const client = new SuiClient({ 
  url: getFullnodeUrl('testnet') 
});

// Initialize SuiNS client
const suinsClient = new SuinsClient({
  client,
  network: 'testnet', // or 'mainnet'
});
```

> **Note:** Keep only one instance of `SuinsClient` throughout your dApp. In React, use a context provider.

---

## Querying Names

### Resolve Name to Address

```typescript
async function resolveName(name: string): Promise<string | null> {
  try {
    const address = await suinsClient.getAddress(name);
    return address;
  } catch (error) {
    console.error('Failed to resolve name:', error);
    return null;
  }
}

// Example usage
const address = await resolveName('alice.sui');
console.log(address); // 0x123...
```

### Reverse Lookup: Address to Name

```typescript
async function reverseLookup(address: string): Promise<string | null> {
  try {
    const name = await suinsClient.getName(address);
    return name;
  } catch (error) {
    console.error('Failed reverse lookup:', error);
    return null;
  }
}

// Example usage
const name = await reverseLookup('0x123...');
console.log(name); // alice.sui
```

### Get Name Object Details

```typescript
async function getNameDetails(name: string) {
  const nameObject = await suinsClient.getNameObject(name);
  console.log(nameObject);
  // Returns: target address, expiration, NFT ID, etc.
}
```

---

## Building Transactions

### Register a Name

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { SuinsTransaction } from '@mysten/suins';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function registerName(
  name: string,
  years: number,
  keypair: Ed25519Keypair
): Promise<string> {
  // Create transaction
  const transaction = new Transaction();
  
  // Create SuiNS transaction wrapper
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Choose payment coin (SUI, NS, or USDC)
  const coinConfig = suinsClient.config.coins.SUI;
  
  // Get price info object (required for SUI/NS payments)
  const priceInfoObjectId = (
    await suinsClient.getPriceInfoObject(transaction, coinConfig.feed)
  )[0];
  
  // Register the name (returns the NFT object)
  const nft = suinsTransaction.register({
    domain: name,
    years, // 1-5 years
    coinConfig,
    priceInfoObjectId, // Only required for SUI/NS
    // coinId: '0x...', // Only required for NS/USDC
  });
  
  // Transfer NFT to desired address
  const targetAddress = keypair.getPublicKey().toSuiAddress();
  transaction.transferObjects(
    [nft], 
    transaction.pure.address(targetAddress)
  );
  
  // Sign and execute
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
  
  return result.digest;
}

// Usage
const txDigest = await registerName('myname.sui', 1, keypair);
```

### Set Target Address

```typescript
async function setTargetAddress(
  nftId: string,
  targetAddress: string,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Set the target address for the name
  suinsTransaction.setTargetAddress({
    nft: nftId,
    address: targetAddress,
    isSubname: false,
  });
  
  await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
}
```

### Set as Default Name

```typescript
async function setDefaultName(
  name: string,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Set this name as the default for the sender's address
  // Note: Only works if the signer's address is the target address
  suinsTransaction.setDefault(name);
  
  await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
}
```

### Renew a Name

```typescript
async function renewName(
  nftId: string,
  years: number,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  const coinConfig = suinsClient.config.coins.SUI;
  const priceInfoObjectId = (
    await suinsClient.getPriceInfoObject(transaction, coinConfig.feed)
  )[0];
  
  suinsTransaction.renew({
    nft: nftId,
    years, // 1-5 years
    coinConfig,
    priceInfoObjectId, // Only required for SUI/NS
  });
  
  await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
}
```

### Create a Subname

```typescript
async function createSubname(
  parentNftId: string,
  subname: string,
  expirationMs: number,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Create subname NFT
  const subnameNft = suinsTransaction.createSubName({
    parentNft: parentNftId,
    name: subname, // e.g., 'blog' for 'blog.creator.sui'
    expirationTimestampMs: expirationMs, // Must be <= parent expiration
    allowChildCreation: true, // Can create nested subnames
    allowTimeExtension: true, // Can extend expiration
  });
  
  // Transfer subname NFT
  const targetAddress = keypair.getPublicKey().toSuiAddress();
  transaction.transferObjects(
    [subnameNft],
    transaction.pure.address(targetAddress)
  );
  
  await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
}
```

### Set Metadata (Avatar, IPFS)

```typescript
async function setNameMetadata(
  nftId: string,
  avatar: string,
  contentHash: string,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Set avatar (NFT object ID)
  suinsTransaction.setUserData({
    nft: nftId,
    key: 'avatar', // Use constant from SDK
    value: avatar,
    isSubname: false,
  });
  
  // Set IPFS content hash
  suinsTransaction.setUserData({
    nft: nftId,
    key: 'content_hash',
    value: contentHash,
    isSubname: false,
  });
  
  await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
}
```

### Complete Example: Register + Configure

```typescript
async function registerAndConfigure(
  name: string,
  years: number,
  keypair: Ed25519Keypair
) {
  const transaction = new Transaction();
  const suinsTransaction = new SuinsTransaction(suinsClient, transaction);
  
  // Get coin config
  const coinConfig = suinsClient.config.coins.SUI;
  const priceInfoObjectId = (
    await suinsClient.getPriceInfoObject(transaction, coinConfig.feed)
  )[0];
  
  // Register name
  const nft = suinsTransaction.register({
    domain: name,
    years,
    coinConfig,
    priceInfoObjectId,
  });
  
  // Set target address
  const address = keypair.getPublicKey().toSuiAddress();
  suinsTransaction.setTargetAddress({
    nft,
    address,
    isSubname: false,
  });
  
  // Set as default name
  suinsTransaction.setDefault(name);
  
  // Transfer NFT to owner
  transaction.transferObjects([nft], transaction.pure.address(address));
  
  // Execute transaction
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });
  
  return result.digest;
}
```

---

## Move Smart Contract Integration

### On-Chain Name Resolution

```move
module creator_platform::suins_integration {
    use std::string::String;
    use sui::clock::Clock;
    
    /// Import SuiNS dependencies
    use suins::suins::SuiNS;
    use suins::registry::Registry;
    use suins::domain;
    
    /// Error codes
    const ENameNotFound: u64 = 0;
    const ENameExpired: u64 = 1;
    const EInvalidTarget: u64 = 2;
    
    /// Transfer object to a SuiNS name
    public fun send_to_name<T: key + store>(
        suins: &SuiNS,
        obj: T,
        name: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Look up name in registry
        let mut optional = suins.registry<Registry>().lookup(domain::new(name));
        assert!(optional.is_some(), ENameNotFound);
        
        let name_record = optional.extract();
        
        // Verify name hasn't expired
        assert!(!name_record.has_expired(clock), ENameExpired);
        
        // Get target address
        let target_address = name_record.target_address();
        assert!(target_address.is_some(), EInvalidTarget);
        
        // Transfer object to resolved address
        transfer::public_transfer(obj, *target_address.borrow());
    }
}
```

### Creator Profile with SuiNS

```move
module creator_platform::profile {
    use std::string::String;
    use sui::clock::Clock;
    use suins::suins::SuiNS;
    use suins::suins_registration::SuinsRegistration;
    use suins::registry::Registry;
    use suins::domain;
    
    /// Creator profile linked to SuiNS name
    struct CreatorProfile has key, store {
        id: UID,
        suins_name: String,        // e.g., "creator.sui"
        suins_nft_id: ID,          // Reference to SuiNS NFT
        display_name: String,
        bio: String,
        verified: bool,
    }
    
    /// Create profile with owned SuiNS name
    public entry fun create_profile(
        suins_nft: SuinsRegistration,
        display_name: String,
        bio: String,
        ctx: &mut TxContext
    ) {
        let nft_id = object::id(&suins_nft);
        let name = suins_nft.domain();
        
        let profile = CreatorProfile {
            id: object::new(ctx),
            suins_name: name,
            suins_nft_id: nft_id,
            display_name,
            bio,
            verified: false,
        };
        
        let sender = tx_context::sender(ctx);
        
        // Store NFT with profile or in separate collection
        transfer::public_transfer(suins_nft, sender);
        transfer::transfer(profile, sender);
    }
    
    /// Verify profile owns the SuiNS name on-chain
    public fun verify_profile_name(
        profile: &CreatorProfile,
        suins: &SuiNS,
        clock: &Clock
    ): bool {
        let domain_name = domain::new(profile.suins_name);
        let mut optional = suins.registry<Registry>().lookup(domain_name);
        
        if (optional.is_none()) {
            return false
        };
        
        let name_record = optional.extract();
        
        // Check not expired and matches profile
        !name_record.has_expired(clock) && 
        name_record.nft_id() == profile.suins_nft_id
    }
}
```

---

## Payment Options

SuiNS supports three payment methods:

### 1. SUI Token
```typescript
const coinConfig = suinsClient.config.coins.SUI;
const priceInfoObjectId = (
  await suinsClient.getPriceInfoObject(transaction, coinConfig.feed)
)[0];
```

### 2. NS Token
```typescript
const coinConfig = suinsClient.config.coins.NS;
const priceInfoObjectId = (
  await suinsClient.getPriceInfoObject(transaction, coinConfig.feed)
)[0];
// Also need: coinId: '0xYourNSCoinObject'
```

### 3. USDC
```typescript
const coinConfig = suinsClient.config.coins.USDC;
// No priceInfoObjectId needed for USDC
// Need: coinId: '0xYourUSDCCoinObject'
```

---

## Best Practices

1. **Single Client Instance**: Create one `SuinsClient` instance and reuse it
2. **Error Handling**: Always wrap SDK calls in try-catch blocks
3. **Name Validation**: Validate name format before registration
4. **Expiration Checks**: Monitor and renew names before expiration
5. **Gas Budget**: Set appropriate gas budgets for transactions
6. **Network Selection**: Use testnet for development, mainnet for production

---

## Testing Example

```typescript
import { describe, it, expect } from 'vitest';

describe('SuiNS Integration', () => {
  it('should resolve name to address', async () => {
    const address = await resolveName('test.sui');
    expect(address).toMatch(/^0x[a-f0-9]{64}$/);
  });
  
  it('should reverse lookup address', async () => {
    const name = await reverseLookup('0x123...');
    expect(name).toBe('test.sui');
  });
});
```

---

## Resources

- **Official Docs**: https://docs.suins.io
- **SDK Package**: https://www.npmjs.com/package/@mysten/suins
- **GitHub**: https://github.com/mystenlabs/suins-contracts
- **Dashboard**: https://suins.io

---

## Common Issues

### Issue: Transaction fails with "Invalid coin"
**Solution**: Ensure you're using the correct coin type and have sufficient balance

### Issue: "Name already registered"
**Solution**: Check name availability first using `suinsClient.getNameObject()`

### Issue: "Expired name"
**Solution**: Names must be renewed before grace period ends (30 days after expiration)

### Issue: SDK version mismatch
**Solution**: Keep `@mysten/suins` updated: `npm update @mysten/suins`
```