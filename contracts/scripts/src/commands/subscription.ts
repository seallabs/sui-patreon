import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { getSuiClient, getKeypair, getAddress } from '../utils/client.js';
import { config } from '../utils/config.js';
import {
  printSuccess,
  printError,
  printInfo,
  printTransactionResult,
  extractObjectId,
  suiToMist,
  formatSUI,
} from '../utils/helpers.js';
import chalk from 'chalk';
import ora from 'ora';

export async function createTier(
  name: string,
  description: string,
  priceInSui: number
): Promise<void> {
  if (!config.packageId) {
    printError('PACKAGE_ID not set in environment. Please deploy the contract first.');
    process.exit(1);
  }

  const spinner = ora('Creating subscription tier...').start();

  try {
    const client = getSuiClient();
    const keypair = getKeypair();

    const priceInMist = suiToMist(priceInSui);

    const tx = new Transaction();

    // Call create_tier function
    const tier = tx.moveCall({
      target: `${config.packageId}::subscription::create_tier`,
      arguments: [tx.pure.string(name), tx.pure.string(description), tx.pure.u64(priceInMist)],
    });

    // Share the tier object to make it publicly accessible
    tx.moveCall({
      target: '0x2::transfer::public_share_object',
      typeArguments: [`${config.packageId}::subscription::SubscriptionTier`],
      arguments: [tier],
    });

    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    spinner.stop();

    if (result.effects?.status.status === 'success') {
      printSuccess('Subscription tier created successfully!');

      const tierId = extractObjectId(result, 0);
      if (tierId) {
        printInfo(`Tier Object ID: ${tierId}`);
        printInfo(`Name: ${name}`);
        printInfo(`Price: ${priceInSui} SUI`);
      }

      printTransactionResult(result);
    } else {
      printError('Failed to create tier');
      printTransactionResult(result);
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    printError(`Error creating tier: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export async function updateTierPrice(tierId: string, newPriceInSui: number): Promise<void> {
  if (!config.packageId) {
    printError('PACKAGE_ID not set in environment. Please deploy the contract first.');
    process.exit(1);
  }

  const spinner = ora('Updating tier price...').start();

  try {
    const client = getSuiClient();
    const keypair = getKeypair();

    const priceInMist = suiToMist(newPriceInSui);

    const tx = new Transaction();

    // Call update_tier_price function
    tx.moveCall({
      target: `${config.packageId}::subscription::update_tier_price`,
      arguments: [tx.object(tierId), tx.pure.u64(priceInMist)],
    });

    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    spinner.stop();

    if (result.effects?.status.status === 'success') {
      printSuccess('Tier price updated successfully!');
      printInfo(`New Price: ${newPriceInSui} SUI`);
      printTransactionResult(result);
    } else {
      printError('Failed to update tier price');
      printTransactionResult(result);
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    printError(
      `Error updating tier price: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export async function deactivateTier(tierId: string): Promise<void> {
  if (!config.packageId) {
    printError('PACKAGE_ID not set in environment. Please deploy the contract first.');
    process.exit(1);
  }

  const spinner = ora('Deactivating tier...').start();

  try {
    const client = getSuiClient();
    const keypair = getKeypair();

    const tx = new Transaction();

    // Call deactivate_tier function
    tx.moveCall({
      target: `${config.packageId}::subscription::deactivate_tier`,
      arguments: [tx.object(tierId)],
    });

    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    spinner.stop();

    if (result.effects?.status.status === 'success') {
      printSuccess('Tier deactivated successfully!');
      printTransactionResult(result);
    } else {
      printError('Failed to deactivate tier');
      printTransactionResult(result);
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    printError(
      `Error deactivating tier: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export async function purchaseSubscription(tierId: string, paymentCoinId: string): Promise<void> {
  if (!config.packageId) {
    printError('PACKAGE_ID not set in environment. Please deploy the contract first.');
    process.exit(1);
  }

  const spinner = ora('Purchasing subscription...').start();

  try {
    const client = getSuiClient();
    const keypair = getKeypair();

    const tx = new Transaction();

    // Call purchase_subscription entry function
    tx.moveCall({
      target: `${config.packageId}::subscription::purchase_subscription`,
      arguments: [tx.object(tierId), coinWithBalance({ balance: 10000000 })],
    });

    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    spinner.stop();

    if (result.effects?.status.status === 'success') {
      printSuccess('Subscription purchased successfully!');

      const subscriptionId = extractObjectId(result, 0);
      if (subscriptionId) {
        printInfo(`Subscription Object ID: ${subscriptionId}`);
      }

      printTransactionResult(result);
    } else {
      printError('Failed to purchase subscription');
      printTransactionResult(result);
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    printError(
      `Error purchasing subscription: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export async function getTier(tierId: string): Promise<void> {
  const spinner = ora('Fetching tier...').start();

  try {
    const client = getSuiClient();

    const object = await client.getObject({
      id: tierId,
      options: {
        showContent: true,
      },
    });

    spinner.stop();

    if (object.data?.content && object.data.content.dataType === 'moveObject') {
      const fields = object.data.content.fields as any;

      console.log('\n' + chalk.bold('Subscription Tier:'));
      console.log(chalk.gray('─'.repeat(50)));
      printInfo(`Tier ID: ${tierId}`);
      printInfo(`Creator: ${fields.creator}`);
      printInfo(`Name: ${fields.name}`);
      printInfo(`Description: ${fields.description}`);
      printInfo(`Price: ${formatSUI(fields.price_monthly)} SUI/month`);
      printInfo(`Active: ${fields.is_active}`);
      printInfo(`Created At: ${new Date(Number(fields.created_at)).toISOString()}`);
      console.log(chalk.gray('─'.repeat(50)) + '\n');
    } else {
      printError('Tier not found or invalid object type');
    }
  } catch (error) {
    spinner.stop();
    printError(`Error fetching tier: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export async function getSubscription(subscriptionId: string): Promise<void> {
  const spinner = ora('Fetching subscription...').start();

  try {
    const client = getSuiClient();

    const object = await client.getObject({
      id: subscriptionId,
      options: {
        showContent: true,
      },
    });

    spinner.stop();

    if (object.data?.content && object.data.content.dataType === 'moveObject') {
      const fields = object.data.content.fields as any;

      const now = Date.now();
      const expiresAt = Number(fields.expires_at);
      const isActive = now < expiresAt;

      console.log('\n' + chalk.bold('Active Subscription:'));
      console.log(chalk.gray('─'.repeat(50)));
      printInfo(`Subscription ID: ${subscriptionId}`);
      printInfo(`Subscriber: ${fields.subscriber}`);
      printInfo(`Creator: ${fields.creator}`);
      printInfo(`Tier ID: ${fields.tier_id}`);
      printInfo(`Tier Name: ${fields.tier_name}`);
      printInfo(`Started At: ${new Date(Number(fields.started_at)).toISOString()}`);
      printInfo(`Expires At: ${new Date(expiresAt).toISOString()}`);

      if (isActive) {
        printSuccess(`Status: Active`);
      } else {
        printError(`Status: Expired`);
      }

      console.log(chalk.gray('─'.repeat(50)) + '\n');
    } else {
      printError('Subscription not found or invalid object type');
    }
  } catch (error) {
    spinner.stop();
    printError(
      `Error fetching subscription: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export async function listMySubscriptions(): Promise<void> {
  if (!config.packageId) {
    printError('PACKAGE_ID not set in environment.');
    process.exit(1);
  }

  const spinner = ora('Fetching your subscriptions...').start();

  try {
    const client = getSuiClient();
    const address = getAddress();

    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${config.packageId}::subscription::ActiveSubscription`,
      },
      options: {
        showContent: true,
      },
    });

    spinner.stop();

    if (objects.data.length === 0) {
      printInfo('No subscriptions found for your address.');
      return;
    }

    const now = Date.now();

    console.log('\n' + chalk.bold(`Your Subscriptions (${objects.data.length}):`));
    console.log(chalk.gray('─'.repeat(50)));

    for (const obj of objects.data) {
      if (obj.data?.content && obj.data.content.dataType === 'moveObject') {
        const fields = obj.data.content.fields as any;
        const expiresAt = Number(fields.expires_at);
        const isActive = now < expiresAt;

        console.log(chalk.cyan(`\n${fields.tier_name}`));
        printInfo(`  ID: ${obj.data.objectId}`);
        printInfo(`  Creator: ${fields.creator}`);
        printInfo(`  Expires: ${new Date(expiresAt).toISOString()}`);

        if (isActive) {
          printSuccess(`  Status: Active`);
        } else {
          printError(`  Status: Expired`);
        }
      }
    }

    console.log(chalk.gray('─'.repeat(50)) + '\n');
  } catch (error) {
    spinner.stop();
    printError(
      `Error fetching subscriptions: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
