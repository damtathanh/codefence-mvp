// src/features/invoices/invoiceTypes.ts

export const INVOICE_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  CANCELLED: "Cancelled",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

