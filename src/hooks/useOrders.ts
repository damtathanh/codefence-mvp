import { useState } from 'react';
import { read, utils } from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import { evaluateRisk } from '../utils/riskEngine';
import {
    insertOrders as insertOrdersService,
    fetchPastOrdersByPhones,
    type InsertOrderPayload
} from '../features/orders/services/ordersService';
import type { Product } from '../types/supabase';
import { normalize, validateAndMapHeaders, type HeaderValidationResult } from '../utils/smartColumnMapper';

export interface OrderInput {
    order_id: string;
    customer_name: string;
    phone: string;
    address: string | null;
    product_id: string | null;
    product?: string; // Product name
    amount: number;
    payment_method?: string;
}

export interface ParsedOrderRow {
    order_id: string;
    customer_name: string;
    phone: string;
    address: string | null;
    product: string;
    amount: number;
    payment_method: string;
}

export interface InvalidOrderRow {
    order: ParsedOrderRow;   // the invalid row
    rowIndex: number;        // row number in the uploaded file
    reason: string;          // why this row is invalid
}

export function useOrders() {
    const { user } = useAuth();

    const parseFile = async (file: File): Promise<ParsedOrderRow[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    // Get headers
                    const jsonData = utils.sheet_to_json(sheet, { header: 1 });
                    if (jsonData.length === 0) {
                        reject(new Error('File is empty'));
                        return;
                    }

                    const headers = jsonData[0] as string[];
                    const validationResult = validateAndMapHeaders(headers);

                    if (validationResult.error) {
                        // Attach validation result to error object for UI to display
                        const error = new Error(validationResult.error);
                        (error as any).validationResult = validationResult;
                        reject(error);
                        return;
                    }

                    const mapping = validationResult.mapping;
                    const rows = jsonData.slice(1); // Skip header

                    const parsedRows: ParsedOrderRow[] = rows.map((row: any) => {
                        const obj: any = {};
                        // Map columns based on mapping
                        Object.entries(mapping).forEach(([key, headerName]) => {
                            const colIndex = headers.indexOf(headerName);
                            if (colIndex !== -1) {
                                obj[key] = row[colIndex];
                            }
                        });
                        return obj as ParsedOrderRow;
                    });

                    resolve(parsedRows);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        });
    };

    const validateAndMapProducts = async (rows: ParsedOrderRow[]) => {
        if (!user) throw new Error('User not authenticated');

        // Fetch active products
        const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('status', 'active');

        const productMap = new Map<string, string>(); // normalized name -> id
        if (products) {
            products.forEach(p => {
                productMap.set(normalize(p.name), p.id);
            });
        }

        const validOrders: OrderInput[] = [];
        const invalidOrders: InvalidOrderRow[] = [];
        const warnings: string[] = [];

        rows.forEach((row, index) => {
            const errors: string[] = [];
            const rowNum = index + 1;

            // Basic validation
            if (!row.order_id) errors.push('Missing Order ID');
            if (!row.customer_name) errors.push('Missing Customer Name');
            if (!row.phone) errors.push('Missing Phone');

            // Amount parsing
            let amount = 0;
            if (row.amount) {
                const cleaned = row.amount.toString().replace(/,/g, '').trim();
                amount = Number(cleaned);
            }
            if (isNaN(amount) || amount <= 0) errors.push('Invalid Amount');

            // Product mapping
            let productId: string | null = null;
            const productName = row.product ? row.product.toString().trim() : '';

            if (!productName) {
                errors.push('Missing Product Name');
            } else {
                const normalized = normalize(productName);
                if (productMap.has(normalized)) {
                    productId = productMap.get(normalized)!;
                } else {
                    errors.push(`Product not found: ${productName}`);
                }
            }

            if (errors.length > 0) {
                invalidOrders.push({
                    rowIndex: rowNum,
                    order: row,
                    reason: errors.join(', ')
                });
            } else {
                validOrders.push({
                    order_id: row.order_id!.toString(),
                    customer_name: row.customer_name!.toString(),
                    phone: row.phone!.toString(),
                    address: row.address ? row.address.toString() : null,
                    product_id: productId,
                    product: productName,
                    amount,
                    payment_method: row.payment_method ? row.payment_method.toString() : 'COD'
                });
            }
        });

        return { validOrders, invalidOrders, warnings };
    };

    const insertOrders = async (orders: OrderInput[]) => {
        if (!user) throw new Error('User not authenticated');

        // 1. Fetch past orders for risk evaluation
        const phones = Array.from(new Set(orders.map(o => o.phone)));
        const { data: pastOrdersData } = await fetchPastOrdersByPhones(user.id, phones);

        const pastOrdersMap = new Map<string, { status: string | null }[]>();
        if (pastOrdersData) {
            pastOrdersData.forEach(po => {
                const p = po.phone;
                if (!pastOrdersMap.has(p)) {
                    pastOrdersMap.set(p, []);
                }
                pastOrdersMap.get(p)!.push({ status: po.status });
            });
        }

        // 2. Prepare payloads with risk scores
        const payloads: InsertOrderPayload[] = orders.map(order => {
            const pastOrders = pastOrdersMap.get(order.phone) || [];

            const riskOutput = evaluateRisk({
                paymentMethod: order.payment_method,
                amountVnd: order.amount,
                phone: order.phone,
                address: order.address,
                pastOrders: pastOrders,
                productName: order.product
            });

            const isNonCOD = order.payment_method && order.payment_method.toUpperCase() !== 'COD';

            return {
                user_id: user.id,
                order_id: order.order_id,
                customer_name: order.customer_name,
                phone: order.phone,
                address: order.address,
                product_id: order.product_id,
                product: order.product || '',
                amount: order.amount,
                status: isNonCOD ? 'Order Paid' : 'Pending Review', // Default status
                risk_score: riskOutput.score,
                risk_level: riskOutput.level,
                payment_method: order.payment_method || 'COD',
                paid_at: isNonCOD ? new Date().toISOString() : null
            };
        });

        // 3. Insert
        const { error } = await insertOrdersService(payloads);

        if (error) {
            return { success: 0, failed: orders.length, errors: [error.message] };
        }

        return { success: orders.length, failed: 0, errors: [] };
    };

    return {
        parseFile,
        validateAndMapProducts,
        insertOrders
    };
}
