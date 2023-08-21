import { EventEmitter } from "events";
import { telegramBotMain } from "./utils/telegram/TelegramBot.js";
import { connectToWebsocket } from "./utils/websocket/GeneralTxWebsocket.js";

console.clear();

const ENV = "prod";
// const ENV = "test";

// export const url = "http://localhost:443";
export const url = "wss://api.curvemonitor.com";

export const FILTER_VALUE = 1000000;
// export const FILTER_VALUE = 0;

const eventEmitter = new EventEmitter();

async function main() {
  await telegramBotMain(ENV, eventEmitter);
  await connectToWebsocket(eventEmitter);
}

await main();
