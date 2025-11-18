// src/utils/invoicePdf.ts
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { supabase } from "../lib/supabaseClient";

/**
 * Generate a premium-style invoice PDF for end customers.
 * - Header: Logo + title
 * - Company info: from users_profile (seller)
 * - Order detail: subtotal, discount, shipping, total
 */
export async function generateInvoicePdf(
  invoice: any,
  order: any
): Promise<Blob> {
  // --------- 1. Fetch seller profile (users_profile) ----------
  const userId = invoice.user_id || order.user_id;
  let companyName = "";
  let companyEmail = "";
  let companyPhone = "";
  let companyWebsite = "";
  let companyAddress = "";

  if (userId) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("company_name, email, phone, website, address")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      companyName = profile.company_name || "";
      companyEmail = profile.email || "";
      companyPhone = profile.phone || "";
      companyWebsite = (profile as any).website || "";
      companyAddress = (profile as any).address || "";
    }
  }

  // Fallback nếu chưa có cấu hình
  if (!companyName) companyName = "Cửa hàng của bạn";
  if (!companyEmail) companyEmail = "contact@example.com";
  if (!companyPhone) companyPhone = "";
  if (!companyWebsite) companyWebsite = "";

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

  // --------- 3. HEADER: only logo + title ----------
  const headerHeight = 110;

  page.drawRectangle({
    x: 0,
    y: 842 - headerHeight,
    width,
    height: headerHeight,
    color: primaryNavy,
  });

  // Logo
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

  // Title centered
  const title = "HÓA ĐƠN THANH TOÁN";
  const titleSize = 22;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  const titleX = (width - titleWidth) / 2;
  const titleY = 842 - headerHeight / 2 + 6;

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

  // tagline (mặc định theo yêu cầu)
  drawText("Nền tảng quản lý đơn hàng thông minh", {
    size: 11,
    color: rgb(0.2, 0.2, 0.26),
  });

  if (companyWebsite) {
    drawText(`Website: ${companyWebsite}`, { size: 11 });
  }

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
  drawText(`Trạng thái: ${invoice.status ?? "Paid"}`);
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

  // Subtotal (giá trị đơn hàng)
  const subtotal =
    invoice.subtotal ??
    order.subtotal ??
    invoice.amount ??
    order.amount ??
    0;

  drawText(`Giá trị đơn hàng: ${formatVnd(subtotal)} VND`);

  // Discount (if any)
  const discount =
    invoice.discount_amount ?? order.discount_amount ?? 0;

  if (Number(discount) > 0) {
    drawText(`Chiết khấu: -${formatVnd(discount)} VND`);
  }

  // Shipping (if any)
  const shipping =
    invoice.shipping_fee ?? order.shipping_fee ?? 0;

  if (Number(shipping) > 0) {
    drawText(`Phí vận chuyển: ${formatVnd(shipping)} VND`);
  }

  // --------- 8. TỔNG THANH TOÁN – separate block below ----------
  y -= 10;

  const totalBoxWidth = 300;
  const totalBoxHeight = 80;
  const totalBoxX = width - margin - totalBoxWidth;
  const totalBoxY = y - totalBoxHeight + 40;

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
    invoice.amount != null ? invoice.amount : subtotal - discount + shipping;

  page.drawText(`${formatVnd(totalAmount)} VND`, {
    x: totalBoxX + 18,
    y: totalBoxY + totalBoxHeight - 48,
    size: 18,
    font: fontBold,
    color: primaryNavy,
  });

  y = totalBoxY - 30;

  // --------- 9. FOOTER (thank you from shop) ----------
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

  const contactLineParts = [];
  if (companyPhone) contactLineParts.push(`SĐT: ${companyPhone}`);
  if (companyEmail) contactLineParts.push(`Email: ${companyEmail}`);
  if (companyWebsite) contactLineParts.push(`Website: ${companyWebsite}`);

  const contactLine = contactLineParts.join(" | ");

  if (contactLine) {
    page.drawText(`Mọi thắc mắc vui lòng liên hệ: ${contactLine}`, {
      x: margin,
      y: 36,
      size: 10,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.3),
    });
  }

  // --------- 10. Export PDF (no TS error) ----------
  const pdfBytes = await pdfDoc.save();
  const safeBytes = Uint8Array.from(pdfBytes);

  return new Blob([safeBytes], { type: "application/pdf" });
}
