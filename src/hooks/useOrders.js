import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import { validateAndMapHeaders } from '../utils/smartColumnMapper';
import { normalizePhone } from '../utils/phoneUtils';
import { evaluateRisk } from '../utils/riskEngine';
function normalizeGender(value) {
    if (!value)
        return null;
    const v = value.toLowerCase().trim();
    if (["nam", "male", "m", "trai"].includes(v))
        return "male";
    if (["nữ", "nu", "female", "f", "gái"].includes(v))
        return "female";
    return null;
}
function mockCheckZaloByPhone(phone) {
    // Giả lập rule: nếu 3 số cuối TRÙNG NHAU => KHÔNG có Zalo
    // vd: ***111, ***222, ***999 => false
    if (!phone || phone.length < 3)
        return true; // mặc định là có Zalo
    const last3 = phone.slice(-3);
    const allSame = last3.split('').every(ch => ch === last3[0]);
    return !allSame; // 3 số cuối trùng nhau => false, ngược lại true
}
function parseOrderDate(input) {
    if (!input)
        return null;
    if (typeof input === "number") {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const result = new Date(excelEpoch.getTime() + input * 86400000);
        return result.toISOString().split("T")[0];
    }
    if (typeof input === "string") {
        const raw = input.trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
            const [d, m, y] = raw.split("/").map(x => x.padStart(2, "0"));
            return `${y}-${m}-${d}`;
        }
        return raw;
    }
    return null;
}
export function useOrders() {
    const { user } = useAuth();
    const parseFile = async (file) => {
        // 1. Fetch products for strict mapping
        const { data: productsData } = await supabase
            .from('products')
            .select('id, name')
            .eq('user_id', user?.id);
        const products = productsData || [];
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
                    const headers = jsonData[0];
                    const validation = validateAndMapHeaders(headers);
                    if (validation.missingRequired.length > 0) {
                        reject(new Error(`Cannot import file. Some required columns are missing or not recognized: ${validation.missingRequired.join(", ")}`));
                        return;
                    }
                    const mapping = validation.mapping; // canonicalKey -> columnIndex
                    const rows = jsonData.slice(1);
                    const validOrders = [];
                    const invalidOrders = [];
                    rows.forEach((row, idx) => {
                        const obj = {};
                        // Map Excel → object using canonical keys
                        // mapping: { "order_id": 0, "customer_name": 1, ... }
                        Object.entries(mapping).forEach(([key, colIndex]) => {
                            obj[key] = row[colIndex];
                        });
                        const errors = [];
                        if (!obj.order_id)
                            errors.push("Missing Order ID");
                        if (!obj.customer_name)
                            errors.push("Missing Customer Name");
                        // phone
                        const cleanPhone = normalizePhone(obj.phone);
                        if (!cleanPhone)
                            errors.push("Invalid Phone Number");
                        const zaloExists = mockCheckZaloByPhone(cleanPhone);
                        // amount
                        let amount = 0;
                        if (obj.amount) {
                            amount = Number(String(obj.amount).replace(/[^0-9]/g, ""));
                        }
                        if (!amount || amount <= 0)
                            errors.push("Invalid Amount");
                        // Product Mapping (Strict)
                        const rawProduct = obj.product ? String(obj.product).trim() : "";
                        let matchedProductId = null;
                        if (rawProduct) {
                            // 1. Exact match
                            const exact = products.find(p => p.name.toLowerCase() === rawProduct.toLowerCase());
                            if (exact) {
                                matchedProductId = exact.id;
                            }
                            else {
                                // 2. ILIKE / Contains match (simple fallback)
                                const fuzzy = products.find(p => p.name.toLowerCase().includes(rawProduct.toLowerCase()));
                                if (fuzzy) {
                                    matchedProductId = fuzzy.id;
                                }
                            }
                        }
                        if (!matchedProductId) {
                            errors.push(`Product not found: "${rawProduct}"`);
                        }
                        if (errors.length > 0) {
                            invalidOrders.push({ rowIndex: idx + 1, order: obj, reason: errors.join(", ") });
                            return;
                        }
                        // RISK
                        const riskInput = {
                            phone: cleanPhone,
                            amountVnd: amount,
                            paymentMethod: obj.payment_method || "COD",
                            pastOrders: [],
                            zaloExists: zaloExists
                        };
                        const risk = evaluateRisk(riskInput);
                        validOrders.push({
                            user_id: user?.id,
                            order_id: obj.order_id.toString(),
                            customer_name: obj.customer_name.toString(),
                            phone: cleanPhone,
                            product_id: matchedProductId,
                            product: rawProduct,
                            amount: amount,
                            payment_method: obj.payment_method || "COD",
                            address_detail: obj.address_detail || null,
                            ward: obj.ward || null,
                            district: obj.district || null,
                            province: obj.province || null,
                            gender: normalizeGender(obj.gender),
                            birth_year: obj.birth_year ? Number(obj.birth_year) : null,
                            discount_amount: obj.discount_amount ? Number(obj.discount_amount) : 0,
                            shipping_fee: obj.shipping_fee ? Number(obj.shipping_fee) : 0,
                            channel: obj.channel || null,
                            source: obj.source || null,
                            order_date: parseOrderDate(obj.order_date),
                            zalo_exists: zaloExists,
                            risk_score: risk.score,
                            address: null // Explicitly null
                        });
                    });
                    resolve({ validOrders, invalidOrders, warnings: [] });
                }
                catch (err) {
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };
    const insertOrders = async (orders) => {
        if (!user)
            throw new Error("Not authenticated");
        const { data, error } = await supabase.rpc("import_orders_bulk", {
            payload: orders
        });
        if (error) {
            console.error("RPC error:", error);
            // Enhanced error visibility
            const errorMsg = `RPC Error: ${error.message}`;
            return { success: 0, failed: orders.length, errors: [errorMsg], insertedOrders: [] };
        }
        return {
            success: data.success,
            failed: data.failed,
            errors: data.errors || [],
            insertedOrders: data.inserted_orders || []
        };
    };
    return { parseFile, insertOrders };
}
