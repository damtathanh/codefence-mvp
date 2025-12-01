// TypeScript types for Supabase tables
import type { OrderStatus } from "../constants/orderStatus";

export interface Product {
  id: string; // UUID primary key (never editable)
  user_id: string;
  product_id?: string | null; // Custom business ID (editable TEXT)
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_id: string;
  customer_name: string;
  gender?: 'male' | 'female' | null;
  birth_year?: number | null;
  phone: string;
  address: string | null;
  address_detail?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  product_id: string | null; // UUID reference to products table
  product?: string; // Legacy field (for backward compatibility during migration)
  amount: number;
  discount_amount?: number | null;
  shipping_fee?: number | null;
  channel?: string | null;
  source?: string | null;
  status: OrderStatus;
  risk_score: number | null; // Numeric value or null (displayed as 'N/A' in UI when null)
  risk_level: string | null; // 'Low' | 'Medium' | 'High'
  created_at?: string;
  updated_at?: string;
  order_date?: string | null;
  // Joined product data (when fetching with join)
  products?: {
    id: string;
    name: string;
    category: string;
  } | null;
  // Timeline/payment fields
  approved_at: string | null;
  payment_method?: string | null;
  confirmation_sent_at?: string | null;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  qr_sent_at?: string | null;
  qr_expired_at?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  completed_at?: string | null;
  cancel_reason?: string | null;
  // Refund/Return/Exchange fields
  refunded_amount?: number | null;
  customer_shipping_paid?: number | null;
  seller_shipping_paid?: number | null;
}

export interface ShippingCost {
  id: string;
  order_id: string;
  type: 'outbound' | 'return' | 'exchange';
  amount: number;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  payload_json: any;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
  date: string;
  invoice_code?: string | null;
  paid_at?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined order data
  orders?: {
    order_id?: string | null;
    customer_name?: string | null;
  } | null;
}

export interface History {
  id: string;
  user_id: string;
  order_id: string | null; // Used for both product IDs and order IDs
  action: string;
  status: 'success' | 'failed';
  details: Record<string, string> | null; // JSONB field for change tracking
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string; // UUID
  receiver_id: string | null; // UUID, nullable
  message: string;
  attachment_url: string | null;
  read: boolean;
  system_message: boolean;
  broadcast: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

/**
 * UserProfile - matches the actual database schema in users_profile table
 * Schema: id, email, full_name, phone, company_name, avatar_url, role, created_at
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

/**
 * Shared RiskLevel union used across risk-related types
 */
export type RiskLevel = "none" | "low" | "medium" | "high";

/**
 * CustomerBlacklistEntry - matches the customer_blacklist table
 */
export interface CustomerBlacklistEntry {
  id: string;
  user_id: string;
  phone: string;
  address: string | null;
  reason: string | null;
  created_at: string;
}

/**
 * CustomerStats - aggregated customer statistics per phone number
 */
export interface CustomerStats {
  phone: string;
  last_customer_name: string | null;
  last_address: string | null;
  total_orders: number;
  successful_orders: number; // e.g. status = "Order Paid" or "Completed"
  failed_orders: number;     // e.g. "Customer Cancelled", "Customer Unreachable", "Order Rejected"
  avg_risk_score: number | null;
  avg_risk_level: RiskLevel;
  last_order_at: string | null;
  is_blacklisted: boolean;
}

/**
 * AddressRiskStats - matches address_risk_stats table
 */
export interface AddressRiskStats {
  id: string;
  user_id: string;
  address_key: string;
  full_address: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  total_orders: number;
  success_orders: number;
  failed_orders: number;
  boom_orders: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * AreaRiskStats - matches area_risk_stats table
 */
export interface AreaRiskStats {
  id: string;
  user_id: string;
  province: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  total_orders: number;
  success_orders: number;
  failed_orders: number;
  boom_orders: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
}

