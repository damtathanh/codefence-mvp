// Clean + normalize text
export const normalize = (str: string) =>
  String(str || "")
    .toLowerCase()
    .replace(/đ/g, "d") // Handle Vietnamese 'đ' specifically
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, " ") // Replace punctuation with SPACE, not empty string
    .trim()
    .replace(/\s+/g, " "); // Collapse multiple spaces

// EXACT Excel → DB mapping
// Canonical Key -> List of Synonyms
const HEADER_MAPPINGS: Record<string, string[]> = {
  order_id: ["order id", "order_id", "ma don", "ma don hang", "order", "orderid", "id don"],
  customer_name: ["customer name", "customer_name", "ten khach", "ten khach hang", "full name", "fullname", "ho ten"],
  phone: ["phone", "phone number", "phone_number", "so dien thoai", "sdt", "mobile", "phone mobile"],
  product: ["product", "ten san pham", "san pham", "sku name"],
  amount: ["amount", "amount vnd", "tong tien", "gia tri don", "order value", "order amount", "total amount", "total"],
  payment_method: ["payment method", "payment_method", "hinh thuc thanh toan", "thanh toan", "kenh thanh toan", "payment"],
  address_detail: ["address detail", "dia chi chi tiet", "dia chi", "street address", "address line 1"],
  ward: ["ward", "phuong xa", "phuong", "xa"],
  district: ["district", "quan huyen", "quan", "huyen"],
  province: ["province", "tinh thanh pho", "tinh", "thanh pho", "city", "province city"],
  channel: ["channel", "kenh", "sales channel", "platform"],
  source: ["source", "nguon", "campaign", "utm source"],
  order_date: ["order date", "ngay dat hang", "ngay tao don", "ngay don hang", "date", "order_date", "ngay dat"],
  gender: ["gender", "gioi tinh", "sex"],
  birth_year: ["birthday", "birth year", "nam sinh", "year of birth"],
  discount_amount: ["discount", "discount amount", "giam gia", "voucher amount", "coupon amount"],
  shipping_fee: ["shipping fee", "phi ship", "phi van chuyen", "van chuyen", "delivery fee"],
};

// Required fields (Excel MUST have these)
const REQUIRED_KEYS = [
  "order_id",
  "customer_name",
  "phone",
  "amount",
  "order_date",
];

export interface HeaderMappingResult {
  mapping: Record<string, number>; // canonicalKey -> columnIndex
  missingRequired: string[];       // canonical keys that could not be mapped
  unknownHeaders: string[];        // headers that were not recognized
}

export function validateAndMapHeaders(headers: string[]): HeaderMappingResult {
  const normalizedHeaders = headers.map(h => normalize(h));
  const mapping: Record<string, number> = {};
  const foundKeys = new Set<string>();
  const unknownHeaders: string[] = [];

  // 1. Try to map each header to a canonical key
  normalizedHeaders.forEach((header, index) => {
    let matchedKey: string | null = null;

    for (const [key, aliases] of Object.entries(HEADER_MAPPINGS)) {
      // Check if the normalized header matches any alias (which are also normalized in our list logic, 
      // but let's be safe and normalize aliases too if we hadn't pre-normalized them. 
      // Ideally HEADER_MAPPINGS values should be pre-normalized or we normalize them on the fly).
      // Since our normalize function removes accents, "mã đơn" becomes "ma don".
      // Our HEADER_MAPPINGS above uses "ma don", so it matches.

      if (aliases.includes(header)) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      // If we haven't found this key yet, map it. 
      // If duplicates exist, we take the first one (standard behavior).
      if (!foundKeys.has(matchedKey)) {
        mapping[matchedKey] = index;
        foundKeys.add(matchedKey);
      }
    } else {
      unknownHeaders.push(headers[index]); // Keep original header name for reporting
    }
  });

  // 2. Check for missing required keys
  const missingRequired = REQUIRED_KEYS.filter(key => !foundKeys.has(key));

  return {
    mapping,
    missingRequired,
    unknownHeaders,
  };
}
