import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import type { Order, Product } from '../types/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface OrderInput {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  product_id: string; // Product ID (UUID)
  product_name?: string; // Optional product name for display/validation
  amount: number;
}

export interface InvalidOrderRow {
  order: {
    order_id: string;
    customer_name: string;
    phone: string;
    address: string | null;
    product: string;
    product_name?: string;
    amount: number;
    [key: string]: any;
  };
  rowIndex: number;
  reason: string;
}

export const useOrders = () => {
  const { user } = useAuth();

  // Fetch all products for the current user
  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    if (!user) {
      return [];
    }
    const { data, error } = await supabase
      .from('products')
      .select('id, name, user_id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return (data as Product[]) || [];
  }, [user]);

  // Find product by name (case-insensitive)
  const findProductByName = useCallback(async (productName: string): Promise<Product | null> => {
    if (!user || !productName) {
      return null;
    }
    const products = await fetchProducts();
    const found = products.find(p => 
      p.name.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    return found || null;
  }, [user, fetchProducts]);

  // Validate order data
  const validateOrder = useCallback((order: Partial<OrderInput>): string | null => {
    if (!order.order_id || order.order_id.trim() === '') {
      return 'Order ID is required';
    }
    if (!order.customer_name || order.customer_name.trim() === '') {
      return 'Customer name is required';
    }
    if (!order.phone || order.phone.trim() === '') {
      return 'Phone number is required';
    }
    if (!order.product_id || order.product_id.trim() === '') {
      return 'Product is required. Please select a valid product.';
    }
    if (!order.amount || order.amount <= 0) {
      return 'Amount must be greater than 0';
    }
    return null;
  }, []);

  // Validate and map product names to product IDs
  const validateAndMapProducts = useCallback(async (
    orders: Array<{ product: string; [key: string]: any }>
  ): Promise<{
    validOrders: OrderInput[];
    invalidOrders: InvalidOrderRow[];
  }> => {
    const products = await fetchProducts();
    const productMap = new Map<string, Product>();
    products.forEach(p => {
      productMap.set(p.name.toLowerCase().trim(), p);
    });

    const validOrders: OrderInput[] = [];
    const invalidOrders: InvalidOrderRow[] = [];

    orders.forEach((order, index) => {
      const productName = (order.product || '').trim();
      if (!productName) {
        invalidOrders.push({
          order: order as any,
          rowIndex: index + 1,
          reason: 'Product name is empty',
        });
        return;
      }

      const product = productMap.get(productName.toLowerCase());
      if (!product) {
        invalidOrders.push({
          order: { ...order, product_name: productName } as any,
          rowIndex: index + 1,
          reason: `Product "${productName}" not found in products list`,
        });
        return;
      }

      // Map to OrderInput with product_id
      const { product: _, ...rest } = order;
      validOrders.push({
        ...rest,
        product_id: product.id,
        product_name: product.name,
      } as OrderInput);
    });

    return { validOrders, invalidOrders };
  }, [fetchProducts]);


  // Insert a single order
  const insertOrder = useCallback(async (orderData: OrderInput): Promise<Order> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Validate order
    const validationError = validateOrder(orderData);
    if (validationError) {
      throw new Error(validationError);
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', orderData.product_id)
      .eq('user_id', user.id)
      .single();

    if (productError || !product) {
      throw new Error('Invalid product selected. Please select a valid product.');
    }

    // Prepare order for insertion with auto-generated Status and Risk Score
    const orderToInsert = {
      user_id: user.id,
      order_id: orderData.order_id.trim(),
      customer_name: orderData.customer_name.trim(),
      phone: orderData.phone.trim(),
      address: orderData.address?.trim() || null,
      product_id: orderData.product_id,
      amount: orderData.amount,
      status: 'Pending', // Auto-generated
      risk_score: 'N/A', // Auto-generated
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select(`
        *,
        products:product_id (
          id,
          name,
          category
        )
      `)
      .single();

    if (error) {
      console.error('Error inserting order:', error);
      throw new Error(`Failed to insert order: ${error.message}`);
    }

    return data as Order;
  }, [user, validateOrder]);

  // Parse CSV file (returns orders with product names, not IDs)
  const parseCSV = useCallback(async (file: File): Promise<Array<{ product: string; [key: string]: any }>> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const orders = results.data.map((row: any) => {
              // Map CSV columns to order fields (case-insensitive, flexible mapping)
              const orderId = row['Order ID'] || row['order_id'] || row['OrderID'] || row['OrderId'] || '';
              const customerName = row['Customer Name'] || row['customer_name'] || row['Customer'] || row['customer'] || '';
              const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || row['Customer Phone'] || row['customer_phone'] || '';
              const address = row['Address'] || row['address'] || row['Customer Address'] || row['customer_address'] || null;
              const product = row['Product'] || row['product'] || row['Product Name'] || row['product_name'] || '';
              const amount = parseFloat(row['Amount'] || row['amount'] || row['Price'] || row['price'] || '0');

              return {
                order_id: orderId.toString(),
                customer_name: customerName,
                phone: phone.toString(),
                address: address || null,
                product: product,
                amount: isNaN(amount) ? 0 : amount,
              };
            });

            resolve(orders);
          } catch (err) {
            reject(new Error(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }, []);

  // Parse XLSX file (returns orders with product names, not IDs)
  const parseXLSX = useCallback(async (file: File): Promise<Array<{ product: string; [key: string]: any }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const orders = jsonData.map((row: any) => {
            // Map XLSX columns to order fields (case-insensitive, flexible mapping)
            const orderId = row['Order ID'] || row['order_id'] || row['OrderID'] || row['OrderId'] || '';
            const customerName = row['Customer Name'] || row['customer_name'] || row['Customer'] || row['customer'] || '';
            const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone_number'] || row['Customer Phone'] || row['customer_phone'] || '';
            const address = row['Address'] || row['address'] || row['Customer Address'] || row['customer_address'] || null;
            const product = row['Product'] || row['product'] || row['Product Name'] || row['product_name'] || '';
            const amount = parseFloat(row['Amount'] || row['amount'] || row['Price'] || row['price'] || '0');

            return {
              order_id: orderId.toString(),
              customer_name: customerName,
              phone: phone.toString(),
              address: address || null,
              product: product,
              amount: isNaN(amount) ? 0 : amount,
            };
          });

          resolve(orders);
        } catch (err) {
          reject(new Error(`Failed to parse XLSX: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Parse uploaded file (CSV or XLSX) - returns orders with product names
  const parseFile = useCallback(async (file: File): Promise<Array<{ product: string; [key: string]: any }>> => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return parseXLSX(file);
    } else {
      throw new Error('Unsupported file format. Please upload a CSV or XLSX file.');
    }
  }, [parseCSV, parseXLSX]);

  // Insert multiple orders
  const insertOrders = useCallback(async (orders: OrderInput[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        await insertOrder(order);
        success++;
      } catch (err) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${order.customer_name}: ${errorMessage}`);
      }
    }

    return { success, failed, errors };
  }, [user, insertOrder]);

  return {
    validateOrder,
    insertOrder,
    insertOrders,
    parseFile,
    validateAndMapProducts,
    fetchProducts,
    findProductByName,
  };
};

