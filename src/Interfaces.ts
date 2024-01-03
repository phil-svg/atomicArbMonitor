export enum TransactionType {
  Swap = "swap",
  Deposit = "deposit",
  Remove = "remove",
}

export interface CoinDetail {
  coin_id: number;
  amount: number;
  name: string;
  address: string;
}

export interface TransactionDetail {
  tx_id: number;
  pool_id: number;
  event_id?: number;
  tx_hash: string;
  block_number: number;
  block_unixtime: number;
  transaction_type: TransactionType;
  called_contract_by_user: string;
  trader: string;
  tx_position: number;
  coins_leaving_wallet: CoinDetail[];
  coins_entering_wallet: CoinDetail[];
}

export interface EnrichedTransactionDetail extends TransactionDetail {
  poolAddress: string;
  poolName: string;
  calledContractLabel: string;
  from: string;
}

export interface TransactionDetailsForAtomicArbs extends EnrichedTransactionDetail {
  revenue: number | null;
  gasInUsd: number;
  gasInGwei: number | null;
  netWin: number | null;
  bribe: number | null;
  totalCost: number | null;
  blockBuilder: string | null;
  validatorPayOffUSD: number | null;
}

export interface Trade {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
}

export type AtomicArbDetailType = {
  transaction_type: "swap" | "remove" | "deposit" | string;
  coins_leaving_wallet: CoinDetail[];
  coins_entering_wallet: CoinDetail[];
};

export interface EnrichedCexDexDetails extends EnrichedTransactionDetail {
  builder: string;
  blockPayoutETH: number;
  blockPayoutUSD: number;
  eoaNonce: number;
  gasInGwei: number;
  gasCostUSD: number;
  bribeInUSD: number;
}
