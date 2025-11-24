// src/features/invoices/services/invoicePdf.ts
import type { Invoice, Order } from "../../../types/supabase";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Generate a premium-style invoice PDF for end customers.
 * - Header: Logo + title
 * - Company info: from sellerProfile parameter
 * - Order detail: subtotal, discount, shipping, total
 */
export async function generateInvoicePdf(
  invoice: any,
  order: any,
  sellerProfile: {
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
  }
): Promise<Blob> {
  // --------- 1. Extract seller profile info ----------
  const companyName = sellerProfile.company_name || "Cửa hàng của bạn";
  const companyEmail = sellerProfile.email || "contact@example.com";
  const companyPhone = sellerProfile.phone || "";
  const companyWebsite = sellerProfile.website || "";
  const companyAddress = sellerProfile.address || "";

  // --------- 2. Create PDF + fonts + logo ----------
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const [regularBytes, boldBytes, logoBytes] = await Promise.all([
    fetch("/assets/fonts/Roboto-Regular.ttf").then((res) => res.arrayBuffer()),
    fetch("/assets/fonts/Roboto-Bold.ttf").then((res) => res.arrayBuffer()),
    fetch("/assets/logo.png").then((res) => res.arrayBuffer()),
  ]);

  const fontRegular = await pdfDoc.embedFont(regularBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);
  const logo = await pdfDoc.embedPng(logoBytes);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width } = page.getSize();
  const margin = 50;

  const primaryNavy = rgb(0.04, 0.09, 0.23);
  const lightBg = rgb(0.96, 0.98, 1);

  let y = 800;

  // --------- Helpers ----------
  const drawText = (
    value: string,
    opts: {
      x?: number;
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      lineGap?: number;
    } = {}
  ) => {
    const size = opts.size ?? 12;
    const font = opts.bold ? fontBold : fontRegular;
    const color = opts.color ?? rgb(0, 0, 0);
    const x = opts.x ?? margin;
    const lineGap = opts.lineGap ?? 6;

    page.drawText(value ?? "", {
      x,
      y,
      size,
      font,
      color,
    });
    y -= size + lineGap;
  };

  const drawDivider = (gap = 14) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.88, 0.88, 0.9),
    });
    y -= gap;
  };

  const formatVnd = (n: any) => {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN");
  };

  const viStatus = (raw: string | null | undefined) => {
    const s = (raw || "").toLowerCase();
    switch (s) {
      case "paid":
        return "Đã thanh toán";
      case "pending":
        return "Chờ thanh toán";
      case "refunded":
        return "Đã hoàn tiền";
      default:
        return raw || "";
    }
  };

  // --------- 3. HEADER: only logo + centered title ----------
  const headerHeight = 110;

  page.drawRectangle({
    x: 0,
    y: 842 - headerHeight,
    width,
    height: headerHeight,
    color: primaryNavy,
  });

  // Logo (trái)
  const logoWidth = 72;
  const logoHeight = logoWidth * (logo.height / logo.width);
  const logoX = margin;
  const logoY = 842 - headerHeight + (headerHeight - logoHeight) / 2;

  page.drawImage(logo, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });

  // Title căn giữa theo chiều ngang + dọc
  const title = "HÓA ĐƠN THANH TOÁN";
  const titleSize = 22;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);

  const headerCenterY = 842 - headerHeight / 2;
  const titleX = (width - titleWidth) / 2;
  const titleY = headerCenterY - titleSize / 2;

  page.drawText(title, {
    x: titleX,
    y: titleY,
    size: titleSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // --------- 4. BODY: company info (seller) ----------
  y = 842 - headerHeight - 40;

  drawText(companyName, {
    bold: true,
    size: 14,
    color: primaryNavy,
  });

  // Chỉ email / sđt / địa chỉ
  if (companyEmail) {
    drawText(`Email: ${companyEmail}`, { size: 11 });
  }
  if (companyPhone) {
    drawText(`Số điện thoại: ${companyPhone}`, { size: 11 });
  }
  if (companyAddress) {
    drawText(`Địa chỉ: ${companyAddress}`, { size: 11 });
  }

  y -= 4;
  drawDivider();

  // --------- 5. THÔNG TIN HÓA ĐƠN ----------
  drawText("THÔNG TIN HÓA ĐƠN", {
    bold: true,
    size: 12,
    color: primaryNavy,
  });

  const createdDate = new Date(invoice.created_at).toLocaleDateString("vi-VN");
  drawText(`Mã hóa đơn: ${invoice.invoice_code ?? ""}`);
  drawText(`Ngày tạo: ${createdDate}`);
  drawText(`Trạng thái: ${viStatus(invoice.status)}`);
  y -= 6;
  drawDivider();

  // --------- 6. THÔNG TIN KHÁCH HÀNG ----------
  drawText("THÔNG TIN KHÁCH HÀNG", {
    bold: true,
    size: 12,
    color: primaryNavy,
  });

  drawText(`Khách hàng: ${order.customer_name ?? ""}`);
  drawText(`Số điện thoại: ${order.phone ?? ""}`);
  drawText(`Địa chỉ: ${order.address ?? ""}`);
  y -= 6;
  drawDivider();

  // --------- 7. CHI TIẾT ĐƠN HÀNG ----------
  drawText("CHI TIẾT ĐƠN HÀNG", {
    bold: true,
    size: 12,
    color: primaryNavy,
  });

  drawText(`Sản phẩm: ${order.product ?? ""}`);

  const subtotal =
    order.subtotal ??
    order.amount ??
    invoice.subtotal ??
    invoice.amount ??
    0;

  drawText(`Giá trị đơn hàng: ${formatVnd(subtotal)} VND`);

  const discount =
    order.discount_amount ??
    invoice.discount_amount ??
    0;

  if (discount > 0) {
    drawText(`Giảm giá: -${formatVnd(discount)} VND`);
  }

  const shipping =
    order.shipping_fee ??
    invoice.shipping_fee ??
    0;

  drawText(`Phí vận chuyển: ${formatVnd(shipping)} VND`);

  // --------- 8. TỔNG THANH TOÁN – block riêng ----------
  const totalBoxWidth = 300;
  const totalBoxHeight = 80;
  const totalBoxX = width - margin - totalBoxWidth;
  const totalBoxY = 180; // cách footer ~110pt

  page.drawRectangle({
    x: totalBoxX,
    y: totalBoxY,
    width: totalBoxWidth,
    height: totalBoxHeight,
    color: lightBg,
    borderColor: primaryNavy,
    borderWidth: 1,
  });

  page.drawText("TỔNG THANH TOÁN", {
    x: totalBoxX + 18,
    y: totalBoxY + totalBoxHeight - 26,
    size: 11,
    font: fontBold,
    color: primaryNavy,
  });

  const totalAmount =
    (order.amount ?? invoice.amount ?? 0) +
    (order.shipping_fee ?? invoice.shipping_fee ?? 0) -
    (order.discount_amount ?? invoice.discount_amount ?? 0);

  page.drawText(`${formatVnd(totalAmount)} VND`, {
    x: totalBoxX + 18,
    y: totalBoxY + totalBoxHeight - 48,
    size: 18,
    font: fontBold,
    color: primaryNavy,
  });

  // --------- 9. FOOTER ----------
  page.drawLine({
    start: { x: margin, y: 70 },
    end: { x: width - margin, y: 70 },
    thickness: 0.5,
    color: rgb(0.88, 0.88, 0.9),
  });

  const thankName = companyName || "cửa hàng chúng tôi";

  page.drawText(`Cảm ơn bạn đã mua hàng tại ${thankName}!`, {
    x: margin,
    y: 50,
    size: 11,
    font: fontRegular,
    color: primaryNavy,
  });

  const contactParts: string[] = [];
  if (companyPhone) contactParts.push(`SĐT: ${companyPhone}`);
  if (companyEmail) contactParts.push(`Email: ${companyEmail}`);
  if (companyWebsite) contactParts.push(`Website: ${companyWebsite}`);

  const contactLine = contactParts.join(" | ");

  if (contactLine) {
    page.drawText(`Mọi thắc mắc vui lòng liên hệ: ${contactLine}`, {
      x: margin,
      y: 36,
      size: 10,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.3),
    });
  }

  // --------- 10. Export PDF ----------
  const pdfBytes = await pdfDoc.save();
  const safeBytes = Uint8Array.from(pdfBytes);

  return new Blob([safeBytes], { type: "application/pdf" });
}
