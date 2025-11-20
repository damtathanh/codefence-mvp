// src/utils/riskEngine.ts

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

// This is a lightweight shape of an order used for risk breakdown UI.
// It intentionally does NOT import from useOrders to avoid circular deps.
export interface SimpleOrderInput {
  payment_method?: string | null;
  amount?: number | null;
  phone?: string | null;
  product?: string | null;
}

const normStr = (v: string | null | undefined) =>
  (v || "").toString().trim();

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

function hasManyRepeatedDigits(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return /(.)\1{5,}/.test(digits);
}

/**
 * computeRiskScoreV1
 * Used for detailed risk breakdown in the UI (side panel).
 * - Only applies to COD orders.
 * - Non-COD returns: { score: null, level: "none", factors: [] }.
 */
export function computeRiskScoreV1(
  order: SimpleOrderInput,
  history?: CustomerHistoryStats
): RiskScoreResult {
  const paymentMethod = normStr(order.payment_method).toUpperCase();
  const isCOD = !paymentMethod || paymentMethod === "COD";

  if (!isCOD) {
    return {
      score: null,
      level: "none",
      factors: [],
    };
  }

  const factors: RiskFactor[] = [];

  const amount = order.amount ?? 0;
  const phoneRaw = normStr(order.phone);
  const phoneNormalized = normalizeVNPhone(phoneRaw);
  const productName = normStr(order.product).toLowerCase();

  // Amount factor
  let amountScore = 0;
  if (amount <= 300_000) amountScore = 5;
  else if (amount <= 700_000) amountScore = 10;
  else if (amount <= 1_500_000) amountScore = 15;
  else amountScore = 25;

  if (amountScore > 0) {
    factors.push({
      key: "amount",
      label: "Order value",
      score: amountScore,
    });
  }

  // Phone factor
  let phoneScore = 0;
  if (!isValidVNPhone(phoneRaw)) {
    phoneScore += 40;
  } else if (hasManyRepeatedDigits(phoneNormalized)) {
    phoneScore += 10;
  }

  if (phoneScore > 0) {
    factors.push({
      key: "phone",
      label: "Phone quality",
      score: phoneScore,
    });
  }

  // Product factor
  let productScore = 0;
  const riskyKeywords = [
    "giảm cân",
    "trà giảm cân",
    "weight loss",
    "detox",
    "trắng da",
    "serum b",
    "kem trộn",
    "kích trắng",
  ];

  if (productName && riskyKeywords.some((kw) => productName.includes(kw))) {
    productScore += 5;
  }

  if (productScore > 0) {
    factors.push({
      key: "product",
      label: "Product type",
      score: productScore,
    });
  }

  // History factor (if provided)
  const stats: CustomerHistoryStats = history || { badOrders: 0, goodOrders: 0 };

  let historyScore = 0;
  let historyDiscount = 0;

  if (stats.badOrders >= 3) historyScore += 25;
  else if (stats.badOrders >= 1) historyScore += 10;

  if (stats.goodOrders >= 3 && stats.badOrders === 0) {
    historyDiscount = 10;
  }

  if (historyScore > 0) {
    factors.push({
      key: "history_bad",
      label: "Past failed orders",
      score: historyScore,
    });
  }

  if (historyDiscount > 0) {
    factors.push({
      key: "history_good",
      label: "Good customer history",
      score: -historyDiscount,
    });
  }

  let total = factors.reduce((sum, f) => sum + f.score, 0);
  total = Math.max(0, Math.min(total, 100));

  let level: RiskLevel;
  if (total <= 30) level = "low";
  else if (total <= 70) level = "medium";
  else level = "high";

  return {
    score: total,
    level,
    factors,
  };
}

// ===== Simplified risk evaluation for import flow =====

import type { OrderStatus } from "../constants/orderStatus";
import { ORDER_STATUS } from "../constants/orderStatus";

export interface RiskInput {
  paymentMethod: string | null | undefined;
  amountVnd: number;
  phone: string;
  address?: string | null;
  pastOrders: { status: string | null }[];
  productName?: string | null;
}

export interface RiskOutput {
  score: number | null;     // 0–100 for COD, null for non-COD
  level: RiskLevel;
  reasons: (string | { factor: string; score: number; desc: string })[];
  version?: "v1";
}

/**
 * evaluateRisk
 * - Used when importing orders.
 * - Only COD orders get a risk score.
 * - Non-COD orders → score = null, level = "none".
 * - Thresholds:
 *   - 0–30   = low
 *   - 31–70  = medium
 *   - 71–100 = high
 */
export function evaluateRisk(input: RiskInput, blacklistPhones?: Set<string>): RiskOutput {
  const { paymentMethod, amountVnd, phone, address, pastOrders } = input;

  const method = (paymentMethod || "").toUpperCase();

  // ❗ Non-COD: không chấm risk
  if (method && method !== "COD") {
    return {
      score: null,
      level: "none",
      reasons: [],
      version: "v1",
    };
  }

  let score = 0;
  const reasons: (string | { factor: string; score: number; desc: string })[] = [];

  // Rule 1: COD base risk
  score += 30;
  reasons.push("COD order");

  // Rule 2: high amount
  if (amountVnd >= 1_000_000) {
    score += 20;
    reasons.push("High order value (>= 1M VND)");
  }

  // Rule 3: past failed COD orders (based on status)
  const failedStatuses: OrderStatus[] = [
    ORDER_STATUS.CUSTOMER_CANCELLED,
    ORDER_STATUS.ORDER_REJECTED,
  ];

  const failedCount = pastOrders.filter(
    (o) => o.status && failedStatuses.includes(o.status as OrderStatus)
  ).length;

  if (failedCount >= 3) {
    score += 30;
    reasons.push("Customer has 3+ failed COD orders");
  } else if (failedCount >= 1) {
    score += 10;
    reasons.push("Customer previously failed COD");
  }

  // Rule 4: address heuristic (ví dụ khu công nghiệp)
  if (address) {
    const lower = address.toLowerCase();
    if (lower.includes("khu công nghiệp")) {
      score += 10;
      reasons.push("Address in industrial area");
    }
  }

  // Rule 5: Blacklist Override
  if (blacklistPhones?.has(phone)) {
    score = Math.max(score, 80);
    reasons.push({
      factor: "blacklist",
      score: 50,
      desc: "Customer is in blacklist (forced high risk)"
    });
  }

  // Clamp 0–100
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // Mapping level theo chuẩn của m: <=30 / 31–70 / 71+
  let level: RiskLevel;
  if (score <= 30) level = "low";
  else if (score <= 70) level = "medium";
  else level = "high";

  return { score, level, reasons, version: "v1" };
}
