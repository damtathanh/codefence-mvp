// src/utils/riskEngine.ts

import type { OrderInput } from "../hooks/useOrders";

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

export function computeRiskScoreV1(
  order: OrderInput,
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
  const amount = order.amount || 0;
  const phoneRaw = normStr(order.phone);
  const phoneNormalized = normalizeVNPhone(phoneRaw);
  const productName = normStr(order.product).toLowerCase();

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

  let productScore = 0;
  const riskyKeywords = [
    "giảm cân",
    "trà giảm cân",
    "weight loss",
    "detox",
    "trắng da",
    "serum b",
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

  const stats: CustomerHistoryStats = history || {
    badOrders: 0,
    goodOrders: 0,
  };

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

  let level: RiskLevel = "low";
  if (total <= 30) level = "low";
  else if (total <= 70) level = "medium";
  else level = "high";

  return {
    score: total,
    level,
    factors,
  };
}

import type { OrderStatus } from "../constants/orderStatus";
import { ORDER_STATUS } from "../constants/orderStatus";

// New simplified risk evaluation function for import flow
export interface RiskInput {
  paymentMethod: string | null | undefined;
  amountVnd: number;
  phone: string;
  address?: string | null;
  pastOrders: { status: string | null }[];
  productName?: string | null;
}

export type RiskLevel = "Low" | "Medium" | "High";

export interface RiskOutput {
  score: number;            // 0–100
  level: RiskLevel;
  reasons: string[];
  version?: "v1";
}

export function evaluateRisk(input: RiskInput): RiskOutput {
  const { paymentMethod, amountVnd, phone, address, pastOrders } = input;

  let score = 0;
  const reasons: string[] = [];

  const method = (paymentMethod || '').toUpperCase();

  // Rule 1: COD base risk
  if (method === 'COD') {
    score += 30;
    reasons.push('COD order');
  }

  // Rule 2: high amount
  if (amountVnd >= 1_000_000) {
    score += 20;
    reasons.push('High order value (>= 1M VND)');
  }

  // Rule 3: past failed COD orders (based on status)
  const failedStatuses: OrderStatus[] = [ORDER_STATUS.CUSTOMER_CANCELLED, ORDER_STATUS.ORDER_REJECTED];
  const failedCount = pastOrders.filter(o =>
    o.status && failedStatuses.includes(o.status as OrderStatus)
  ).length;

  if (failedCount >= 3) {
    score += 30;
    reasons.push('Customer has 3+ failed COD orders');
  } else if (failedCount >= 1) {
    score += 10;
    reasons.push('Customer previously failed COD');
  }

  // Rule 4: address heuristic
  if (address) {
    const lower = address.toLowerCase();
    if (lower.includes('khu công nghiệp')) {
      score += 10;
      reasons.push('Address in industrial area');
    }
  }

  // Clamp
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // Level
  let level: RiskLevel = 'Low';
  if (score >= 70) level = 'High';
  else if (score >= 40) level = 'Medium';

  return { score, level, reasons, version: "v1" };
}

