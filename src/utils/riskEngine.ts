// src/utils/riskEngine.ts

import { ORDER_STATUS } from "../constants/orderStatus";
import type { OrderStatus } from "../constants/orderStatus";

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface RiskFactor {
  key: string;
  label: string;
  score: number;
}

export interface CustomerHistoryStats {
  badOrders: number;
  goodOrders: number;
}

export interface RiskScoreResult {
  score: number | null;
  level: RiskLevel;
  factors: RiskFactor[];
}

export interface SimpleOrderInput {
  payment_method?: string | null;
  amount?: number | null;
  phone?: string | null;
  product?: string | null;
}

// Helper functions
const normStr = (v: string | null | undefined) => (v || "").toString().trim();

function normalizeVNPhone(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+84")) {
    const rest = s.slice(3);
    if (/^\d{9}$/.test(rest)) {
      return "0" + rest;
    }
  }
  return s;
}

function isValidVNPhone(raw: string): boolean {
  const n = normalizeVNPhone(raw);
  return /^0\d{9}$/.test(n);
}

/**
 * Hàm giả lập Check Zalo API (CẢI TIẾN)
 * Rule: Nếu SĐT có 2 số cuối giống nhau (00, 11, 22...99) -> Coi như KHÔNG CÓ ZALO (Sim rác)
 * Giúp bạn dễ test ra case Rủi ro cao hơn.
 */
export function mockCheckZaloExistence(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  if (/(00|11|22|33|44|55|66|77|88|99)$/.test(clean)) {
    return false;
  }
  return true;
}

/**
 * Compute logic cho UI cũ (nếu còn dùng)
 */
export function computeRiskScoreV1(
  order: SimpleOrderInput,
  history?: CustomerHistoryStats
): RiskScoreResult {
  // Logic cũ giữ nguyên hoặc map sang logic mới nếu cần
  // Ở đây tôi giữ simple để tránh lỗi legacy code
  return { score: 10, level: "low", factors: [] };
}

// ===== LOGIC MỚI CHO IMPORT FLOW =====

export interface RiskInput {
  paymentMethod: string | null | undefined;
  amountVnd: number;
  phone: string;
  address?: string | null;
  addressDetail?: string | null;
  ward?: string | null;
  district?: string | null;
  pastOrders: { status: string | null }[];
  productName?: string | null;
  zaloExists?: boolean;
}

export interface RiskOutput {
  score: number | null;
  level: RiskLevel;
  reasons: (string | { factor: string; score: number; desc: string })[];
  version?: "v2"; // Version 2
}

/**
 * evaluateRisk (Logic chấm điểm mới - Granular Scoring)
 */
export function evaluateRisk(input: RiskInput, blacklistPhones?: Set<string>): RiskOutput {
  const { paymentMethod, amountVnd, phone, address, pastOrders, zaloExists } = input;
  const method = (paymentMethod || "").toUpperCase();
  const productName = (input.productName || "").toLowerCase();
  const addressDetail = (address || "").trim();

  // 1. Non-COD: Rủi ro bằng 0 (An toàn)
  if (method && method !== "COD") {
    return { score: null, level: "none", reasons: [], version: "v2" };
  }

  let score = 0;
  const reasons: (string | { factor: string; score: number; desc: string })[] = [];

  // 2. Base COD Risk
  score += 10;
  reasons.push("COD Order (+10)");

  // 3. Zalo Check (Quan trọng nhất)
  if (zaloExists === false) {
    score += 40;
    reasons.push({ factor: 'zalo', score: 40, desc: 'Phone not on Zalo / Sim Rác (+40)' });
  }

  // 4. Amount Risk (Chia nhỏ mức tiền)
  if (amountVnd >= 1_000_000) {
    score += 25;
    reasons.push("High Value > 1M (+25)");
  } else if (amountVnd >= 500_000) {
    score += 10;
    reasons.push("Medium Value > 500k (+10)");
  }

  // 5. Product Risk (Phân loại sản phẩm)
  // Keywords rủi ro cao (Điện tử, dễ vỡ, giá trị cao)
  const highRiskKeywords = ['nồi chiên', 'sạc', 'cáp', 'tai nghe', 'loa', 'bluetooth', 'điện thoại', 'máy tính', 'đồng hồ', 'camera'];
  // Keywords rủi ro trung bình (Thời trang - hay bị đổi trả do size/màu)
  const fashionKeywords = ['áo', 'quần', 'giày', 'dép', 'túi', 'balo', 'ví', 'váy', 'đầm', 'sét'];

  if (highRiskKeywords.some(k => productName.includes(k))) {
    score += 20;
    reasons.push("High Risk Product (Electronics) (+20)");
  } else if (fashionKeywords.some(k => productName.includes(k))) {
    score += 10;
    reasons.push("Fashion Product (Return Risk) (+10)");
  }

  // 6. Address Risk (Địa chỉ quá ngắn)
  if (addressDetail.length > 0 && addressDetail.length < 15) {
    score += 20;
    reasons.push("Vague Address (<15 chars) (+20)");
  }

  // 7. Past History (Lịch sử bom hàng)
  const failedStatuses: OrderStatus[] = [
    ORDER_STATUS.CUSTOMER_CANCELLED,
    ORDER_STATUS.ORDER_REJECTED,
  ];
  const failedCount = pastOrders.filter(
    (o) => o.status && failedStatuses.includes(o.status as OrderStatus)
  ).length;

  if (failedCount >= 3) {
    score += 30;
    reasons.push("Repeated Failures (3+) (+30)");
  } else if (failedCount >= 1) {
    score += 10;
    reasons.push("Previous Failure (+10)");
  }

  // 8. Blacklist Override (Ưu tiên cao nhất)
  if (blacklistPhones?.has(phone)) {
    score = Math.max(score, 85); // Đẩy thẳng lên High Risk
    reasons.push({
      factor: "blacklist",
      score: 0, // Đã set base cao rồi
      desc: "BLACKLISTED CUSTOMER (FORCE HIGH)"
    });
  }

  // Clamp 0–100
  score = Math.max(0, Math.min(score, 100));

  // Mapping level
  let level: RiskLevel;
  if (score <= 30) level = "low";
  else if (score <= 60) level = "medium"; // Mở rộng range Medium ra một chút
  else level = "high";

  return { score, level, reasons, version: "v2" };
}