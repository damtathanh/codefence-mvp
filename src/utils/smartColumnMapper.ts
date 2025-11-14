export const REQUIRED_HEADERS = {
    order_id: ["order id", "orderid", "mã đơn hàng", "ma don hang", "voucher code", "order code"],
    customer_name: ["customer name", "customer full name", "tên khách hàng", "ten khach hang"],
    phone: ["phone", "phone number", "sđt", "sdt"],
    address: ["address", "địa chỉ", "dia chi"],
    product: ["product", "product name", "sản phẩm", "san pham"],
    amount: ["amount", "giá trị đơn", "gia tri don", "price"],
  };
  
  export function normalize(str: string) {
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  
  export function buildHeaderMapping(headers: string[]) {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map((h) => normalize(h));
  
    for (const key in REQUIRED_HEADERS) {
      const aliases = REQUIRED_HEADERS[key];
  
      const matched = normalizedHeaders.find((col) =>
        aliases.map(normalize).includes(col)
      );
  
      if (matched) {
        const realIndex = normalizedHeaders.indexOf(matched);
        mapping[key] = headers[realIndex]; // real column name
      } else {
        mapping[key] = ""; // left blank → invalid detection
      }
    }
  
    return mapping;
  }
  