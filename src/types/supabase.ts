// TypeScript types for Supabase tables

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
  status: string; // Default: 'Pending'
  risk_score: number | null; // Numeric value or null (displayed as 'N/A' in UI when null)
  created_at?: string;
  updated_at?: string;
  // Joined product data (when fetching with join)
  products?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

export interface Invoice {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface History {
  id: string;
  user_id: string;
  order_id: string | null; // Used for both product IDs and order IDs
  action: string;
  status: 'success' | 'failed';
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  sender: string;
  content: string;
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
