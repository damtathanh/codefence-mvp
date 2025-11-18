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
  phone: string;
  address: string | null;
  product_id: string | null; // UUID reference to products table
  product?: string; // Legacy field (for backward compatibility during migration)
  amount: number;
  status: OrderStatus;
  risk_score: number | null; // Numeric value or null (displayed as 'N/A' in UI when null)
  risk_level: string | null; // 'Low' | 'Medium' | 'High'
  created_at?: string;
  updated_at?: string;
  // Joined product data (when fetching with join)
  products?: {
    id: string;
    name: string;
    category: string;
  } | null;
  // Timeline/payment fields
  payment_method?: string | null;
  confirmation_sent_at?: string | null;
  customer_confirmed_at?: string | null;
  cancelled_at?: string | null;
  qr_sent_at?: string | null;
  qr_expired_at?: string | null;
  paid_at?: string | null;
  cancel_reason?: string | null;
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
  status: 'Pending' | 'Paid' | 'Refunded' | 'Cancelled';
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
