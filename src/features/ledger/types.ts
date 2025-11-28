export type TransactionType =
    | 'payment'
    | 'refund'
    | 'return_fee'
    | 'exchange_adjustment'
    | 'shipping_cost';

export type TransactionDirection = 'inflow' | 'outflow';

export interface FinancialTransaction {
    id: string;
    user_id: string;
    order_id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    direction: TransactionDirection;
    metadata?: Record<string, any> | null;
    created_at: string;
    created_by?: string | null;
}

export interface InsertTransactionPayload {
    user_id: string;
    order_id: string;
    type: TransactionType;
    amount: number;
    currency?: string;
    direction: TransactionDirection;
    metadata?: Record<string, any> | null;
    created_by?: string | null;
}
