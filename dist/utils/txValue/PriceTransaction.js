import { getCurrentTokenPriceFromDefiLlama } from "./DefiLlama.js";
export async function priceTransaction(enrichedTransaction) {
    const coins = [...enrichedTransaction.coins_leaving_wallet, ...enrichedTransaction.coins_entering_wallet];
    if (enrichedTransaction.transaction_type === "swap") {
        for (const coin of coins) {
            const price = await getCurrentTokenPriceFromDefiLlama(coin.address);
            if (price !== null) {
                return price * coin.amount; // Return as soon as we get a price.
            }
        }
    }
    else if (enrichedTransaction.transaction_type === "deposit" || enrichedTransaction.transaction_type === "remove") {
        let totalValue = 0;
        for (const coin of coins) {
            const price = await getCurrentTokenPriceFromDefiLlama(coin.address);
            if (price !== null) {
                totalValue += price * coin.amount;
            }
        }
        if (totalValue > 0) {
            return totalValue; // Return the total value of the coins.
        }
    }
    else {
        console.log(`Unknown transaction type: ${enrichedTransaction.transaction_type}`);
    }
    return null; // Return null if no price could be fetched for any coin.
}
//# sourceMappingURL=PriceTransaction.js.map