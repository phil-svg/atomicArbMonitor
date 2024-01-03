import { AtomicArbDetailType, TransactionDetailsForAtomicArbs } from "../../Interfaces.js";
import { formatForPrint, getBlockBuilderLine, getPoolURL, getTokenURL, getTxHashURLfromEigenPhi, getTxHashURLfromEtherscan, hyperlink } from "./Utils.js";

export function getTransactionInfo(atomicArbDetails: AtomicArbDetailType): { txType: string; transactedCoinInfo: string } | null {
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
      transactedCoinInfo = `${formatForPrint(amountLeavingWallet)}${hyperlink(coinLeavingWalletUrl, coinLeavingWalletName)} ➛ ${formatForPrint(amountEnteringWallet)}${hyperlink(
        coinEnteringWalletUrl,
        coinEnteringWalletName
      )}`;
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

export function getHeader(atomicArbDetails: TransactionDetailsForAtomicArbs): string {
  const POOL_URL_ETHERSCAN = getPoolURL(atomicArbDetails.poolAddress);
  const POOL = hyperlink(POOL_URL_ETHERSCAN, atomicArbDetails.poolName);
  const revenue = atomicArbDetails.revenue;
  const netWin = atomicArbDetails.netWin;

  if (!revenue) return `⚖️ atomic arb in${POOL}`;
  if (!netWin) return `⚖️ atomic arb in${POOL}`;

  let marginSizeLabel;
  let revenueSizeLabel;

  const margin = Number((100 * (netWin / revenue)).toFixed(2));

  if (revenue < 200) {
    revenueSizeLabel = "smol";
  } else if (revenue < 800) {
    revenueSizeLabel = "medium";
  } else {
    revenueSizeLabel = "big";
  }

  if (margin < 5) {
    marginSizeLabel = "smol";
  } else if (margin < 25) {
    marginSizeLabel = "medium";
  } else {
    marginSizeLabel = "big";
  }

  if (revenueSizeLabel === "smol") return "filter smol stuff";
  // if (marginSizeLabel === "smol" && revenueSizeLabel === "smol") return "filter smol stuff";

  const labelForCtrlF = `(margin: ${marginSizeLabel}, revenue: ${revenueSizeLabel})`;

  const formattedRevenue = Number(Number(revenue).toFixed(0)).toLocaleString();

  return `⚖️ ${formattedRevenue}$ atomic arb in${POOL} ${labelForCtrlF}`;
}

export function getTxLinkLine(atomicArbDetails: TransactionDetailsForAtomicArbs): string {
  const txHashUrlEtherscan = getTxHashURLfromEtherscan(atomicArbDetails.tx_hash);
  const txHashUrlEigenphi = getTxHashURLfromEigenPhi(atomicArbDetails.tx_hash);

  return `TxHash:${hyperlink(txHashUrlEtherscan, "etherscan.io")} |${hyperlink(txHashUrlEigenphi, "eigenphi.io")}`;
}

export function getProfitRevCostLine(atomicArbDetails: TransactionDetailsForAtomicArbs): string {
  let margin: number | "--";
  if (atomicArbDetails.netWin && atomicArbDetails.netWin > 0 && atomicArbDetails.revenue) {
    margin = Number((100 * (atomicArbDetails.netWin / atomicArbDetails.revenue)).toFixed(0));
  } else {
    margin = "--";
  }

  let netWin: number | "--";
  if (atomicArbDetails.netWin) {
    netWin = formatForPrint(Number(atomicArbDetails.netWin.toFixed(0)));
  } else {
    netWin = "--";
  }

  let revenue: number | "--";
  if (atomicArbDetails.revenue) {
    revenue = formatForPrint(atomicArbDetails.revenue);
  } else {
    revenue = "--";
  }

  let totalCost: number | "--";
  if (atomicArbDetails.totalCost) {
    totalCost = formatForPrint(Number(atomicArbDetails.totalCost).toFixed(0));
  } else {
    totalCost = "--";
  }

  const profitRevCostLine = `Profit: $${netWin} | Revenue: $${revenue} | Cost: $${totalCost} | Margin: ${margin}%`;
  return profitRevCostLine;
}

export function getPositionGasBribeLine(atomicArbDetails: TransactionDetailsForAtomicArbs): string {
  const gweiAmount = Number(atomicArbDetails.gasInGwei?.toFixed(0)) || "unkown";
  const positionInBlock = atomicArbDetails.tx_position;

  let bribe;
  if (atomicArbDetails.bribe !== null) {
    if (atomicArbDetails.bribe === 0) {
      bribe = "none";
    } else {
      bribe = `$${formatForPrint(atomicArbDetails.bribe)}`;
    }
  } else {
    bribe = "unknown";
  }

  let positionGasBribeLine;
  if (bribe === "none") {
    positionGasBribeLine = `Position: ${positionInBlock} | Gas: ${gweiAmount} Gwei`;
  } else {
    positionGasBribeLine = `Position: ${positionInBlock} | Gas: ${gweiAmount} Gwei | Bribe: ${bribe}`;
  }
  return positionGasBribeLine;
}

export function getValidatorLine(atomicArbDetails: TransactionDetailsForAtomicArbs): string {
  const validatorPayOut = formatForPrint(atomicArbDetails.validatorPayOffUSD);
  const validatorLine = `Block-Payout to Validator: $${validatorPayOut}`;
  return validatorLine;
}

export async function buildNetWinAndBribeMessage(atomicArbDetails: TransactionDetailsForAtomicArbs): Promise<string | null> {
  if (!atomicArbDetails.blockBuilder) return null;
  const blockBuilderLine = getBlockBuilderLine(atomicArbDetails.blockBuilder);
  if (!blockBuilderLine) return null;

  const txLinkLine = getTxLinkLine(atomicArbDetails);

  if (atomicArbDetails.validatorPayOffUSD && atomicArbDetails.validatorPayOffUSD > 2000) {
    const validatorLine = getValidatorLine(atomicArbDetails);
    return `Builder:${blockBuilderLine}
${validatorLine}
${txLinkLine}`;
  } else {
    return `Builder:${blockBuilderLine}
${txLinkLine}`;
  }
}

export async function buildNetWinButNoBribeMessage(atomicArbDetails: TransactionDetailsForAtomicArbs): Promise<string> {
  const txLinkLine = getTxLinkLine(atomicArbDetails);

  return `${txLinkLine}`;
}
