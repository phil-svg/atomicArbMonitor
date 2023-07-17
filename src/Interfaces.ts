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
}
