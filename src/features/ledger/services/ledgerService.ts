import { LedgerRepository } from "../repositories/ledgerRepository";
import type { InsertTransactionPayload, TransactionType } from "../types";

export const LedgerService = {
    async recordPayment(
        userId: string,
        orderId: string,
        amount: number,
        metadata?: Record<string, any>
    ) {
        const payload: InsertTransactionPayload = {
            user_id: userId,
            order_id: orderId,
            type: 'payment',
            amount,
            direction: 'inflow',
            currency: 'VND',
            metadata,
            created_by: userId,
        };
        return LedgerRepository.insertTransaction(payload);
    },

    async recordRefund(
        userId: string,
        orderId: string,
        amount: number,
        reason?: string,
        metadata?: Record<string, any>
    ) {
        const payload: InsertTransactionPayload = {
            user_id: userId,
            order_id: orderId,
            type: 'refund',
            amount,
            direction: 'outflow',
            currency: 'VND',
            metadata: { ...metadata, reason },
            created_by: userId,
        };
        return LedgerRepository.insertTransaction(payload);
    },

    async recordReturnFee(
        userId: string,
        orderId: string,
        amount: number,
        note?: string
    ) {
        const payload: InsertTransactionPayload = {
            user_id: userId,
            order_id: orderId,
            type: 'return_fee',
            amount,
            direction: 'inflow',
            currency: 'VND',
            metadata: { note },
            created_by: userId,
        };
        return LedgerRepository.insertTransaction(payload);
    },

    async recordTransaction(
        userId: string,
        orderId: string,
        type: TransactionType,
        amount: number,
        direction: 'inflow' | 'outflow',
        metadata?: Record<string, any>
    ) {
        const payload: InsertTransactionPayload = {
            user_id: userId,
            order_id: orderId,
            type,
            amount,
            direction,
            currency: 'VND',
            metadata,
            created_by: userId,
        };
        return LedgerRepository.insertTransaction(payload);
    },

    async getTransactionsForOrder(orderId: string) {
        return LedgerRepository.fetchTransactionsByOrder(orderId);
    }
};
