import { EnrichedCexDexDetails, Trade } from "../../Interfaces.js";

export async function getRevenueFromBinance(enrichedCexDexDetails: EnrichedCexDexDetails, binanceBestMatchingTrade: Trade | null): Promise<number | null> {
  if (!binanceBestMatchingTrade) return null;
  const priceOnBinance = Number(binanceBestMatchingTrade.price);
  let tradeAmountOut = enrichedCexDexDetails.coins_leaving_wallet[0].amount;
  const howMuchNeededToBuyBack = tradeAmountOut * priceOnBinance;
  let tradeAmountIn = enrichedCexDexDetails.coins_entering_wallet[0].amount;
  const revenue = tradeAmountIn - howMuchNeededToBuyBack;
  return Number(revenue.toFixed(0));
}
