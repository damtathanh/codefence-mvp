// src/utils/phoneUtils.ts
export function normalizePhone(rawInput) {
    if (!rawInput)
        return "";
    // 1. Chuyển thành chuỗi, xóa khoảng trắng
    let str = String(rawInput).trim();
    // 2. Nếu có dấu chấm (do Excel format số), bỏ đi (vd: 912.0 -> 912)
    if (str.includes(".")) {
        str = str.split(".")[0];
    }
    // 3. Xóa tất cả ký tự không phải số
    str = str.replace(/[^0-9]/g, "");
    // 4. Logic thêm số 0
    // Nếu dài 9 số (vd: 912345678) -> Thêm 0 -> 0912345678
    if (str.length === 9) {
        return "0" + str;
    }
    // Nếu dài 11 số và bắt đầu bằng 84 (vd: 84912345678) -> Đổi thành 09...
    if (str.length === 11 && str.startsWith("84")) {
        return "0" + str.slice(2);
    }
    return str;
}
