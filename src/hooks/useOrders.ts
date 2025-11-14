import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../features/auth";
import type { Order, Product } from "../types/supabase";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Smart header mapping
import { buildHeaderMapping, normalize } from "../utils/smartColumnMapper";

export interface OrderInput {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product_id: string;
  product_name?: string;
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
  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    return error ? [] : (data ?? []);
  }, [user]);

  /** CLEAN NUMBER */
  const parseNumeric = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const cleaned = v.toString().replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  /** VALIDATE */
  const validateOrder = (o: Partial<OrderInput>) => {
    if (!o.order_id) return "Order ID missing";
    if (!o.customer_name) return "Customer name missing";
    if (!o.phone) return "Phone missing";
    if (!o.product_id) return "Product not mapped";
    if (!o.amount || o.amount <= 0) return "Amount invalid";
    return null;
  };

  /** MAP PRODUCT NAME → ID */
  const validateAndMapProducts = useCallback(
    async (rows: any[]) => {
      const products = await fetchProducts();
      const productMap = new Map(
        products.map((p) => [normalize(p.name), p])
      );

      const valid: OrderInput[] = [];
      const invalid: InvalidOrderRow[] = [];

      rows.forEach((row, idx) => {
        const prod = productMap.get(normalize(row.product || ""));

        if (!prod) {
          invalid.push({
            rowIndex: idx + 1,
            order: row,
            reason: `Product "${row.product}" not found`,
          });
        } else {
          valid.push({
            order_id: row.order_id,
            customer_name: row.customer_name,
            phone: row.phone,
            address: row.address,
            product_id: prod.id,
            product_name: prod.name,
            amount: parseNumeric(row.amount) ?? 0,
          });
        }
      });

      return { validOrders: valid, invalidOrders: invalid };
    },
    [fetchProducts]
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
            const map = buildHeaderMapping(headers);

            const rows = res.data.map((r: any) => ({
              order_id: r[map.order_id] || "",
              customer_name: r[map.customer_name] || "",
              phone: r[map.phone] || "",
              address: r[map.address] || "",
              product: r[map.product] || "",
              amount: parseNumeric(r[map.amount]) ?? 0,
            }));

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
          const headers = Object.keys(json[0]);
          const map = buildHeaderMapping(headers);

          const rows = json.map((r: any) => ({
            order_id: r[map.order_id] || "",
            customer_name: r[map.customer_name] || "",
            phone: r[map.phone] || "",
            address: r[map.address] || "",
            product: r[map.product] || "",
            amount: parseNumeric(r[map.amount]) ?? 0,
          }));

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
            product_id: order.product_id,
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
