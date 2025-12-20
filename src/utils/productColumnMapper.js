// Normalize header string: trim and lowercase
export function norm(h) {
    return h.trim().toLowerCase();
}
// Header labels with their internal keys and both language options
const HEADER_MAPPINGS = {
    product_id: { en: "product id", vi: "mã sản phẩm" },
    name: { en: "product name", vi: "tên sản phẩm" },
    category: { en: "category", vi: "danh mục" },
    price: { en: "price (vnd)", vi: "thành tiền (vnđ)" },
    stock: { en: "stock", vi: "số lượng" },
};
// Required columns (category is optional)
const REQUIRED_COLUMNS = ["product_id", "name", "category", "price", "stock"];
// Human-friendly display names for error messages
const DISPLAY_NAMES = {
    product_id: { en: "Product ID", vi: "Mã sản phẩm" },
    name: { en: "Product Name", vi: "Tên sản phẩm" },
    category: { en: "Category", vi: "Danh mục" },
    price: { en: "Price (VND)", vi: "Thành tiền (VNĐ)" },
    stock: { en: "Stock", vi: "Số lượng" },
};
export function normalize(str) {
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
// Heuristics to detect misnamed columns
function detectMisnamedColumn(header, normalizedHeader, requiredKey) {
    const normalized = normalizedHeader;
    switch (requiredKey) {
        case 'product_id':
            // Chấp nhận các dạng: "ID", "Product ID", "Product Code"...
            return (normalized === 'id' ||
                normalized.includes('product id') ||
                (normalized.includes('product') && (normalized.includes('id') || normalized.includes('code'))));
        case 'name':
            return normalized.includes('product') || normalized.includes('name');
        case 'category':
            return normalized.includes('category') || normalized.includes('danh muc');
        case 'price':
            return (normalized.includes('amount') ||
                normalized.includes('money') ||
                normalized.includes('price') ||
                normalized.includes('total') ||
                normalized.includes('thanh tien'));
        case 'stock':
            return (normalized.includes('stock') ||
                normalized.includes('quantity') ||
                normalized.includes('so luong'));
        default:
            return false;
    }
}
export function validateAndMapProductHeaders(headers) {
    // Build mapping by matching each header against known labels
    const mapping = {};
    const normalizedHeaders = headers.map(h => normalize(h));
    const unmatchedHeaders = [];
    // For each known column, try to find a matching header
    for (const [key, labels] of Object.entries(HEADER_MAPPINGS)) {
        const normalizedEn = normalize(labels.en);
        const normalizedVi = normalize(labels.vi);
        // Find matching header (case-insensitive, accent-insensitive)
        const matchedIndex = normalizedHeaders.findIndex(h => h === normalizedEn || h === normalizedVi);
        if (matchedIndex !== -1) {
            // Store the original header name for data extraction
            mapping[key] = headers[matchedIndex];
        }
    }
    // Collect unmatched headers for misnamed detection
    const matchedHeaderIndices = new Set();
    for (const [key, labels] of Object.entries(HEADER_MAPPINGS)) {
        const normalizedEn = normalize(labels.en);
        const normalizedVi = normalize(labels.vi);
        const matchedIndex = normalizedHeaders.findIndex(h => h === normalizedEn || h === normalizedVi);
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
    const misnamed = [];
    const matchedForMisnamed = new Set(); // Track which required columns have misnamed candidates
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
    const missingRequired = [];
    for (const key of REQUIRED_COLUMNS) {
        if (!mapping[key] && !matchedForMisnamed.has(key)) {
            const display = DISPLAY_NAMES[key];
            missingRequired.push(display.en);
        }
    }
    // Build error message if there are issues
    if (missingRequired.length > 0 || misnamed.length > 0) {
        const parts = [];
        if (missingRequired.length > 0 && misnamed.length === 0) {
            parts.push(`We couldn't import this file. Missing required columns: ${missingRequired.join(", ")}.`);
        }
        else if (missingRequired.length === 0 && misnamed.length > 0) {
            const misnamedList = misnamed.map(m => `"${m.actual}" → should be ${m.expected}`).join(", ");
            parts.push(`We couldn't import this file. Some column names are invalid: ${misnamedList}.`);
        }
        else {
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
