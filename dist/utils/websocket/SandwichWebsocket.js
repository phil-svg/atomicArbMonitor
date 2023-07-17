import { buildGeneralTransactionMessage } from "../../utils/telegram/TelegramBot.js";
import { io } from "socket.io-client";
//const url = "http://localhost:443";
const url = "wss://api.curvemonitor.com";
export async function connectToWebsocket(eventEmitter) {
    const mainSocket = io(`${url}/main`);
    mainSocket.on("connect", () => {
        console.log("connected");
        mainSocket.emit("connectToGeneralTxLivestream");
        mainSocket.on("NewGeneralTx", async (enrichedTransaction) => {
            console.log("Received new General Tx");
            console.dir(enrichedTransaction, { depth: null, colors: true });
            const message = await buildGeneralTransactionMessage(enrichedTransaction);
            eventEmitter.emit("newMessage", message);
        });
    });
}
//# sourceMappingURL=SandwichWebsocket.js.map