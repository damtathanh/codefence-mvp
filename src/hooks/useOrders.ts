import { useCallback } from "react";
import { useAuth } from "../features/auth";
import type { Order, Product } from "../types/supabase";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "../lib/supabaseClient";

// Smart header mapping
import { validateAndMapHeaders, normalize } from "../utils/smartColumnMapper";
import { computeRiskScoreV1, evaluateRisk } from "../utils/riskEngine";
import { insertOrder, fetchPastOrdersByPhones } from "../features/orders/services/ordersService";
import { insertOrderEvent } from "../features/orders/services/orderEventsService";
import { ORDER_STATUS } from "../constants/orderStatus";
import { markInvoicePaidForOrder } from "../features/invoices/invoiceService";

export interface ParsedOrderRow {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product: string;
  amount: number;
  payment_method: string; // raw from file (COD, Bank, Momo, ZaloPay, etc.)
}

export interface OrderInput {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product_id?: string | null; // set after product mapping
  product: string; // raw product name
  amount: number;
  payment_method: string; // normalized (e.g., COD/BANK/MOMO/ZALOPAY)
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
    async (rows: ParsedOrderRow[]) => {
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
          product: productName,
          amount: parseNumeric(row.amount) ?? 0,
          payment_method: row.payment_method || "COD",
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
    return new Promise<ParsedOrderRow[]>((resolve, reject) => {
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
            const headerMapping = validationResult.mapping;

            const rows: ParsedOrderRow[] = res.data
              .map((r: any) => {
                const rowByHeader: Record<string, any> = {};
                headers.forEach((header) => {
                  rowByHeader[header] = r[header];
                });

                const getValue = (key: keyof typeof headerMapping): string => {
                  const headerName = headerMapping[key];
                  if (!headerName) return '';

                  const value = rowByHeader[headerName];
                  return value !== undefined && value !== null ? String(value).trim() : '';
                };

                const order_id = getValue('order_id');
                const customer_name = getValue('customer_name');
                const phone = getValue('phone');
                const address = getValue('address');
                const product = getValue('product');
                const amountRaw = getValue('amount');
                const paymentMethodRaw = getValue('payment_method');

                if (!order_id || !customer_name || !product || !amountRaw) {
                  return null; // skip invalid rows
                }

                const amount = Number(String(amountRaw).replace(/[.,\s]/g, ''));

                const payment_method = paymentMethodRaw
                  ? paymentMethodRaw.toString().trim()
                  : 'COD';

                const row: ParsedOrderRow = {
                  order_id,
                  customer_name,
                  phone,
                  address: address || null,
                  product,
                  amount,
                  payment_method,
                };

                console.log('[DEBUG] parsed CSV row:', row);

                return row;
              })
              .filter((o): o is ParsedOrderRow => o !== null);

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
    return new Promise<ParsedOrderRow[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          
          // Get raw data as array of arrays (first row is headers)
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
          
          if (!rawData || rawData.length < 2) {
            reject(new Error("File appears to be empty or has no data rows."));
            return;
          }

          const headers = rawData[0].map((h: any) => String(h || '').trim());
          const dataRows = rawData.slice(1);

          // Validate headers and check for missing/misnamed columns
          const validationResult = validateAndMapHeaders(headers);
          if (validationResult.error) {
            const error = new Error(validationResult.error);
            // Attach validation result to error for structured error display
            (error as any).validationResult = validationResult;
            reject(error);
            return;
          }
          const headerMapping = validationResult.mapping;

          const rows: ParsedOrderRow[] = [];

          dataRows.forEach((row) => {
            const rowByHeader: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowByHeader[header] = row[index];
            });

            const get = (key: keyof typeof headerMapping): string => {
              const headerName = headerMapping[key];
              if (!headerName) return '';
              const value = rowByHeader[headerName];
              return value !== undefined && value !== null ? String(value).trim() : '';
            };

            const order_id = get('order_id');
            const customer_name = get('customer_name');
            const phone = get('phone');
            const address = get('address');
            const product = get('product');
            const amountRaw = get('amount');
            const paymentMethodRaw = get('payment_method');

            if (!order_id || !customer_name || !product || !amountRaw) {
              return; // skip invalid rows
            }

            const amount = Number(String(amountRaw).replace(/[.,\s]/g, ''));

            const payment_method = paymentMethodRaw
              ? paymentMethodRaw.toString().trim()
              : 'COD';

            const parsedRow: ParsedOrderRow = {
              order_id,
              customer_name,
              phone,
              address: address || null,
              product,
              amount,
              payment_method,
            };

            console.log('[DEBUG] parsed XLSX row:', parsedRow);

            rows.push(parsedRow);
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
    async (file: File): Promise<ParsedOrderRow[]> => {
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
      if (!user?.id) {
        return { success: 0, failed: 0, errors: ["User not authenticated"] };
      }

      let success = 0,
        failed = 0,
        errors: string[] = [];

      // Batch fetch past orders for all unique phones
      const uniquePhones = Array.from(
        new Set(
          orders
            .map(o => o.phone)
            .filter((p): p is string => Boolean(p && p.trim()))
        )
      );

      let historyByPhone = new Map<string, { status: string | null }[]>();
      
      if (uniquePhones.length > 0) {
        const { data: pastOrdersData, error: pastError } = await fetchPastOrdersByPhones(
          user.id,
          uniquePhones
        );

        if (pastError) {
          console.error('Error fetching past orders for risk evaluation:', pastError);
        } else {
          // Build map: phone -> pastOrders[]
          for (const row of pastOrdersData ?? []) {
            const list = historyByPhone.get(row.phone) ?? [];
            list.push({ status: row.status });
            historyByPhone.set(row.phone, list);
          }
        }
      }

      for (const order of orders) {
        try {
          const validation = validateOrder(order);
          if (validation) throw new Error(validation);

          const amount = parseNumeric(order.amount);
          if (!amount) throw new Error("Amount invalid");

          const now = new Date().toISOString();
          const rawPaymentMethod = order.payment_method || "COD";
          const paymentMethod = rawPaymentMethod.toUpperCase();
          const isCod = paymentMethod === "COD";

          // Get past orders from the batch-fetched map
          const phone = order.phone || '';
          const pastOrders = historyByPhone.get(phone) || [];

          // Evaluate risk using new risk engine
          const { score: riskScore, level: riskLevel, reasons, version } = evaluateRisk({
            paymentMethod,
            amountVnd: amount,
            phone,
            address: order.address,
            pastOrders,
            productName: order.product,
          });

          const baseStatus = isCod ? ORDER_STATUS.PENDING_REVIEW : ORDER_STATUS.ORDER_PAID;
          const paidAt = isCod ? null : now;

          const payload = {
            user_id: user.id,
            order_id: order.order_id,
            customer_name: order.customer_name,
            phone: order.phone,
            address: order.address,
            product_id: order.product_id ?? null,
            product: order.product,
            amount,
            status: baseStatus,
            risk_score: riskScore,
            risk_level: riskLevel,
            payment_method: paymentMethod,
            paid_at: paidAt,
          };

          console.log('[DEBUG] insert payload:', payload);

          const { data: insertedData, error } = await insertOrder(payload);

          if (error) throw error;

          // Insert RISK_EVALUATED event
          if (insertedData && insertedData.id) {
            const { error: eventError } = await insertOrderEvent({
              order_id: insertedData.id,
              event_type: 'RISK_EVALUATED',
              payload_json: {
                score: riskScore,
                level: riskLevel,
                reasons,
                source: 'import_rule_engine',
                rule_version: version || "v1",
              },
            });

            if (eventError) {
              console.error('Error inserting RISK_EVALUATED event:', eventError);
              // Don't fail the whole import if event insert fails
            }
          }

          // Create Paid invoice for non-COD orders (they are paid immediately)
          if (insertedData && !isCod) {
            const fullOrder = {
              ...insertedData,
              user_id: user.id,
              amount: insertedData.amount,
            };
            await markInvoicePaidForOrder(fullOrder);
            
            // Generate and upload PDF if in browser environment
            if (typeof window !== 'undefined' && user.id) {
              try {
                const { getInvoiceByOrderId } = await import('../features/invoices/invoiceService');
                const { ensureInvoicePdfStored } = await import('../features/invoices/invoiceStorage');
                
                const invoice = await getInvoiceByOrderId(fullOrder.id, user.id);
                if (invoice) {
                  // Fetch seller profile for PDF generation
                  let sellerProfile = {
                    company_name: undefined,
                    email: undefined,
                    phone: undefined,
                    website: undefined,
                    address: undefined,
                  };

                  const { data: profileData } = await supabase
                    .from("users_profile")
                    .select("company_name, email, phone, website, address")
                    .eq("id", user.id)
                    .maybeSingle();

                  if (profileData) {
                    sellerProfile = {
                      company_name: profileData.company_name || undefined,
                      email: profileData.email || undefined,
                      phone: profileData.phone || undefined,
                      website: (profileData as any).website || undefined,
                      address: (profileData as any).address || undefined,
                    };
                  }

                  await ensureInvoicePdfStored(invoice, fullOrder, sellerProfile);
                }
              } catch (pdfError) {
                console.error('[useOrders] Failed to store invoice PDF', pdfError);
                // Don't break the import flow if PDF upload fails
              }
            }
          }

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
