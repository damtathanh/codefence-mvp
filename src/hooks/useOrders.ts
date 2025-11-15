import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../features/auth";
import type { Order, Product } from "../types/supabase";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Smart header mapping
import { validateAndMapHeaders, normalize } from "../utils/smartColumnMapper";

export interface OrderInput {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product_id: string | null; // Can be null if product not found
  product: string; // Raw product name from file
  amount: number;
}

export interface InvalidOrderRow {
  order: any;
  rowIndex: number;
  reason: string;
}

export const useOrders = () => {
  const { user } = useAuth();

  /** LOAD PRODUCTS */
  const fetchProducts = useCallback(async (): Promise<Array<{ id: string; name: string }>> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("status", "active");

    return error ? [] : (data ?? []);
  }, [user]);

  /** SAFE STRING CONVERSION */
  const toStr = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  /** CLEAN NUMBER */
  const parseNumeric = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const cleaned = String(v).replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  /** VALIDATE */
  const validateOrder = (o: Partial<OrderInput>) => {
    if (!o.order_id) return "Order ID missing";
    if (!o.customer_name) return "Customer name missing";
    if (!o.phone) return "Phone missing";
    if (!o.product) return "Product name missing";
    if (!o.amount || o.amount <= 0) return "Amount invalid";
    return null;
  };

  /** MAP PRODUCT NAME → ID */
  const validateAndMapProducts = useCallback(
    async (rows: any[]) => {
      if (!user) {
        return { validOrders: [], invalidOrders: [], warnings: [] };
      }

      // Fetch all active products for the user (equivalent to per-row lookup but more efficient)
      // This matches: .from('products').select('id, name').eq('user_id', user.id).eq('name', productName).maybeSingle()
      const products = await fetchProducts();
      const productMap = new Map(
        products.map((p) => [normalize(p.name), p])
      );

      const valid: OrderInput[] = [];
      const invalid: InvalidOrderRow[] = [];
      const warnings: Array<{ rowIndex: number; message: string }> = [];

      rows.forEach((row, idx) => {
        const productName = (row.product || "").trim();
        const normalizedProductName = normalize(productName);
        const prod = productMap.get(normalizedProductName);

        // Always create the order, but set product_id to null if product not found
        const orderData: OrderInput = {
          order_id: row.order_id || "",
          customer_name: row.customer_name || "",
          phone: row.phone || "",
          address: row.address || null,
          product_id: prod ? prod.id : null,
          product: productName, // Store raw product name from file
          amount: parseNumeric(row.amount) ?? 0,
        };

        // Validate required fields
        const validationError = validateOrder(orderData);
        if (validationError) {
          invalid.push({
            rowIndex: idx + 1,
            order: row,
            reason: validationError,
          });
        } else {
          valid.push(orderData);
          
          // Add warning if product not found (but row is still valid)
          if (!prod && productName) {
            warnings.push({
              rowIndex: idx + 1,
              message: `Product "${productName}" not found; please correct it in the Orders table.`,
            });
          }
        }
      });

      return { validOrders: valid, invalidOrders: invalid, warnings };
    },
    [fetchProducts, user]
  );

  /** CSV PARSE */
  const parseCSV = useCallback((file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          try {
            const headers = res.meta.fields || [];
            
            // Validate headers and check for missing/misnamed columns
            const validationResult = validateAndMapHeaders(headers);
            if (validationResult.error) {
              const error = new Error(validationResult.error);
              // Attach validation result to error for structured error display
              (error as any).validationResult = validationResult;
              reject(error);
              return;
            }
            const mapping = validationResult.mapping;

            const rows = res.data.map((r: any) => {
              const orderId = toStr(r[mapping.order_id]);
              const customerName = toStr(r[mapping.customer_name]);
              const phone = toStr(r[mapping.phone]);
              const address = toStr(r[mapping.address]) || null;
              const productName = toStr(r[mapping.product]);
              const amountStr = toStr(r[mapping.amount]);
              
              return {
                order_id: orderId,
                customer_name: customerName,
                phone: phone,
                address: address,
                product: productName,
                amount: parseNumeric(amountStr) ?? 0,
              };
            });

            resolve(rows);
          } catch (err) {
            reject(err);
          }
        },
        error: reject,
      });
    });
  }, []);

  /** XLSX PARSE */
  const parseXLSX = useCallback((file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          
          if (!json || json.length === 0) {
            reject(new Error("File appears to be empty or has no data rows."));
            return;
          }

          const headers = Object.keys(json[0] || {});
          
          // Validate headers and check for missing/misnamed columns
          const validationResult = validateAndMapHeaders(headers);
          if (validationResult.error) {
            const error = new Error(validationResult.error);
            // Attach validation result to error for structured error display
            (error as any).validationResult = validationResult;
            reject(error);
            return;
          }
          const mapping = validationResult.mapping;

          const rows = json.map((r: any) => {
            const orderId = toStr(r[mapping.order_id]);
            const customerName = toStr(r[mapping.customer_name]);
            const phone = toStr(r[mapping.phone]);
            const address = toStr(r[mapping.address]) || null;
            const productName = toStr(r[mapping.product]);
            const amountStr = toStr(r[mapping.amount]);
            
            return {
              order_id: orderId,
              customer_name: customerName,
              phone: phone,
              address: address,
              product: productName,
              amount: parseNumeric(amountStr) ?? 0,
            };
          });

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }, []);

  /** UNIVERSAL PARSER */
  const parseFile = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv")) return parseCSV(file);
      if (name.endsWith(".xls") || name.endsWith(".xlsx")) return parseXLSX(file);
      throw new Error("Unsupported file");
    },
    [parseCSV, parseXLSX]
  );

  /** DATABASE INSERT */
  const insertOrders = useCallback(
    async (orders: OrderInput[]) => {
      let success = 0,
        failed = 0,
        errors: string[] = [];

      for (const order of orders) {
        try {
          const validation = validateOrder(order);
          if (validation) throw new Error(validation);

          const amount = parseNumeric(order.amount);
          if (!amount) throw new Error("Amount invalid");

          const { error } = await supabase.from("orders").insert({
            user_id: user?.id,
            order_id: order.order_id,
            customer_name: order.customer_name,
            phone: order.phone,
            address: order.address,
            product_id: order.product_id, // Can be null
            product: order.product, // Raw product name from file
            amount,
            status: "Pending",
            risk_score: null,
          });

          if (error) throw error;

          success++;
        } catch (err: any) {
          failed++;
          errors.push(err.message);
        }
      }

      return { success, failed, errors };
    },
    [user]
  );

  return {
    parseFile,
    validateAndMapProducts,
    insertOrders,
  };
};
