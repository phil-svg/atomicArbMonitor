import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { formatForPrint, getAddressURL, getBlockBuilderLine, getBlockURLfromEtherscan, getPoolURL, getTokenURL, getTxHashURLfromEtherscan, hyperlink, shortenAddressForMevBot, trimTrailingZeros, } from "./Utils.js";
import { buildNetWinAndBribeMessage, buildNetWinButNoBribeMessage, getHeader, getPositionGasBribeLine, getProfitRevCostLine, getTransactionInfo } from "./AtomicArb.js";
import { getRevenueFromBinance } from "./CexDexArb.js";
dotenv.config({ path: "../.env" });
let sentMessages = {};
export function send(bot, message, groupID) {
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
export async function buildAtomicArbMessage(atomicArbDetails) {
    const header = getHeader(atomicArbDetails);
    if (header === "filter smol stuff")
        return null;
    const transactionInfo = getTransactionInfo(atomicArbDetails);
    if (!transactionInfo)
        return null;
    const profitRevCostLine = getProfitRevCostLine(atomicArbDetails);
    const positionGasBribeLine = getPositionGasBribeLine(atomicArbDetails);
    let detailedEnding;
    const { netWin, bribe } = atomicArbDetails;
    console.log("debugging: inside buildAtomicArbMessage", atomicArbDetails);
    if (netWin && !bribe) {
        console.log("debugging: path option netWin && !bribe");
        detailedEnding = await buildNetWinButNoBribeMessage(atomicArbDetails);
    }
    else {
        detailedEnding = await buildNetWinAndBribeMessage(atomicArbDetails);
    }
    console.log("detailedEnding", detailedEnding);
    return `
${header}

${profitRevCostLine}
${positionGasBribeLine}
${detailedEnding}
`;
}
export async function buildCexDexArbMessage(enrichedCexDexDetails, binanceBestMatchingTrade) {
    const txHash = enrichedCexDexDetails.tx_hash;
    const POOL_URL_ETHERSCAN = getPoolURL(enrichedCexDexDetails.poolAddress);
    const POOL_NAME = enrichedCexDexDetails.poolName;
    const POOL = hyperlink(POOL_URL_ETHERSCAN, POOL_NAME);
    const TRADE_TX_HASH_URL_ETHERSCAN = getTxHashURLfromEtherscan(txHash);
    let tradeAmountOut = enrichedCexDexDetails.coins_leaving_wallet[0].amount;
    let tradeCoinOutUrl = getTokenURL(enrichedCexDexDetails.coins_leaving_wallet[0].address);
    let tradeNameOut = enrichedCexDexDetails.coins_leaving_wallet[0].name;
    let tradeAmountIn = enrichedCexDexDetails.coins_entering_wallet[0].amount;
    let tradeCoinInUrl = getTokenURL(enrichedCexDexDetails.coins_entering_wallet[0].address);
    let tradeNameIn = enrichedCexDexDetails.coins_entering_wallet[0].name;
    const eoaAddress = enrichedCexDexDetails.from;
    const EOA_URL_ETHERSCAN = getAddressURL(eoaAddress);
    const EOA_SHORTENED = shortenAddressForMevBot(eoaAddress);
    const BLOCK_URL = getBlockURLfromEtherscan(enrichedCexDexDetails.block_number.toString());
    const blockTag = hyperlink(BLOCK_URL, enrichedCexDexDetails.block_number.toString());
    const contractAddress = enrichedCexDexDetails.called_contract_by_user;
    const CONTRACT_URL_ETHERSCAN = getAddressURL(contractAddress);
    const CONTRACT_SHORTENED = shortenAddressForMevBot(contractAddress);
    const revenue = await getRevenueFromBinance(enrichedCexDexDetails, binanceBestMatchingTrade);
    let binanceTrade;
    if (binanceBestMatchingTrade) {
        const binanceTradeTimestamp = binanceBestMatchingTrade.time;
        const blockTimestamp = enrichedCexDexDetails.block_unixtime;
        const howManySecondsWasTheBinanceTradeBehindTheBlockTimestamp = Number((binanceTradeTimestamp / 1000 - blockTimestamp).toFixed(0));
        let timestampDeltaMessage = `${howManySecondsWasTheBinanceTradeBehindTheBlockTimestamp}s behind block`;
        if (howManySecondsWasTheBinanceTradeBehindTheBlockTimestamp < 0) {
            timestampDeltaMessage = `${howManySecondsWasTheBinanceTradeBehindTheBlockTimestamp * -1}s before block`;
        }
        const binancePrice = Number(Number(binanceBestMatchingTrade.price).toFixed(2));
        const binanceQty = Number(trimTrailingZeros(binanceBestMatchingTrade.qty));
        binanceTrade = `\nRevenue routing through Binance: ${revenue}$
Timestamp: ${timestampDeltaMessage}
Price: ${formatForPrint(binancePrice)}
Qty: ${formatForPrint(binanceQty)}
    `;
    }
    else {
        binanceTrade = `No matching Binance trade found.`;
    }
    const gasInGwei = Number((enrichedCexDexDetails.gasInGwei / 1e9).toFixed(0));
    const gasInUSD = Number(enrichedCexDexDetails.gasCostUSD.toFixed(0));
    const bribeInUSD = Number(enrichedCexDexDetails.bribeInUSD.toFixed(0));
    const totalCostUSD = gasInUSD + bribeInUSD;
    const builder = getBlockBuilderLine(enrichedCexDexDetails.builder);
    const payout = Number(enrichedCexDexDetails.blockPayoutUSD.toFixed(0));
    return `
  ⚖️${hyperlink(TRADE_TX_HASH_URL_ETHERSCAN, "cexdexarb")} spotted in${POOL}
Trade: ${formatForPrint(tradeAmountOut)}${hyperlink(tradeCoinOutUrl, tradeNameOut)} ➛ ${formatForPrint(tradeAmountIn)}${hyperlink(tradeCoinInUrl, tradeNameIn)}
Block:${blockTag} Position: ${enrichedCexDexDetails.tx_position}
Builder: ${builder} Payout: $${formatForPrint(payout)}
Cost: $${formatForPrint(totalCostUSD)} Gas: ${formatForPrint(gasInGwei)} gwei ($${formatForPrint(gasInUSD)}) Bribe: $${formatForPrint(bribeInUSD)}
Bot:${hyperlink(CONTRACT_URL_ETHERSCAN, CONTRACT_SHORTENED)}
EOA:${hyperlink(EOA_URL_ETHERSCAN, EOA_SHORTENED)} Nonce: ${formatForPrint(enrichedCexDexDetails.eoaNonce)}
${binanceTrade}
_____________________________
`;
}
export async function telegramBotMain(env, eventEmitter) {
    eventEmitter.on("newMessage", (message) => {
        if (groupID) {
            send(bot, message, parseInt(groupID));
        }
    });
    let telegramGroupToken;
    let groupID;
    if (env == "prod") {
        telegramGroupToken = process.env.TELEGRAM_ATOMIC_ARB_MONITOR_PROD_KEY;
        groupID = process.env.TELEGRAM_PROD_GROUP_ID;
    }
    if (env == "test") {
        telegramGroupToken = process.env.TELEGRAM_ATOMIC_ARB_MONITOR_TEST_KEY;
        groupID = process.env.TELEGRAM_TEST_GROUP_ID;
    }
    const bot = new TelegramBot(telegramGroupToken, { polling: true });
    bot.on("message", async (msg) => {
        if (msg && msg.text && msg.text.toLowerCase() === "atomic arb bot u with us") {
            await new Promise((resolve) => setTimeout(resolve, 500));
            bot.sendMessage(msg.chat.id, "yes ser");
        }
    });
}
//# sourceMappingURL=TelegramBot.js.map