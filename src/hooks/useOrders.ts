import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import { validateAndMapHeaders } from '../utils/smartColumnMapper';

export interface OrderInput {
    order_id: string;
    customer_name: string;
    phone: string;
    product?: string;
    amount: number;
    payment_method?: string;

    // Nhóm Địa chỉ (4 cột riêng biệt)
    address_detail?: string | null;
    ward?: string | null;
    district?: string | null;
    province?: string | null;
    address?: string | null; // Cột này để null, Backend sẽ tự ghép

    // Nhóm thông tin khách hàng bổ sung
    gender?: 'male' | 'female' | null;
    birth_year?: number | null; // Map từ cột "Birthday" (chỉ chứa năm)

    // Nhóm tài chính & Marketing
    discount_amount?: number | null;
    shipping_fee?: number | null;
    channel?: string | null;
    source?: string | null;

    order_date?: string | null;
}

export interface InvalidOrderRow {
    order: any;
    rowIndex: number;
    reason: string;
}

// Hàm chuẩn hóa giới tính (Nam/Nữ -> male/female)
function normalizeGender(value?: string): 'male' | 'female' | null {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    if (["nam", "male", "m", "trai"].includes(v)) return "male";
    if (["nữ", "nu", "female", "f", "gái"].includes(v)) return "female";
    return null;
}

// Hàm xử lý ngày tháng
function parseOrderDate(input: any): string | null {
    if (!input) return null;
    if (typeof input === "number") {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const result = new Date(excelEpoch.getTime() + input * 86400000);
        return result.toISOString().split("T")[0];
    }
    if (typeof input === "string") {
        const raw = input.trim();
        // Xử lý các dạng ngày tháng phổ biến ở VN
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.split("T")[0];
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
            const parts = raw.split(" ")[0].split("/");
            // Chuyển dd/mm/yyyy -> yyyy-mm-dd
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return raw;
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
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (jsonData.length === 0) {
                        reject(new Error('File is empty'));
                        return;
                    }

                    const headers = jsonData[0] as string[];
                    // Sử dụng smartColumnMapper để map tên cột tiếng Việt/Anh sang key chuẩn
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

                    rows.forEach((row: any, index) => {
                        const obj: any = {};
                        Object.entries(mapping).forEach(([key, headerName]) => {
                            const colIndex = headers.indexOf(headerName);
                            if (colIndex !== -1) {
                                obj[key] = row[colIndex];
                            }
                        });

                        const errors: string[] = [];
                        if (!obj.order_id) errors.push('Missing Order ID');
                        if (!obj.customer_name) errors.push('Missing Customer Name');
                        if (!obj.phone) errors.push('Missing Phone');

                        let amount = 0;
                        if (obj.amount) {
                            const cleaned = obj.amount.toString().replace(/,/g, '').trim();
                            amount = Number(cleaned);
                        }
                        if (isNaN(amount) || amount <= 0) errors.push('Invalid Amount');

                        if (errors.length > 0) {
                            invalidOrders.push({ rowIndex: index + 1, order: obj, reason: errors.join(', ') });
                        } else {
                            // TẠO PAYLOAD ĐẦY ĐỦ CÁC CỘT
                            validOrders.push({
                                order_id: obj.order_id!.toString(),
                                customer_name: obj.customer_name!.toString(),
                                phone: obj.phone!.toString(),
                                product: obj.product ? obj.product.toString().trim() : '',
                                amount,
                                payment_method: obj.payment_method ? obj.payment_method.toString() : 'COD',

                                // Gửi 4 cột địa chỉ riêng biệt
                                address_detail: obj.address_detail ? obj.address_detail.toString() : null,
                                ward: obj.ward ? obj.ward.toString() : null,
                                district: obj.district ? obj.district.toString() : null,
                                province: obj.province ? obj.province.toString() : null,
                                address: null, // Để null để backend tự ghép

                                // Map các cột bổ sung
                                gender: normalizeGender(obj.gender?.toString()),
                                birth_year: obj.birth_year ? Number(obj.birth_year) : null,
                                discount_amount: obj.discount_amount ? Number(obj.discount_amount) : 0,
                                shipping_fee: obj.shipping_fee ? Number(obj.shipping_fee) : 0,
                                channel: obj.channel ? obj.channel.toString() : null,
                                source: obj.source ? obj.source.toString() : null,
                                order_date: parseOrderDate(obj.order_date)
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