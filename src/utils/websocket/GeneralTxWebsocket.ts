import { TransactionDetailsForAtomicArbs } from "../../Interfaces.js";
import { buildAtomicArbMessage } from "../telegram/TelegramBot.js";
import { io } from "socket.io-client";
import { priceTransaction } from "../txValue/PriceTransaction.js";
import { FILTER_VALUE, url } from "../../AtomicArbMonitor.js";
import { solverLabels } from "../whitelisting/Whitelist.js";

const processedTxIds = new Set();

// Clear the cache every 5 minutes
setInterval(() => {
  processedTxIds.clear();
}, 5 * 60 * 1000);

export async function connectToWebsocket(eventEmitter: any) {
  const mainSocket = io(`${url}/main`);

  // A map to store transactions that are being delayed
  const pendingTransactions = new Map();

  mainSocket.on("connect", () => {
    console.log("connected");
    // Connect to atomic arb livestream
    mainSocket.emit("connectToAtomicArbLivestream");

    mainSocket.on("NewAtomicArb", async (atomicArbDetails: TransactionDetailsForAtomicArbs) => {
      console.log("enrichedTransaction", atomicArbDetails);

      // Check if the transaction has already been processed
      if (processedTxIds.has(atomicArbDetails.tx_id)) return;

      // Check if transaction is in pending
      if (pendingTransactions.has(atomicArbDetails.tx_hash)) return;

      // Start a timer that waits for 5 seconds before processing the transaction
      const timerId = setTimeout(async () => {
        // Process the transaction after 5 seconds, unless it's part of a sandwich transaction

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
          if (value < FILTER_VALUE && !whitelistedAddresses.includes(atomicArbDetails.poolAddress.toLowerCase())) {
            return;
          }
          const message = await buildAtomicArbMessage(atomicArbDetails, value);
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
    });
  });
}
