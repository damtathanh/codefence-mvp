import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import { validateAndMapHeaders } from '../utils/smartColumnMapper';
// Import hàm sửa số điện thoại và check zalo giả lập
import { normalizePhone } from '../utils/phoneUtils';
import { mockCheckZaloExistence, evaluateRisk, type RiskInput } from '../utils/riskEngine';

// Interface chuẩn khớp với DB
export interface OrderInput {
    order_id: string;
    customer_name: string;
    phone: string;
    product?: string;
    amount: number;
    payment_method?: string;
    address_detail?: string | null;
    ward?: string | null;
    district?: string | null;
    province?: string | null;
    address?: string | null;
    gender?: 'male' | 'female' | null;
    birth_year?: number | null;
    discount_amount?: number | null;
    shipping_fee?: number | null;
    channel?: string | null;
    source?: string | null;
    order_date?: string | null;

    // Các trường tính toán
    zalo_exists?: boolean;
    risk_score?: number;
}

export interface InvalidOrderRow {
    order: any;
    rowIndex: number;
    reason: string;
}

function normalizeGender(value?: string): 'male' | 'female' | null {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    if (["nam", "male", "m", "trai"].includes(v)) return "male";
    if (["nữ", "nu", "female", "f", "gái"].includes(v)) return "female";
    return null;
}

function parseOrderDate(input: any): string | null {
    if (!input) return null;
    if (typeof input === "number") {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const result = new Date(excelEpoch.getTime() + input * 86400000);
        return result.toISOString().split("T")[0];
    }
    if (typeof input === "string") {
        const raw = input.trim();
        // Xử lý dd/mm/yyyy
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
            const parts = raw.split(" ")[0].split("/");
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return raw; // Hy vọng là format chuẩn
    }
    return null;
}

export function useOrders() {
    const { user } = useAuth();

    const parseFile = async (file: File): Promise<{ validOrders: OrderInput[], invalidOrders: InvalidOrderRow[], warnings: string[] }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];

                    // Đọc raw data (header: 1 để lấy mảng mảng)
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (jsonData.length === 0) {
                        reject(new Error('File is empty'));
                        return;
                    }

                    const headers = jsonData[0] as string[];
                    const validationResult = validateAndMapHeaders(headers);

                    if (validationResult.error) {
                        reject(new Error(validationResult.error));
                        return;
                    }

                    const mapping = validationResult.mapping;
                    const rows = jsonData.slice(1);
                    const validOrders: OrderInput[] = [];
                    const invalidOrders: InvalidOrderRow[] = [];
                    const warnings: string[] = [];

                    // --- VÒNG LẶP CHÍNH (XỬ LÝ TẤT CẢ LOGIC Ở ĐÂY) ---
                    rows.forEach((row: any, index) => {
                        const obj: any = {};

                        // 1. Map dữ liệu từ Excel vào object
                        Object.entries(mapping).forEach(([key, headerName]) => {
                            const colIndex = headers.indexOf(headerName);
                            if (colIndex !== -1) {
                                obj[key] = row[colIndex];
                            }
                        });

                        const errors: string[] = [];
                        if (!obj.order_id) errors.push('Missing Order ID');
                        if (!obj.customer_name) errors.push('Missing Customer Name');

                        // --- XỬ LÝ PHONE NUMBER (QUAN TRỌNG) ---
                        // Lấy giá trị thô từ Excel, gọi hàm normalizePhone để thêm số 0
                        const rawPhone = obj.phone;
                        const cleanPhone = normalizePhone(rawPhone);

                        if (!cleanPhone || cleanPhone.length < 9) {
                            errors.push('Invalid Phone Number');
                        }

                        // --- XỬ LÝ AMOUNT ---
                        let amount = 0;
                        if (obj.amount) {
                            const cleaned = obj.amount.toString().replace(/,/g, '').replace(/\./g, '').trim();
                            amount = Number(cleaned);
                        }
                        if (isNaN(amount) || amount <= 0) errors.push('Invalid Amount');

                        // Nếu có lỗi thì đẩy vào invalid
                        if (errors.length > 0) {
                            invalidOrders.push({ rowIndex: index + 1, order: obj, reason: errors.join(', ') });
                        } else {
                            // --- TÍNH TOÁN RISK & ZALO (Simulation) ---
                            const hasZalo = mockCheckZaloExistence(cleanPhone);

                            const riskInput: RiskInput = {
                                paymentMethod: obj.payment_method ? obj.payment_method.toString() : 'COD',
                                amountVnd: amount,
                                phone: cleanPhone,
                                address: obj.address, // hoặc ghép từ các trường chi tiết
                                pastOrders: [],
                                zaloExists: hasZalo
                            };

                            const riskResult = evaluateRisk(riskInput);

                            // --- TẠO OBJECT HOÀN CHỈNH ---
                            validOrders.push({
                                order_id: obj.order_id.toString(),
                                customer_name: obj.customer_name.toString(),
                                phone: cleanPhone, // Số đã được sửa (có số 0)
                                product: obj.product ? obj.product.toString().trim() : '',
                                amount: amount,
                                payment_method: obj.payment_method ? obj.payment_method.toString() : 'COD',

                                address_detail: obj.address_detail ? obj.address_detail.toString() : null,
                                ward: obj.ward ? obj.ward.toString() : null,
                                district: obj.district ? obj.district.toString() : null,
                                province: obj.province ? obj.province.toString() : null,
                                address: null, // Backend sẽ tự ghép hoặc dùng cái này

                                gender: normalizeGender(obj.gender?.toString()),
                                birth_year: obj.birth_year ? Number(obj.birth_year) : null,
                                discount_amount: obj.discount_amount ? Number(obj.discount_amount) : 0,
                                shipping_fee: obj.shipping_fee ? Number(obj.shipping_fee) : 0,
                                channel: obj.channel ? obj.channel.toString() : null,
                                source: obj.source ? obj.source.toString() : null,
                                order_date: parseOrderDate(obj.order_date),

                                // Dữ liệu Risk & Zalo
                                zalo_exists: hasZalo,
                                risk_score: riskResult.score
                            });
                        }
                    });

                    resolve({ validOrders, invalidOrders, warnings });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const insertOrders = async (orders: OrderInput[]) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('import_orders_bulk', {
            payload: orders
        });

        if (error) {
            console.error('RPC import_orders_bulk error:', error);
            return { success: 0, failed: orders.length, errors: [error.message] };
        }

        return {
            success: data.success,
            failed: data.failed,
            errors: data.errors?.map((e: any) => `Order ${e.order_id}: ${e.error}`) || []
        };
    };

    return { parseFile, insertOrders };
}