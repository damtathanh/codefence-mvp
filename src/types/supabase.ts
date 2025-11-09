// TypeScript types for Supabase tables

export interface Product {
  id: string;
  user_id: string;
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
  product_id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  amount: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'verified' | 'rejected';
  created_at?: string;
  updated_at?: string;
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
  order_id: string;
  action: string;
  status: 'verified' | 'rejected' | 'flagged';
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
