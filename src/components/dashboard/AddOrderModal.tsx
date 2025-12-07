import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

import { useSupabaseTable } from "../../hooks/useSupabaseTable";
import type { Product, Order } from "../../types/supabase";
import { ManualOrderForm } from "./ManualOrderForm";
import { useOrders } from "../../hooks/useOrders";
import { Button } from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { logUserAction } from "../../utils/logUserAction";
import { useAuth } from "../../features/auth";

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingOrder?: Order | null;
  openAddProductModal?: (options?: {
    initialName?: string;
    onSuccess?: () => void | Promise<void>;
  }) => void;
  refetchProducts?: () => Promise<void>;
}

interface ParseResult {
  validOrders: any[];
  invalidOrders: any[];
  warnings: string[];
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOrder = null,
}) => {
  const { user } = useAuth();
  const isEditMode = !!editingOrder;
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");

  const { data: allProducts = [] } = useSupabaseTable<Product>({
    tableName: "products",
  });
  const products = allProducts.filter((p) => p.status === "active");

  // Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const { parseFile, insertOrders } = useOrders();

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Main upload handler
  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setUploadStatus("error");
      setMessage("Only Excel (.xlsx, .xls) or CSV files are supported.");
      return;
    }

    try {
      setUploadStatus("processing");
      setLocalLoading(true);
      setMessage("Reading file...");

      // 1. Parse Excel/CSV
      const result = (await parseFile(file)) as ParseResult;
      const parsedOrders = result.validOrders || [];

      if (parsedOrders.length === 0)
        throw new Error("No valid rows found in the file.");

      setMessage(`Uploading ${parsedOrders.length} orders...`);

      // 2. Insert orders
      const insertResult = await insertOrders(parsedOrders);

      const successCount = insertResult.success ?? 0;
      const failedCount = insertResult.failed ?? 0;

      // 3. Extract inserted Order IDs
      const insertedOrderIds =
        insertResult.insertedOrders?.map((o: any) => o.id) || [];

      // 4. Nếu có đơn được insert -> fetch lại và chỉ log user action
      //    Logic tạo / update Invoice đã được Postgres trigger xử lý.
      if (insertedOrderIds.length > 0) {
        const { data: newOrders, error } = await supabase
          .from("orders")
          .select("*")
          .in("id", insertedOrderIds);

        if (!error && newOrders && user) {
          // Log import action cho từng đơn
          const logPromises = newOrders.map((order) =>
            logUserAction({
              userId: user.id,
              action: "Import Orders",
              status: "success",
              orderId: order.order_id ?? "",
              details: {
                source: "excel_import",
                file_name: file.name,
                amount: order.amount?.toString() || "0",
                product: order.product,
              },
            })
          );

          await Promise.all(logPromises);
        }
      }

      // 5. Success feedback
      setUploadStatus("success");
      setMessage(
        `Success! Inserted ${successCount} orders. Failed ${failedCount} orders.`
      );

      setTimeout(() => {
        setUploadStatus("idle");
        setMessage(null);
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setUploadStatus("error");
      setMessage(err.message || "Error processing file");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
    resetFileInput();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  // Modal behaviors
  useEffect(() => {
    if (isOpen && editingOrder) setActiveTab("manual");
  }, [isOpen, editingOrder]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-modal-title"
    >
      <div
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] shadow-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E223D]">
          <h3 className="text-xl font-semibold text-[#E5E7EB]">
            {isEditMode ? "Edit Order" : "Add Order"}
          </h3>
          <button
            onClick={onClose}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] p-1 rounded hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {!isEditMode && (
          <div className="flex gap-2 px-6 pt-4 border-b border-[#1E223D]">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 text-sm ${activeTab === "manual"
                ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]"
                : "text-[#E5E7EB]/70 hover:text-[#E5E7EB]"
                }`}
            >
              <FileText size={16} className="inline mr-2" />
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 text-sm ${activeTab === "upload"
                ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]"
                : "text-[#E5E7EB]/70 hover:text-[#E5E7EB]"
                }`}
            >
              <Upload size={16} className="inline mr-2" />
              Upload File
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeTab === "manual" ? (
            <ManualOrderForm
              editingOrder={editingOrder}
              onClose={onClose}
              onSuccess={onSuccess}
              products={products}
            />
          ) : (
            <div className="space-y-5">
              {/* Upload Zone */}
              <div
                className={`
                  border-2 border-dashed border-[#8B5CF6]/30 rounded-xl p-8 text-center
                  bg-gradient-to-br from-[#8B5CF6]/5 to-transparent
                  ${isDragOver ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : ""}
                  ${localLoading ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center mb-4">
                    {localLoading ? (
                      <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
                    ) : (
                      <Upload size={28} className="text-[#8B5CF6]" />
                    )}
                  </div>

                  <p className="text-[#E5E7EB] font-medium mb-1 text-lg">
                    {localLoading ? "Processing..." : "Upload file order (Excel / CSV)"}
                  </p>
                  <p className="text-sm text-[#E5E7EB]/60 mb-6">
                    Supported: .xlsx, .xls, .csv (Max 5MB)
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {!localLoading && (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-xl shadow-md flex items-center gap-2"
                    >
                      <Upload size={18} />
                      Upload from your computer
                    </Button>
                  )}
                </div>
              </div>

              {/* 📄 Template Requirements – 2 cột */}
              <div className="rounded-xl border border-[#1E223D] bg-white/5 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="mb-2 font-semibold text-[#E5E7EB]">
                      Order Template Format
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-[#E5E7EB]/80">
                      <li>Order ID</li>
                      <li>Customer Name</li>
                      <li>Phone Number</li>
                      <li>Gender</li>
                      <li>Birthyear</li>
                      <li>Address Detail</li>
                      <li>Ward</li>
                      <li>District</li>
                      <li>Province</li>
                    </ul>
                  </div>

                  {/* RIGHT: Product template */}
                  <div>
                    <h4 className="mb-2 font-semibold text-[#E5E7EB]">
                      Order Template Format
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-[#E5E7EB]/80">
                      <li>Product</li>
                      <li>Amount (VND)</li>
                      <li>Payment Method</li>
                      <li>Discount</li>
                      <li>Shipping Fee</li>
                      <li>Channel</li>
                      <li>Source</li>
                      <li>Order Date</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg text-sm border ${uploadStatus === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-200"
                    : uploadStatus === "success"
                      ? "bg-green-500/10 border-green-500/20 text-green-200"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-200"
                    }`}
                >
                  {uploadStatus === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  {uploadStatus === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {uploadStatus === "processing" && (
                    <FileSpreadsheet className="w-5 h-5 text-blue-400 animate-pulse" />
                  )}

                  <div className="flex-1">{message}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
