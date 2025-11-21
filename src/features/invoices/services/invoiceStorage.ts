// src/features/invoices/invoiceStorage.ts
import { supabase } from '../../../lib/supabaseClient';
import { generateInvoicePdf } from './invoicePdf';
import type { Invoice } from '../../../types/supabase';
import type { Order } from '../../../types/supabase';

/**
 * Ensure invoice PDF exists.
 * - If pdf_url exists AND file still exists → return pdf_url
 * - If pdf_url exists BUT file missing → regenerate + reupload
 * - If pdf_url missing → generate + upload
 */
export async function ensureInvoicePdfStored(
  invoice: Invoice,
  order: Order,
  sellerProfile: {
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
  }
): Promise<string | null> {
  // Browser check
  if (typeof window === 'undefined') {
    console.warn('ensureInvoicePdfStored: Not in browser environment');
    return null;
  }

  // -----------------------------------------
  // 1) Nếu đã có pdf_url → kiểm tra file có tồn tại không
  // -----------------------------------------
  if (invoice.pdf_url) {
    try {
      const headResp = await fetch(invoice.pdf_url, { method: 'HEAD' });

      if (headResp.ok) {
        // File vẫn còn trong Storage → dùng luôn
        return invoice.pdf_url;
      } else {
        console.warn('PDF URL exists but file no longer in storage → regenerating.');
      }
    } catch {
      console.warn('PDF URL exists but not accessible → regenerating.');
    }
  }

  // -----------------------------------------
  // 2) Nếu không có pdf_url hoặc file bị xoá → tạo PDF mới
  // -----------------------------------------
  try {
    const pdfBlob = await generateInvoicePdf(invoice, order, sellerProfile);

    const userId = invoice.user_id || order.user_id;
    if (!userId) {
      console.error('Missing user_id for invoice storage');
      return null;
    }

    const invoiceCode =
      invoice.invoice_code || `invoice-${invoice.id.slice(0, 8)}`;

    const fileName = `${invoiceCode}.pdf`;
    const storagePath = `${userId}/${order.id}/${fileName}`;

    // Upload PDF (overwrite enabled)
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error('Upload error', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      console.error('Failed to obtain public URL');
      return null;
    }

    // Update DB
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('DB update error', updateError);
    }

    return publicUrl;
  } catch (err) {
    console.error('ensureInvoicePdfStored: Unexpected error', err);
    return null;
  }
}
