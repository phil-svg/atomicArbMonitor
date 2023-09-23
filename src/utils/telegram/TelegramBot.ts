import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { EventEmitter } from "events";
import { labels } from "../../Labels.js";
import { EnrichedTransactionDetail } from "../../Interfaces.js";
import { solverLabels } from "../whitelisting/Whitelist.js";
import { readFileAsync } from "../websocket/GeneralTxWebsocket.js";
dotenv.config({ path: "../.env" });

async function getLastSeenValues() {
  try {
    const data = JSON.parse(await readFileAsync("lastSeen.json", "utf-8"));
    return {
      txHash: data.txHash,
      txTimestamp: new Date(data.txTimestamp),
    };
  } catch (error) {
    console.error("Error reading last seen data from file:", error);
    return null;
  }
}

function getTokenURL(tokenAddress: string): string {
  return "https://etherscan.io/token/" + tokenAddress;
}

function getPoolURL(poolAddress: string) {
  return "https://etherscan.io/address/" + poolAddress;
}

function getTxHashURLfromEtherscan(txHash: string) {
  return "https://etherscan.io/tx/" + txHash;
}

function getTxHashURLfromEigenPhi(txHash: string) {
  return "https://eigenphi.io/mev/eigentx/" + txHash;
}

function getBuyerURL(buyerAddress: string) {
  return "https://etherscan.io/address/" + buyerAddress;
}

function formatForPrint(someNumber: any) {
  if (typeof someNumber === "string" && someNumber.includes(",")) return someNumber;
  if (someNumber > 100) {
    someNumber = Number(Number(someNumber).toFixed(0)).toLocaleString();
  } else {
    someNumber = Number(Number(someNumber).toFixed(2)).toLocaleString();
  }
  return someNumber;
}

function getShortenNumber(amountStr: any) {
  let amount = parseFloat(amountStr.replace(/,/g, ""));
  //amount = roundToNearest(amount);
  if (amount >= 1000000) {
    const millionAmount = amount / 1000000;
    if (Number.isInteger(millionAmount)) {
      return `${millionAmount.toFixed(0)}M`;
    } else {
      return `${millionAmount.toFixed(2)}M`;
    }
  } else if (amount >= 1000) {
    const thousandAmount = amount / 1000;
    if (Number.isInteger(thousandAmount)) {
      return `${thousandAmount.toFixed(0)}k`;
    } else {
      return `${thousandAmount.toFixed(1)}k`;
    }
  } else {
    return `${amount.toFixed(2)}`;
  }
}

function getDollarAddOn(amountStr: any) {
  let amount = parseFloat(amountStr.replace(/,/g, ""));
  //amount = roundToNearest(amount);
  if (amount >= 1000000) {
    const millionAmount = amount / 1000000;
    if (Number.isInteger(millionAmount)) {
      return ` ($${millionAmount.toFixed(0)}M)`;
    } else {
      return ` ($${millionAmount.toFixed(2)}M)`;
    }
  } else if (amount >= 1000) {
    const thousandAmount = amount / 1000;
    if (Number.isInteger(thousandAmount)) {
      return ` ($${thousandAmount.toFixed(0)}k)`;
    } else {
      return ` ($${thousandAmount.toFixed(1)}k)`;
    }
  } else {
    return ` ($${amount.toFixed(2)})`;
  }
}

type SolverLookup = { [address: string]: string };
const solverLookup: SolverLookup = solverLabels.reduce((acc: SolverLookup, solver) => {
  acc[solver.Address.toLowerCase()] = solver.Label;
  return acc;
}, {});

function hyperlink(link: string, name: string): string {
  return "<a href='" + link + "/'> " + name + "</a>";
}

let sentMessages: Record<string, boolean> = {};
export function send(bot: any, message: string, groupID: number) {
  const key = `${groupID}:${message}`;

  if (sentMessages[key]) {
    // console.log("This message has already been sent to this group in the past 30 seconds.");
    return;
  }

  bot.sendMessage(groupID, message, { parse_mode: "HTML", disable_web_page_preview: "true" });

  if (!message.startsWith("last seen")) {
    // Track the message as sent
    sentMessages[key] = true;

    // Delete the message from tracking after 30 seconds
    setTimeout(() => {
      delete sentMessages[key];
    }, 30000); // 30000 ms = 30 seconds
  }
}

function shortenAddress(address: string): string {
  return address.slice(0, 5) + ".." + address.slice(-2);
}

function getAddressName(address: string): string {
  // Find label for address
  const labelObject = labels.find((label: { Address: string }) => label.Address.toLowerCase() === address.toLowerCase());

  // If label found, return it. Otherwise, return shortened address
  return labelObject ? labelObject.Label : shortenAddress(address);
}

export async function buildGeneralTransactionMessage(enrichedTransaction: EnrichedTransactionDetail, value: number) {
  const POOL_URL_ETHERSCAN = getPoolURL(enrichedTransaction.poolAddress);
  const POOL = hyperlink(POOL_URL_ETHERSCAN, enrichedTransaction.poolName);
  const DOLLAR_ADDON = getDollarAddOn(value.toString());
  const solverURL = getBuyerURL(enrichedTransaction.from);
  let shortenSolver = getAddressName(enrichedTransaction.from);
  const LABEL_URL_ETHERSCAN = getPoolURL(enrichedTransaction.called_contract_by_user);

  const txHashUrl = getTxHashURLfromEtherscan(enrichedTransaction.tx_hash);

  let labelName = enrichedTransaction.calledContractLabel;
  if (labelName.startsWith("0x") && labelName.length === 42) {
    labelName = shortenAddress(labelName);
  }

  let transactedCoinInfo = "";
  let txType = "";

  if (enrichedTransaction.transaction_type === "swap") {
    txType = "Swap";
    let amountLeavingWallet = enrichedTransaction.coins_leaving_wallet[0].amount;
    let coinLeavingWalletUrl = getTokenURL(enrichedTransaction.coins_leaving_wallet[0].address);
    let coinLeavingWalletName = enrichedTransaction.coins_leaving_wallet[0].name;
    let amountEnteringWallet = enrichedTransaction.coins_entering_wallet[0].amount;
    let coinEnteringWalletUrl = getTokenURL(enrichedTransaction.coins_entering_wallet[0].address);
    let coinEnteringWalletName = enrichedTransaction.coins_entering_wallet[0].name;
    transactedCoinInfo = `${formatForPrint(amountLeavingWallet)}${hyperlink(coinLeavingWalletUrl, coinLeavingWalletName)} ➛ ${formatForPrint(amountEnteringWallet)}${hyperlink(
      coinEnteringWalletUrl,
      coinEnteringWalletName
    )}`;
  } else if (enrichedTransaction.transaction_type === "remove") {
    txType = "Remove";
    let coinsDetail = [];
    if (enrichedTransaction.coins_leaving_wallet.length > 0) {
      coinsDetail = enrichedTransaction.coins_leaving_wallet.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`);
    } else {
      coinsDetail = enrichedTransaction.coins_entering_wallet.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`);
    }
    transactedCoinInfo = `${coinsDetail.join(" | ")}`;
  } else if (enrichedTransaction.transaction_type === "deposit") {
    txType = "Deposit";
    let coinsDetail = [];
    if (enrichedTransaction.coins_entering_wallet.length > 0) {
      coinsDetail = enrichedTransaction.coins_entering_wallet.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`);
    } else {
      coinsDetail = enrichedTransaction.coins_leaving_wallet.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`);
    }
    transactedCoinInfo = `${coinsDetail.join(" | ")}`;
  } else {
    return null;
  }

  let actorType = "User";
  let actorURL = getBuyerURL(enrichedTransaction.trader);
  let shortenActor = getAddressName(enrichedTransaction.trader);
  let emoji = "🦙🦙🦙";

  // check if the from address is a solver
  let solverLabel = solverLookup[enrichedTransaction.from.toLowerCase()];
  if (solverLabel) {
    actorType = "Solver";
    actorURL = getBuyerURL(enrichedTransaction.from);
    shortenActor = solverLabel;
    emoji = "🐮🐮🐮";
  }

  return `
    🚀${txType} ${transactedCoinInfo}${DOLLAR_ADDON}
Links:${POOL} |${hyperlink(txHashUrl, "etherscan.io")}
${actorType}:${hyperlink(actorURL, shortenActor)} called Contract:${hyperlink(LABEL_URL_ETHERSCAN, labelName)} ${emoji}
  `;
}

function getTimeMessage(timestamp: Date): string {
  if (!timestamp) return "never seen"; // If no transaction was seen

  const differenceInSeconds = (new Date().getTime() - timestamp.getTime()) / 1000;

  if (differenceInSeconds < 60) {
    const seconds = Math.floor(differenceInSeconds);
    return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
  }
  if (differenceInSeconds < 3600) {
    const minutes = Math.floor(differenceInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  const hours = Math.floor(differenceInSeconds / 3600);
  return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function getLastSeenMessage(txHash: string, timestamp: Date) {
  const timeMessage = getTimeMessage(timestamp);
  const message = `I've last seen a${hyperlink(getTxHashURLfromEtherscan(txHash), "tx")} ${timeMessage} ser`;
  return message;
}

let intervalId: NodeJS.Timeout | null = null;

async function getLastSeenMessageContent(): Promise<string> {
  const lastSeenValues = await getLastSeenValues();

  if (!lastSeenValues || !lastSeenValues.txHash) {
    return "dunno";
  }

  return getLastSeenMessage(lastSeenValues.txHash, lastSeenValues.txTimestamp);
}

// prints sharpy updates at h:00, h:15, h:30, h:45
async function botMonitoringIntervalPrint(bot: any) {
  // If the interval is already set, return immediately.
  if (intervalId) return;

  const groupID = -1001929399603;

  const sendBotMessage = async () => {
    const message = await getLastSeenMessageContent();
    bot.sendMessage(groupID, message, { parse_mode: "HTML", disable_web_page_preview: "true" });
  };

  const currentMinute = new Date().getMinutes();
  let minutesUntilNextQuarter = 15 - (currentMinute % 15);
  let timeoutDuration = minutesUntilNextQuarter * 60 * 1000; // Duration until next quarter hour in milliseconds.

  setTimeout(() => {
    sendBotMessage();
    intervalId = setInterval(sendBotMessage, 15 * 60 * 1000); // Set 15 minutes interval after the first message.
  }, timeoutDuration);
}

export async function processLastSeen(eventEmitter: EventEmitter) {
  const message = await getLastSeenMessageContent();
  eventEmitter.emit("newMessage", message);
}

export async function telegramBotMain(env: string, eventEmitter: EventEmitter) {
  eventEmitter.on("newMessage", (message: string) => {
    if (groupID) {
      send(bot, message, parseInt(groupID));
    }
  });

  let telegramGroupToken: string | undefined;
  let groupID: string | undefined;

  if (env == "prod") {
    telegramGroupToken = process.env.TELEGRAM_GENERAL_SWAP_MONITOR_PROD_KEY!;
    groupID = process.env.TELEGRAM_PROD_GROUP_ID!;
  }
  if (env == "test") {
    telegramGroupToken = process.env.TELEGRAM_GENERAL_SWAP_MONITOR_TEST_KEY!;
    groupID = process.env.TELEGRAM_TEST_GROUP_ID!;
  }

  const bot = new TelegramBot(telegramGroupToken!, { polling: true });

  botMonitoringIntervalPrint(bot);

  bot.on("message", async (msg: any) => {
    if (msg && msg.text && msg.text.toLowerCase() === "bot u with us") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      bot.sendMessage(msg.chat.id, "yes ser");
    }
    if (msg && msg.text && msg.text.toLowerCase() === "print last seen") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await processLastSeen(eventEmitter);
    }
  });
}

/*
Example: Swap
{
  tx_id: 116337,
  pool_id: 661,
  event_id: 356534,
  tx_hash: '0xd11de3abb91b46cd89650d9b53b6fb868fb6fec8ef8cd7888c4f00dab1f4c8f1',
  block_number: 17684493,
  block_unixtime: '1689250271',
  transaction_type: 'swap',
  called_contract_by_user: '0x24902AA0cf0000a08c0EA0b003B0c0bF600000E0',
  trader: '0x24902AA0cf0000a08c0EA0b003B0c0bF600000E0',
  tx_position: 25,
  coins_leaving_wallet: [
    {
      coin_id: 382,
      amount: '42302.896060570900000',
      name: 'crvUSD',
      address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E'
    }
  ],
  coins_entering_wallet: [
    {
      coin_id: 358,
      amount: '42294.438190000000000',
      name: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  ],
  poolAddress: '0x390f3595bCa2Df7d23783dFd126427CCeb997BF4',
  poolName: 'crvUSD/USDT'
}

Example: Remove
{
  tx_id: 116336,
  pool_id: 197,
  event_id: 356533,
  tx_hash: '0xa2b78b43cca3b51b9ab3e0f966b794c91833c57e56e8fdcbc6cdb52305f8003a',
  block_number: 17684486,
  block_unixtime: '1689250187',
  transaction_type: 'remove',
  called_contract_by_user: '0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5',
  trader: '0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5',
  tx_position: 45,
  coins_leaving_wallet: [
    {
      coin_id: 106,
      amount: '3343.670875000000000',
      name: 'BEAN',
      address: '0xBEA0000029AD1c77D3d5D23Ba2D8893dB9d1Efab'
    }
  ],
  coins_entering_wallet: [],
  poolAddress: '0xc9C32cd16Bf7eFB85Ff14e0c8603cc90F6F2eE49',
  poolName: 'Bean'
}

Example: Deposit
{
  tx_id: 116331,
  pool_id: 664,
  event_id: 356526,
  tx_hash: '0xeb2d84d3fea03c38afd319c053271fece89f9e8db0c8374742fd316518573522',
  block_number: 17684472,
  block_unixtime: '1689250019',
  transaction_type: 'deposit',
  called_contract_by_user: '0x369cBC5C6f139B1132D3B91B87241B37Fc5B971f',
  trader: '0x369cBC5C6f139B1132D3B91B87241B37Fc5B971f',
  tx_position: 129,
  coins_leaving_wallet: [],
  coins_entering_wallet: [
    {
      coin_id: 382,
      amount: '67848.496556505910000',
      name: 'crvUSD',
      address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E'
    }
  ],
  poolAddress: '0x0CD6f267b2086bea681E922E19D40512511BE538',
  poolName: 'crvUSD/Frax'
}
*/
