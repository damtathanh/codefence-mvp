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
import { markInvoicePaidForOrder } from "../features/invoices/services/invoiceService";
import type { Product, Order } from '../types/supabase';
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
    address_detail?: string | null;
    ward?: string | null;
    district?: string | null;
    province?: string | null;
    gender?: 'male' | 'female' | null;
    birth_year?: number | null;
    discount_amount?: number | null;
    shipping_fee?: number | null;
    channel?: string | null;
    source?: string | null;
}

export interface ParsedOrderRow {
    order_id: string;
    customer_name: string;
    phone: string;
    address: string | null;
    product: string;
    amount: number;
    payment_method: string;
    address_detail?: string;
    ward?: string;
    district?: string;
    province?: string;
    gender?: string; // raw input: "Nam", "Nữ", "male", "female"
    birth_year?: number;
    discount_amount?: number;
    shipping_fee?: number;
    channel?: string;
    source?: string;
}

export interface InvalidOrderRow {
    order: ParsedOrderRow;   // the invalid row
    rowIndex: number;        // row number in the uploaded file
    reason: string;          // why this row is invalid
}

// Helper function to normalize gender from various input formats
function normalizeGender(value?: string): 'male' | 'female' | null {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    if (["nam", "male", "m"].includes(v)) return "male";
    if (["nữ", "nu", "female", "f"].includes(v)) return "female";
    return null;
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
                    payment_method: row.payment_method ? row.payment_method.toString() : 'COD',
                    address_detail: row.address_detail ? row.address_detail.toString() : null,
                    ward: row.ward ? row.ward.toString() : null,
                    district: row.district ? row.district.toString() : null,
                    province: row.province ? row.province.toString() : null,
                    gender: normalizeGender(row.gender?.toString()),
                    birth_year: row.birth_year ? Number(row.birth_year) : null,
                    discount_amount: row.discount_amount ? Number(row.discount_amount) : null,
                    shipping_fee: row.shipping_fee ? Number(row.shipping_fee) : null,
                    channel: row.channel ? row.channel.toString() : null,
                    source: row.source ? row.source.toString() : null
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

            // Construct full address from normalized fields if available
            const fullAddressParts = [
                order.address_detail,
                order.ward,
                order.district,
                order.province
            ].filter(Boolean).map(s => s?.trim()).filter(s => s && s.length > 0);

            let finalAddress = order.address;
            if (fullAddressParts.length > 0) {
                finalAddress = fullAddressParts.join(', ');
            } else if (order.address_detail) {
                finalAddress = order.address_detail;
            }

            // Detect payment method: COD vs non-COD (bank transfer, QR, etc.)
            const isNonCOD = order.payment_method && order.payment_method.toUpperCase() !== 'COD';

            // Risk evaluation logic:
            // - Non-COD orders: Skip risk evaluation (trusted payment already received)
            //   → risk_score = null, risk_level = 'none'
            // - COD orders: Evaluate risk for fraud detection
            //   → risk_score = numeric, risk_level = 'Low'/'Medium'/'High'
            let riskScore: number | null = null;
            let riskLevel: string = 'none';

            if (!isNonCOD) {
                const riskOutput = evaluateRisk({
                    paymentMethod: order.payment_method,
                    amountVnd: order.amount,
                    phone: order.phone,
                    address: finalAddress,
                    pastOrders: pastOrders,
                    productName: order.product
                });
                riskScore = riskOutput.score;
                riskLevel = riskOutput.level;
            }

            // Build order payload for Supabase insert:
            // - Non-COD: status = 'Order Paid', paid_at = now, no risk evaluation
            // - COD: status = 'Pending Review', paid_at = null, risk evaluated
            return {
                user_id: user.id,
                order_id: order.order_id,
                customer_name: order.customer_name,
                phone: order.phone,
                address: finalAddress,
                product_id: order.product_id,
                product: order.product || '',
                amount: order.amount,
                status: isNonCOD ? 'Order Paid' : 'Pending Review',
                risk_score: riskScore,
                risk_level: riskLevel,
                payment_method: order.payment_method || 'COD',
                paid_at: isNonCOD ? new Date().toISOString() : null,
                address_detail: order.address_detail,
                ward: order.ward,
                district: order.district,
                province: order.province,
                gender: order.gender,
                birth_year: order.birth_year,
                discount_amount: order.discount_amount ?? 0,
                shipping_fee: order.shipping_fee ?? 0,
                channel: order.channel ?? null,
                source: order.source ?? null
            };
        });

        // 3. Insert orders into Supabase
        const { data: insertedOrders, error } = await insertOrdersService(payloads);

        if (error) {
            return { success: 0, failed: orders.length, errors: [error.message] };
        }

        // 4. Create invoices for non-COD orders (auto-paid on import)
        // COD orders: NO invoice created here - only when order becomes paid via UI actions
        // Non-COD orders: Invoice created immediately with status 'Paid'
        if (insertedOrders && insertedOrders.length > 0) {
            // Await to ensure data consistency before returning
            await Promise.all(
                insertedOrders.map(async (order) => {
                    const pm = order.payment_method?.toUpperCase() || 'COD';
                    if (pm !== 'COD') {
                        // markInvoicePaidForOrder is idempotent:
                        // - Updates existing invoice to 'Paid' if found
                        // - Creates new 'Paid' invoice if not found
                        await markInvoicePaidForOrder(order);
                    }
                })
            );
        }

        return { success: orders.length, failed: 0, errors: [] };
    };

    return {
        parseFile,
        validateAndMapProducts,
        insertOrders
    };
}
