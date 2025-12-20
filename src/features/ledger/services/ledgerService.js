import { LedgerRepository } from "../repositories/ledgerRepository";
export const LedgerService = {
    async recordPayment(userId, orderId, amount, metadata) {
        const payload = {
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
    async recordRefund(userId, orderId, amount, reason, metadata) {
        const payload = {
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
    async recordReturnFee(userId, orderId, amount, note) {
        const payload = {
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
    async recordTransaction(userId, orderId, type, amount, direction, metadata) {
        const payload = {
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
    async getTransactionsForOrder(orderId) {
        return LedgerRepository.fetchTransactionsByOrder(orderId);
    }
};
