import { buildGeneralTransactionMessage } from "../telegram/TelegramBot.js";
import { io } from "socket.io-client";
import { priceTransaction } from "../txValue/PriceTransaction.js";
import { FILTER_VALUE } from "../../GeneralSwapMonitor.js";
// const url = "http://localhost:443";
const url = "wss://api.curvemonitor.com";
const processedTxIds = new Set();
// Clear the cache every 5 minutes
setInterval(() => {
    processedTxIds.clear();
}, 5 * 60 * 1000);
export async function connectToWebsocket(eventEmitter) {
    const mainSocket = io(`${url}/main`);
    // A map to store transactions that are being delayed
    const pendingTransactions = new Map();
    mainSocket.on("connect", () => {
        console.log("connected");
        // Connect to both General Tx Livestream and Sandwich Livestream
        mainSocket.emit("connectToGeneralTxLivestream");
        mainSocket.emit("connectToGeneralSandwichLivestream");
        mainSocket.on("NewSandwich", async (enrichedSandwich) => {
            console.log("Received result: ", enrichedSandwich);
            // Remove related transactions from the pendingTransactions map
            // by looking for transactions from the frontrun, center, and backrun parts of the sandwich
            ["frontrun", "backrun"].forEach((type) => {
                const hash = enrichedSandwich[type].tx_hash;
                if (pendingTransactions.has(hash)) {
                    clearTimeout(pendingTransactions.get(hash));
                    pendingTransactions.delete(hash);
                }
            });
            enrichedSandwich.center.forEach((transaction) => {
                if (pendingTransactions.has(transaction.tx_hash)) {
                    clearTimeout(pendingTransactions.get(transaction.tx_hash));
                    pendingTransactions.delete(transaction.tx_hash);
                }
            });
        });
        mainSocket.on("NewGeneralTx", async (enrichedTransaction) => {
            console.log("enrichedTransaction", enrichedTransaction);
            // Check if the transaction has already been processed
            if (processedTxIds.has(enrichedTransaction.tx_id)) {
                return;
            }
            // Check if transaction is in pending
            if (pendingTransactions.has(enrichedTransaction.tx_hash)) {
                return;
            }
            // Start a timer that waits for 5 seconds before processing the transaction
            const timerId = setTimeout(async () => {
                // Process the transaction after 5 seconds, unless it's part of a sandwich transaction
                // If no coins were moved in the transaction, there's nothing to process
                if (enrichedTransaction.coins_leaving_wallet.length === 0 && enrichedTransaction.coins_entering_wallet.length === 0) {
                    console.log(`No Coins were moved in tx ${enrichedTransaction.tx_hash}`);
                    return;
                }
                // Add transaction id to the set of processed transactions
                processedTxIds.add(enrichedTransaction.tx_id);
                // Calculate the value of the transaction and build a message about it
                const value = await priceTransaction(enrichedTransaction);
                const WHITELISTED_POOL_ADDRESS = "0x4ebdf703948ddcea3b11f675b4d1fba9d2414a14"; // TriCRV (crvUSDETHCRV)
                if (value) {
                    if (value < FILTER_VALUE && enrichedTransaction.poolAddress.toLowerCase() !== WHITELISTED_POOL_ADDRESS) {
                        return;
                    }
                    const message = await buildGeneralTransactionMessage(enrichedTransaction, value);
                    eventEmitter.emit("newMessage", message);
                }
                else {
                    console.log(`Couldn't price transaction ${enrichedTransaction.tx_hash}`);
                }
                // After processing the transaction, remove it from the pendingTransactions map
                pendingTransactions.delete(enrichedTransaction.tx_hash);
            }, 5000); // Wait for 5 seconds
            // Add the transaction to the pendingTransactions map along with its timer
            pendingTransactions.set(enrichedTransaction.tx_hash, timerId);
        });
    });
}
//# sourceMappingURL=GeneralTxWebsocket.js.map