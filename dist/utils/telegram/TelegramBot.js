import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
function getTokenURL(tokenAddress) {
    return "https://etherscan.io/token/" + tokenAddress;
}
function getPoolURL(poolAddress) {
    return "https://etherscan.io/address/" + poolAddress;
}
function getTxHashURLfromEtherscan(txHash) {
    return "https://etherscan.io/tx/" + txHash;
}
function getBotUrlEigenphi(address) {
    return "https://eigenphi.io/mev/ethereum/contract/" + address;
}
function getTxHashURLfromEigenPhi(txHash) {
    return "https://eigenphi.io/mev/eigentx/" + txHash;
}
function getAddressURL(buyerAddress) {
    return "https://etherscan.io/address/" + buyerAddress;
}
function formatForPrint(someNumber) {
    if (typeof someNumber === "string" && someNumber.includes(","))
        return someNumber;
    if (someNumber > 100) {
        someNumber = Number(Number(someNumber).toFixed(0)).toLocaleString();
    }
    else {
        someNumber = Number(Number(someNumber).toFixed(2)).toLocaleString();
    }
    return someNumber;
}
function getDollarAddOn(amountStr) {
    let amount = parseFloat(amountStr.replace(/,/g, ""));
    //amount = roundToNearest(amount);
    if (amount >= 1000000) {
        const millionAmount = amount / 1000000;
        if (Number.isInteger(millionAmount)) {
            return ` ($${millionAmount.toFixed(0)}M)`;
        }
        else {
            return ` ($${millionAmount.toFixed(2)}M)`;
        }
    }
    else if (amount >= 1000) {
        const thousandAmount = amount / 1000;
        if (Number.isInteger(thousandAmount)) {
            return ` ($${thousandAmount.toFixed(0)}k)`;
        }
        else {
            return ` ($${thousandAmount.toFixed(1)}k)`;
        }
    }
    else {
        return ` ($${amount.toFixed(2)})`;
    }
}
function hyperlink(link, name) {
    return "<a href='" + link + "/'> " + name + "</a>";
}
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
function shortenAddress(address) {
    return address.slice(0, 5) + ".." + address.slice(-2);
}
function shortenAddressForMevBot(address) {
    return address.slice(0, 6) + ".." + address.slice(-3);
}
export function getTransactionInfo(atomicArbDetails) {
    let txType = "";
    let transactedCoinInfo = "";
    switch (atomicArbDetails.transaction_type) {
        case "swap":
            txType = "Swap";
            const amountLeavingWallet = atomicArbDetails.coins_leaving_wallet[0].amount;
            const coinLeavingWalletUrl = getTokenURL(atomicArbDetails.coins_leaving_wallet[0].address);
            const coinLeavingWalletName = atomicArbDetails.coins_leaving_wallet[0].name;
            const amountEnteringWallet = atomicArbDetails.coins_entering_wallet[0].amount;
            const coinEnteringWalletUrl = getTokenURL(atomicArbDetails.coins_entering_wallet[0].address);
            const coinEnteringWalletName = atomicArbDetails.coins_entering_wallet[0].name;
            transactedCoinInfo = `${formatForPrint(amountLeavingWallet)}${hyperlink(coinLeavingWalletUrl, coinLeavingWalletName)} ➛ ${formatForPrint(amountEnteringWallet)}${hyperlink(coinEnteringWalletUrl, coinEnteringWalletName)}`;
            break;
        case "remove":
            txType = "Remove";
            const coinsDetailRemove = atomicArbDetails.coins_leaving_wallet.length > 0 ? atomicArbDetails.coins_leaving_wallet : atomicArbDetails.coins_entering_wallet;
            transactedCoinInfo = coinsDetailRemove.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`).join(" | ");
            break;
        case "deposit":
            txType = "Deposit";
            const coinsDetailDeposit = atomicArbDetails.coins_entering_wallet.length > 0 ? atomicArbDetails.coins_entering_wallet : atomicArbDetails.coins_leaving_wallet;
            transactedCoinInfo = coinsDetailDeposit.map((coin) => `${formatForPrint(coin.amount)}${hyperlink(getTokenURL(coin.address), coin.name)}`).join(" | ");
            break;
        default:
            return null;
    }
    return { txType, transactedCoinInfo };
}
function getBotLinkLine(atomicArbDetails) {
    const botAddress = atomicArbDetails.called_contract_by_user;
    const botUrlEigenphi = getBotUrlEigenphi(botAddress);
    const botUrlEtherscan = getAddressURL(botAddress);
    const shortenedBotAddress = shortenAddressForMevBot(botAddress);
    return `Bot ${shortenedBotAddress}:${hyperlink(botUrlEtherscan, "etherscan.io")} |${hyperlink(botUrlEigenphi, "eigenphi.io")}`;
}
function getTxLinkLine(atomicArbDetails) {
    const txHashUrlEtherscan = getTxHashURLfromEtherscan(atomicArbDetails.tx_hash);
    const txHashUrlEigenphi = getTxHashURLfromEigenPhi(atomicArbDetails.tx_hash);
    return `TxHash:${hyperlink(txHashUrlEtherscan, "etherscan.io")} |${hyperlink(txHashUrlEigenphi, "eigenphi.io")}`;
}
function getHeader(atomicArbDetails) {
    const POOL_URL_ETHERSCAN = getPoolURL(atomicArbDetails.poolAddress);
    const POOL = hyperlink(POOL_URL_ETHERSCAN, atomicArbDetails.poolName);
    const revenue = atomicArbDetails.revenue;
    const netWin = atomicArbDetails.netWin;
    if (!revenue)
        return `⚖️ atomic arb in${POOL}`;
    if (!netWin)
        return `⚖️ atomic arb in${POOL}`;
    if (!netWin)
        return `⚖️ atomic arb in${POOL}`;
    let marginSizeLabel;
    let revenueSizeLabel;
    const margin = Number((100 * (netWin / revenue)).toFixed(2));
    if (revenue < 20) {
        revenueSizeLabel = "smol";
    }
    else if (revenue < 100) {
        revenueSizeLabel = "medium";
    }
    else {
        revenueSizeLabel = "big";
    }
    if (margin < 5) {
        marginSizeLabel = "smol";
    }
    else if (margin < 25) {
        marginSizeLabel = "medium";
    }
    else {
        marginSizeLabel = "big";
    }
    const labelForCtrlF = `(margin: ${marginSizeLabel}, revenue: ${revenueSizeLabel})`;
    const formattedRevenue = revenue.toFixed(0).toLocaleString();
    return `⚖️ ${formattedRevenue}$ atomic arb in${POOL} ${labelForCtrlF}`;
}
function getProfitRevCostLine(atomicArbDetails) {
    let margin;
    if (atomicArbDetails.netWin && atomicArbDetails.netWin > 0 && atomicArbDetails.revenue) {
        margin = Number((100 * (atomicArbDetails.netWin / atomicArbDetails.revenue)).toFixed(2));
    }
    else {
        margin = "--";
    }
    let netWin;
    if (atomicArbDetails.netWin) {
        netWin = formatForPrint(atomicArbDetails.netWin);
    }
    else {
        netWin = "--";
    }
    let revenue;
    if (atomicArbDetails.revenue) {
        revenue = formatForPrint(atomicArbDetails.revenue);
    }
    else {
        revenue = "--";
    }
    let totalCost;
    if (atomicArbDetails.totalCost) {
        totalCost = formatForPrint(atomicArbDetails.totalCost);
    }
    else {
        totalCost = "--";
    }
    const profitRevCostLine = `Profit: $${netWin} | Revenue: $${revenue} | Cost: $${totalCost} | Margin: ${margin}%`;
    return profitRevCostLine;
}
function getPositionGasBribeLine(atomicArbDetails) {
    var _a;
    const gweiAmount = Number((_a = atomicArbDetails.gasInGwei) === null || _a === void 0 ? void 0 : _a.toFixed(0)) || "unkown";
    const positionInBlock = atomicArbDetails.tx_position;
    let bribe;
    if (atomicArbDetails.bribe !== null) {
        if (atomicArbDetails.bribe === 0) {
            bribe = "none";
        }
        else {
            bribe = `$${formatForPrint(atomicArbDetails.bribe)}`;
        }
    }
    else {
        bribe = "unknown";
    }
    const positionGasBribeLine = `Position: ${positionInBlock} | Gas: ${gweiAmount} Gwei | Bribe: ${bribe}`;
    return positionGasBribeLine;
}
function getBlockBuilderLine(atomicArbDetails) {
    const blockBuilderAddress = atomicArbDetails.blockBuilder;
    if (blockBuilderAddress === null)
        return `Blockbuilder: unknown`;
    let blockBuilderTag;
    const rsyncBuilder = "0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326";
    const beaverBuild = "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5";
    const flashbots = "0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5";
    const titanBuilder = "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97";
    if (blockBuilderAddress.toLowerCase() === rsyncBuilder.toLowerCase()) {
        blockBuilderTag = "rsync-builder";
    }
    else if (blockBuilderAddress.toLowerCase() === beaverBuild.toLowerCase()) {
        blockBuilderTag = "beaverbuild";
    }
    else if (blockBuilderAddress.toLowerCase() === flashbots.toLowerCase()) {
        blockBuilderTag = "Flashbots";
    }
    else if (blockBuilderAddress.toLowerCase() === titanBuilder.toLowerCase()) {
        blockBuilderTag = "Titan Builder";
    }
    else {
        blockBuilderTag = shortenAddress(blockBuilderAddress);
    }
    const etherscanUrl = getAddressURL(blockBuilderAddress);
    const blockBuilderLine = `Blockbuilder:${hyperlink(etherscanUrl, blockBuilderTag)}`;
    return blockBuilderLine;
}
function getValidatorLine(atomicArbDetails) {
    const validatorPayOut = formatForPrint(atomicArbDetails.validatorPayOffUSD);
    const validatorLine = `Block-Payout to Validator: $${validatorPayOut}`;
    return validatorLine;
}
async function buildNetWinAndBribeMessage(atomicArbDetails) {
    const blockBuilderLine = getBlockBuilderLine(atomicArbDetails);
    if (!blockBuilderLine)
        return null;
    const validatorLine = getValidatorLine(atomicArbDetails);
    const txLinkLine = getTxLinkLine(atomicArbDetails);
    const botLinkLine = getBotLinkLine(atomicArbDetails);
    return `${blockBuilderLine}
${validatorLine}
${botLinkLine}
${txLinkLine}`;
}
async function buildNetWinButNoBribeMessage(atomicArbDetails) {
    const txLinkLine = getTxLinkLine(atomicArbDetails);
    const botLinkLine = getBotLinkLine(atomicArbDetails);
    return `${botLinkLine}
${txLinkLine}`;
}
export async function buildAtomicArbMessage(atomicArbDetails, value) {
    const header = getHeader(atomicArbDetails);
    const DOLLAR_ADDON = getDollarAddOn(value.toString());
    const transactionInfo = getTransactionInfo(atomicArbDetails);
    if (!transactionInfo)
        return null;
    let { txType, transactedCoinInfo } = transactionInfo;
    const profitRevCostLine = getProfitRevCostLine(atomicArbDetails);
    const positionGasBribeLine = getPositionGasBribeLine(atomicArbDetails);
    let detailedEnding;
    const { netWin, bribe } = atomicArbDetails;
    if (netWin && !bribe) {
        detailedEnding = await buildNetWinButNoBribeMessage(atomicArbDetails);
    }
    else {
        detailedEnding = await buildNetWinAndBribeMessage(atomicArbDetails);
    }
    return `
${header}

${txType} ${transactedCoinInfo}${DOLLAR_ADDON}

${profitRevCostLine}
${positionGasBribeLine}
${detailedEnding}
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