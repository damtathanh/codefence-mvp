import { ORDER_STATUS } from "../constants/orderStatus";
// Helper functions
const normStr = (v) => (v || "").toString().trim();
function normalizeVNPhone(raw) {
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
function isValidVNPhone(raw) {
    const n = normalizeVNPhone(raw);
    return /^0\d{9}$/.test(n);
}
/**
 * Hàm giả lập Check Zalo API (CẢI TIẾN)
 */
export function mockCheckZaloExistence(phone) {
    const clean = phone.replace(/\D/g, "");
    if (/(00|11|22|33|44|55|66|77|88|99)$/.test(clean)) {
        return false;
    }
    return true;
}
/**
 * Compute logic cho UI cũ (nếu còn dùng)
 */
export function computeRiskScoreV1(order, history) {
    return { score: 10, level: "low", factors: [] };
}
/**
 * evaluateRisk (Logic chấm điểm mới - Granular Scoring)
 */
export function evaluateRisk(input, blacklistPhones) {
    const { paymentMethod, amountVnd, phone, pastOrders, zaloExists } = input;
    const method = (paymentMethod || "").toUpperCase();
    const productName = (input.productName || "").toLowerCase();
    // 1. Non-COD: Rủi ro bằng 0 (An toàn)
    if (method && method !== "COD") {
        return { score: null, level: "none", reasons: [], version: "v2" };
    }
    let score = 0;
    const reasons = [];
    // 2. Base COD Risk
    score += 10;
    reasons.push("COD Order (+10)");
    // 3. Zalo Check
    // Tạm tắt check Zalo giả lập để tránh báo sai (Sim rác)
    /*
    if (zaloExists === false) {
      score += 40;
      reasons.push({ factor: 'zalo', score: 40, desc: 'Phone not on Zalo / Sim Rác (+40)' });
    }
    */
    // 4. Amount Risk
    if (amountVnd >= 1000000) {
        score += 25;
        reasons.push("High Value > 1M (+25)");
    }
    else if (amountVnd >= 500000) {
        score += 10;
        reasons.push("Medium Value > 500k (+10)");
    }
    // 5. Product Risk
    const highRiskKeywords = ['nồi chiên', 'sạc', 'cáp', 'tai nghe', 'loa', 'bluetooth', 'điện thoại', 'máy tính', 'đồng hồ', 'camera'];
    const fashionKeywords = ['áo', 'quần', 'giày', 'dép', 'túi', 'balo', 'ví', 'váy', 'đầm', 'sét'];
    if (highRiskKeywords.some(k => productName.includes(k))) {
        score += 20;
        reasons.push("High Risk Product (Electronics) (+20)");
    }
    else if (fashionKeywords.some(k => productName.includes(k))) {
        score += 10;
        reasons.push("Fashion Product (Return Risk) (+10)");
    }
    // 6. Address Risk (Logic Mới: Structured vs Unstructured)
    const hasDetail = !!input.addressDetail?.trim();
    const hasWard = !!input.ward?.trim();
    const hasDistrict = !!input.district?.trim();
    const hasProvince = !!input.province?.trim(); // Fix lỗi TS ở đây
    // Kịch bản A: Nhập đủ 4 cấp (An toàn nhất)
    const isFullStructured = hasDetail && hasWard && hasDistrict && hasProvince;
    // Kịch bản B: Chỉ nhập mỗi Address Detail (Gộp chung)
    const isOnlyDetail = hasDetail && !hasWard && !hasDistrict && !hasProvince;
    if (isFullStructured) {
        // OK - Đủ thông tin hành chính
    }
    else if (isOnlyDetail) {
        // Trường hợp gộp: Check kỹ hơn
        const detailVal = (input.addressDetail || "").toLowerCase().trim();
        // Check 1: Độ dài quá ngắn
        if (detailVal.length < 15) {
            score += 25;
            reasons.push("Vague Address (Details < 15 chars) (+20)");
        }
        // Check 2: Dài nhưng thiếu từ khóa hành chính (Quận/Huyện/Tỉnh/TP)
        else {
            const adminKeywords = ['p.', 'phường', 'xã', 'q.', 'quận', 'h.', 'huyện', 'tp', 'thành phố', 'tỉnh'];
            const hasAdminKeyword = adminKeywords.some(k => detailVal.includes(k));
            if (!hasAdminKeyword) {
                score += 15;
                reasons.push("Unstructured Address (Missing admin keywords) (+15)");
            }
        }
    }
    else {
        // Kịch bản C: Nhập lỡ cỡ (Có cái này thiếu cái kia)
        // Ví dụ: Có Tỉnh nhưng thiếu Huyện/Xã
        score += 15;
        reasons.push("Incomplete Address Structure (+15)");
    }
    // 7. Past History
    const failedStatuses = [
        ORDER_STATUS.CUSTOMER_CANCELLED,
        ORDER_STATUS.ORDER_REJECTED,
    ];
    const failedCount = pastOrders.filter((o) => o.status && failedStatuses.includes(o.status)).length;
    if (failedCount >= 3) {
        score += 30;
        reasons.push("Repeated Failures (3+) (+30)");
    }
    else if (failedCount >= 1) {
        score += 10;
        reasons.push("Previous Failure (+10)");
    }
    // 8. Blacklist Override
    if (blacklistPhones?.has(phone)) {
        score = Math.max(score, 85);
        reasons.push({
            factor: "blacklist",
            score: 0,
            desc: "BLACKLISTED CUSTOMER (FORCE HIGH)"
        });
    }
    // Clamp 0–100
    score = Math.max(0, Math.min(score, 100));
    // Mapping level
    let level;
    if (score <= 30)
        level = "low";
    else if (score <= 70)
        level = "medium";
    else
        level = "high";
    return { score, level, reasons, version: "v2" };
}
