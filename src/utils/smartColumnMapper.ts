// Normalize header string: trim and lowercase
export function norm(h: string): string {
  return h.trim().toLowerCase();
}

// Header labels with their internal keys and both language options
const HEADER_MAPPINGS: Record<string, { en: string | string[]; vi: string | string[] }> = {
  order_id: { en: "order id", vi: "mã đơn hàng" },
  customer_name: { en: "customer name", vi: "tên khách hàng" },
  phone: { en: "phone number", vi: "số điện thoại" },
  address: { en: "address", vi: "địa chỉ" },
  product: { en: "product", vi: "sản phẩm" },
  amount: { en: "amount (vnd)", vi: "thành tiền (vnđ)" },
  payment_method: { en: "payment method", vi: "phương thức thanh toán" },
  address_detail: { en: "address detail", vi: "địa chỉ chi tiết" },
  ward: { en: "ward", vi: "phường" },
  district: { en: "district", vi: "quận" },
  province: { en: "province", vi: "tỉnh" },
  gender: { en: "gender", vi: "giới tính" },
  birth_year: { en: "birthday", vi: "năm sinh" },
  discount_amount: { en: "discount", vi: "giảm giá" },
  shipping_fee: { en: "shipping fee", vi: "phí giao hàng" },
  channel: { en: "channel", vi: "kênh bán hàng" },
  source: { en: "source", vi: "nguồn" },
  order_date: {
    en: ["order date", "purchase date", "date", "time", "created at"],
    vi: ["ngày đặt hàng", "ngày mua", "ngày order", "ngày tạo", "thời gian"]
  }
};

// Required columns (address is optional)
const REQUIRED_COLUMNS = ["order_id", "customer_name", "phone", "product", "amount"];

// Human-friendly display names for error messages
const DISPLAY_NAMES: Record<string, { en: string; vi: string }> = {
  order_id: { en: "Order ID", vi: "Mã đơn hàng" },
  customer_name: { en: "Customer Name", vi: "Tên khách hàng" },
  phone: { en: "Phone Number", vi: "Số điện thoại" },
  address: { en: "Address", vi: "Địa chỉ" },
  product: { en: "Product", vi: "Sản phẩm" },
  amount: { en: "Amount (VND)", vi: "Thành tiền (VNĐ)" },
  payment_method: { en: "Payment Method", vi: "Phương thức thanh toán" },
  address_detail: { en: "Address Detail", vi: "Địa chỉ chi tiết" },
  ward: { en: "Ward", vi: "Phường" },
  district: { en: "District", vi: "Quận" },
  province: { en: "Province", vi: "Tỉnh" },
  gender: { en: "Gender", vi: "Giới tính" },
  birth_year: { en: "Birthday", vi: "Năm sinh" },
  discount_amount: { en: "Discount", vi: "Giảm giá" },
  shipping_fee: { en: "Shipping Fee", vi: "Phí giao hàng" },
  channel: { en: "Channel", vi: "Kênh bán hàng" },
  source: { en: "Source", vi: "Nguồn" },
  order_date: { en: "Order Date", vi: "Ngày đặt hàng" },
};

export function normalize(str: string | null | undefined) {
  if (!str) return "";
  return String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Heuristics to detect misnamed columns
function detectMisnamedColumn(header: string, normalizedHeader: string, requiredKey: string): boolean {
  const normalized = normalizedHeader;

  switch (requiredKey) {
    case 'order_id':
      return normalized.includes('order') && !normalized.includes('customer');
    case 'customer_name':
      return normalized.includes('cus') || normalized.includes('customer') || normalized.includes('name');
    case 'phone':
      return normalized.includes('phone') || normalized.includes('tel');
    case 'product':
      return normalized.includes('product') || normalized.includes('item');
    case 'amount':
      return normalized.includes('amount') || normalized.includes('money') || normalized.includes('price') || normalized.includes('total');
    default:
      return false;
  }
}

export interface MisnamedColumn {
  actual: string;
  expected: string;
}

export interface HeaderValidationResult {
  mapping: Record<string, string>;
  error?: string;
  missingRequired?: string[];
  misnamed?: MisnamedColumn[];
}

export function validateAndMapHeaders(headers: string[]): HeaderValidationResult {
  // Build mapping by matching each header against known labels
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => normalize(h));
  const unmatchedHeaders: Array<{ original: string; normalized: string }> = [];

  // For each known column, try to find a matching header
  for (const [key, labels] of Object.entries(HEADER_MAPPINGS)) {
    const enLabels = Array.isArray(labels.en) ? labels.en : [labels.en];
    const viLabels = Array.isArray(labels.vi) ? labels.vi : [labels.vi];

    const normalizedEn = enLabels.map(l => normalize(l));
    const normalizedVi = viLabels.map(l => normalize(l));

    // Find matching header (case-insensitive, accent-insensitive)
    const matchedIndex = normalizedHeaders.findIndex(
      h => normalizedEn.includes(h) || normalizedVi.includes(h)
    );

    if (matchedIndex !== -1) {
      // Store the original header name for data extraction
      mapping[key] = headers[matchedIndex];
    }
  }

  // Collect unmatched headers for misnamed detection
  const matchedHeaderIndices = new Set<number>();
  for (const [key, labels] of Object.entries(HEADER_MAPPINGS)) {
    const enLabels = Array.isArray(labels.en) ? labels.en : [labels.en];
    const viLabels = Array.isArray(labels.vi) ? labels.vi : [labels.vi];

    const normalizedEn = enLabels.map(l => normalize(l));
    const normalizedVi = viLabels.map(l => normalize(l));

    const matchedIndex = normalizedHeaders.findIndex(
      h => normalizedEn.includes(h) || normalizedVi.includes(h)
    );
    if (matchedIndex !== -1) {
      matchedHeaderIndices.add(matchedIndex);
    }
  }

  headers.forEach((original, idx) => {
    if (!matchedHeaderIndices.has(idx)) {
      unmatchedHeaders.push({ original, normalized: normalizedHeaders[idx] });
    }
  });

  // Detect misnamed columns using heuristics
  const misnamed: MisnamedColumn[] = [];
  const matchedForMisnamed = new Set<string>(); // Track which required columns have misnamed candidates

  for (const requiredKey of REQUIRED_COLUMNS) {
    if (!mapping[requiredKey]) {
      // Try to find a misnamed candidate
      for (const { original, normalized } of unmatchedHeaders) {
        if (detectMisnamedColumn(original, normalized, requiredKey)) {
          const display = DISPLAY_NAMES[requiredKey];
          misnamed.push({
            actual: original,
            expected: display.en
          });
          matchedForMisnamed.add(requiredKey);
          break; // Only one misnamed per required column
        }
      }
    }
  }

  // Check for missing required columns (exclude those that have misnamed candidates)
  const missingRequired: string[] = [];
  for (const key of REQUIRED_COLUMNS) {
    if (!mapping[key] && !matchedForMisnamed.has(key)) {
      const display = DISPLAY_NAMES[key];
      missingRequired.push(display.en);
    }
  }

  // Build error message if there are issues
  if (missingRequired.length > 0 || misnamed.length > 0) {
    const parts: string[] = [];

    if (missingRequired.length > 0 && misnamed.length === 0) {
      parts.push(`We couldn't import this file. Missing required columns: ${missingRequired.join(", ")}.`);
    } else if (missingRequired.length === 0 && misnamed.length > 0) {
      const misnamedList = misnamed.map(m => `"${m.actual}" → should be ${m.expected}`).join(", ");
      parts.push(`We couldn't import this file. Some column names are invalid: ${misnamedList}.`);
    } else {
      // Both missing and misnamed
      parts.push(`We couldn't import this file.`);
      if (missingRequired.length > 0) {
        parts.push(`Missing required columns: ${missingRequired.join(", ")}.`);
      }
      if (misnamed.length > 0) {
        parts.push(`Columns with invalid names:\n${misnamed.map(m => `"${m.actual}" → should be ${m.expected}`).join('\n')}`);
      }
    }

    return {
      mapping: {},
      error: parts.join('\n'),
      missingRequired,
      misnamed
    };
  }

  return { mapping };
}

// Legacy function for backward compatibility (deprecated)
export function buildHeaderMapping(headers: string[]) {
  const result = validateAndMapHeaders(headers);
  if (result.error) {
    // Return empty mapping if validation fails
    return Object.keys(HEADER_MAPPINGS).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as Record<string, string>);
  }
  return result.mapping;
}

export function validateRequiredHeaders(mapping: Record<string, string>): string[] {
  const required = ['order_id', 'customer_name', 'phone', 'product', 'amount'];
  const missing: string[] = [];

  for (const key of required) {
    if (!mapping[key] || mapping[key] === '') {
      // Get display name for the missing header
      const displayNames: Record<string, string> = {
        order_id: 'Order ID',
        customer_name: 'Customer Name',
        phone: 'Phone Number',
        product: 'Product',
        amount: 'Amount (VND)'
      };
      missing.push(displayNames[key] || key);
    }
  }

  return missing;
}
