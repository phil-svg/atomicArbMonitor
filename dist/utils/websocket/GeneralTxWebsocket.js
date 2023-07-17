import { buildGeneralTransactionMessage } from "../telegram/TelegramBot.js";
import { io } from "socket.io-client";
import { priceTransaction } from "../txValue/PriceTransaction.js";
//const url = "http://localhost:443";
const url = "wss://api.curvemonitor.com";
const processedTxIds = new Set();
// Clear the cache every 5 minutes
setInterval(() => {
    processedTxIds.clear();
}, 5 * 60 * 1000);
export async function connectToWebsocket(eventEmitter) {
    const mainSocket = io(`${url}/main`);
    mainSocket.on("connect", () => {
        console.log("connected");
        mainSocket.emit("connectToGeneralTxLivestream");
        mainSocket.on("NewGeneralTx", async (enrichedTransaction) => {
            // Check if the transaction has already been processed
            if (processedTxIds.has(enrichedTransaction.tx_id)) {
                return;
            }
            if (enrichedTransaction.coins_leaving_wallet.length === 0 && enrichedTransaction.coins_entering_wallet.length === 0) {
                console.log(`No Coins were moved in tx ${enrichedTransaction.tx_hash}`);
                return;
            }
            // Add transaction id to the set of processed transactions
            processedTxIds.add(enrichedTransaction.tx_id);
            // console.log("Received new General Tx");
            // console.dir(enrichedTransaction, { depth: null, colors: true });
            const value = await priceTransaction(enrichedTransaction);
            const FILTER_VALUE = 1000000; // minimum $-value to be printed
            if (value) {
                if (value < FILTER_VALUE)
                    return;
                const message = await buildGeneralTransactionMessage(enrichedTransaction, value);
                eventEmitter.emit("newMessage", message);
            }
            else {
                console.log(`Couldn't price transaction ${enrichedTransaction.tx_hash}`);
            }
        });
    });
}
//# sourceMappingURL=GeneralTxWebsocket.js.map