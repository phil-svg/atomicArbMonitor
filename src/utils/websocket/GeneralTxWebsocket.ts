import { EnrichedCexDexDetails, Trade, TransactionDetailsForAtomicArbs } from "../../Interfaces.js";
import { buildAtomicArbMessage, buildCexDexArbMessage } from "../telegram/TelegramBot.js";
import { io } from "socket.io-client";
import { priceTransaction } from "../txValue/PriceTransaction.js";
import { url } from "../../AtomicArbMonitor.js";
import { solverLabels } from "../whitelisting/Whitelist.js";

const processedTxIds = new Set<number>();

// Clear the cache every 5 minutes
setInterval(() => {
  processedTxIds.clear();
}, 5 * 60 * 1000);

export async function handleNewAtomicArb(atomicArbDetails: TransactionDetailsForAtomicArbs, processedTxIds: Set<number>, pendingTransactions: Map<string, any>, eventEmitter: any) {
  // Check if the transaction has already been processed
  if (processedTxIds.has(atomicArbDetails.tx_id)) return;

  // Check if transaction is in pending
  if (pendingTransactions.has(atomicArbDetails.tx_hash)) return;

  // Start a timer that waits for 5 seconds before processing the transaction
  const timerId = setTimeout(async () => {
    // Process the transaction after 5 seconds, unless it's part of a sandwich transaction
    // Check if 'coins_leaving_wallet' and 'coins_entering_wallet' exist and are arrays
    if (!Array.isArray(atomicArbDetails.coins_leaving_wallet) || !Array.isArray(atomicArbDetails.coins_entering_wallet)) {
      console.log(`Invalid or missing coins data in tx ${atomicArbDetails.tx_hash}`);
      return;
    }

    // If no coins were moved in the transaction, there's nothing to process
    if (atomicArbDetails.coins_leaving_wallet.length === 0 && atomicArbDetails.coins_entering_wallet.length === 0) {
      console.log(`No Coins were moved in tx ${atomicArbDetails.tx_hash}`);
      return;
    }

    // Add transaction id to the set of processed transactions
    processedTxIds.add(atomicArbDetails.tx_id);

    // Calculate the value of the transaction and build a message about it
    const value = await priceTransaction(atomicArbDetails);

    const whitelistedAddresses = solverLabels.map((solver) => solver.Address.toLowerCase());

    if (value) {
      if (!whitelistedAddresses.includes(atomicArbDetails.poolAddress.toLowerCase())) return;
      const message = await buildAtomicArbMessage(atomicArbDetails);
      if (!message) return;
      eventEmitter.emit("newMessage", message);
    } else {
      console.log(`Couldn't price transaction ${atomicArbDetails.tx_hash}`);
    }

    // After processing the transaction, remove it from the pendingTransactions map
    pendingTransactions.delete(atomicArbDetails.tx_hash);
  }, 5000); // Wait for 5 seconds

  // Add the transaction to the pendingTransactions map along with its timer
  pendingTransactions.set(atomicArbDetails.tx_hash, timerId);
}

export async function handleNewCexDexArb(
  enrichedCexDexDetails: EnrichedCexDexDetails,
  binanceBestMatchingTrade: Trade | null,
  processedTxIds: Set<number>,
  pendingTransactions: Map<string, any>,
  eventEmitter: any
) {
  // Check if the transaction has already been processed
  if (processedTxIds.has(enrichedCexDexDetails.tx_id)) return;

  // Check if transaction is in pending
  if (pendingTransactions.has(enrichedCexDexDetails.tx_hash)) return;

  // Start a timer that waits for 5 seconds before processing the transaction
  const timerId = setTimeout(async () => {
    // Process the transaction after 5 seconds, unless it's part of a sandwich transaction
    // Check if 'coins_leaving_wallet' and 'coins_entering_wallet' exist and are arrays
    if (!Array.isArray(enrichedCexDexDetails.coins_leaving_wallet) || !Array.isArray(enrichedCexDexDetails.coins_entering_wallet)) {
      console.log(`Invalid or missing coins data in tx ${enrichedCexDexDetails.tx_hash}`);
      return;
    }

    // If no coins were moved in the transaction, there's nothing to process
    if (enrichedCexDexDetails.coins_leaving_wallet.length === 0 && enrichedCexDexDetails.coins_entering_wallet.length === 0) {
      console.log(`No Coins were moved in tx ${enrichedCexDexDetails.tx_hash}`);
      return;
    }

    // Add transaction id to the set of processed transactions
    processedTxIds.add(enrichedCexDexDetails.tx_id);

    // Calculate the value of the transaction and build a message about it
    const value = await priceTransaction(enrichedCexDexDetails);

    if (value) {
      const message = await buildCexDexArbMessage(enrichedCexDexDetails, binanceBestMatchingTrade);
      if (!message) return;
      eventEmitter.emit("newMessage", message);
    } else {
      console.log(`Couldn't price transaction ${enrichedCexDexDetails.tx_hash}`);
    }

    // After processing the transaction, remove it from the pendingTransactions map
    pendingTransactions.delete(enrichedCexDexDetails.tx_hash);
  }, 5000); // Wait for 5 seconds

  // Add the transaction to the pendingTransactions map along with its timer
  pendingTransactions.set(enrichedCexDexDetails.tx_hash, timerId);
}

export async function connectToWebsocket(eventEmitter: any) {
  const mainSocket = io(`${url}/main`);
  const pendingTransactions = new Map<string, any>();

  mainSocket.on("connect", () => {
    console.log("connected");
    mainSocket.emit("connectToAtomicArbLivestream");
    // mainSocket.emit("connectToCexDexArbLivestream");

    mainSocket.on("NewAtomicArb", async (atomicArbDetails: TransactionDetailsForAtomicArbs) => {
      await handleNewAtomicArb(atomicArbDetails, processedTxIds, pendingTransactions, eventEmitter);
    });
  });

  // mainSocket.on("NewCexDexArb", async (enrichedCexDexDetails: EnrichedCexDexDetails, binanceBestMatchingTrade: Trade | null) => {
  //   console.log("NewCexDexArb picked up:", enrichedCexDexDetails, binanceBestMatchingTrade);
  //   await handleNewCexDexArb(enrichedCexDexDetails, binanceBestMatchingTrade, processedTxIds, pendingTransactions, eventEmitter);
  // });
}
