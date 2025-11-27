import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Loader2, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import type { Product, Order } from '../../types/supabase';
import { ManualOrderForm } from './ManualOrderForm';
import { useOrders } from '../../hooks/useOrders';
import { Button } from '../ui/Button';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingOrder?: Order | null;
  openAddProductModal?: (
    options?: { initialName?: string; onSuccess?: () => void | Promise<void> }
  ) => void;
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
  const isEditMode = !!editingOrder;
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');

  // Fetch products for dropdown (only active products)
  const { data: allProducts = [] } = useSupabaseTable<Product>({
    tableName: 'products',
  });
  const products = allProducts.filter((p) => p.status === 'active');

  // --- Upload Logic ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const { parseFile, insertOrders } = useOrders();
  const [localLoading, setLocalLoading] = useState(false);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setUploadStatus('error');
      setMessage("Only support Excel (.xlsx, .xls) or CSV files");
      return;
    }

    try {
      setUploadStatus('processing');
      setLocalLoading(true);
      setMessage("Reading File...");

      // 1. Parse file
      const result = await parseFile(file) as unknown as ParseResult;
      const parsedOrders = result.validOrders || [];

      if (!parsedOrders || parsedOrders.length === 0) {
        throw new Error("File is empty or cannot read valid data");
      }

      setMessage(`Pushing ${parsedOrders.length} orders to Server...`);

      // 2. Insert orders
      const insertResult = await insertOrders(parsedOrders);

      const successCount = insertResult.success || 0;
      const failedCount = insertResult.failed || 0;

      if (successCount > 0) {
        setUploadStatus('success');
        setMessage(`Success! Inserted ${successCount} orders. Failed ${failedCount} orders.`);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          setUploadStatus('idle');
          setMessage(null);
        }, 1500);
      } else {
        throw new Error((insertResult.errors && insertResult.errors[0]) || "Unknown error");
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      setUploadStatus('error');
      setMessage(err.message || "Error processing file");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    resetFileInput();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };
  // --- End Upload Logic ---

  // Reset tab when modal opens/closes or edit mode changes
  useEffect(() => {
    if (isOpen && editingOrder) {
      setActiveTab('manual');
    }
  }, [isOpen, editingOrder]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Handle click outside to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B]
             rounded-lg border border-[#1E223D]
             shadow-2xl w-full max-w-2xl
             flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E223D]">
          <h3
            id="add-order-modal-title"
            className="text-xl font-semibold text-[#E5E7EB]"
          >
            {isEditMode ? 'Edit Order' : 'Add Order'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors p-1 rounded hover:bg-white/10"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs (chỉ khi không edit) */}
        {!isEditMode && (
          <div className="flex gap-2 px-6 pt-4 border-b border-[#1E223D] flex-shrink-0">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'manual'
                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'
                }`}
            >
              <FileText size={16} className="inline mr-2" />
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload'
                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]'
                : 'text-[#E5E7EB]/70 hover:text-[#E5E7EB]'
                }`}
            >
              <Upload size={16} className="inline mr-2" />
              Upload File
            </button>
          </div>
        )}

        {/* Body: chỉ phần này scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {activeTab === 'manual' ? (
            <ManualOrderForm
              editingOrder={editingOrder}
              onClose={onClose}
              onSuccess={onSuccess}
              products={products}
            />
          ) : (
            <div className="space-y-5">
              {/* Upload Area – clone style từ AddProductModal */}
              <div className="relative">
                <div
                  className={`
            border-2 border-dashed border-[#8B5CF6]/30 rounded-xl p-8 text-center
            bg-gradient-to-br from-[#8B5CF6]/5 to-transparent
            hover:border-[#8B5CF6]/50 transition-all duration-300
            ${isDragOver ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : ""}
            ${localLoading ? "opacity-50 pointer-events-none" : ""}
          `}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/10 flex items-center justify-center mb-4 border border-[#8B5CF6]/30">
                      {localLoading ? (
                        <Loader2 size={28} className="text-[#8B5CF6] animate-spin" />
                      ) : (
                        <Upload size={28} className="text-[#8B5CF6]" />
                      )}
                    </div>

                    <p className="text-[#E5E7EB] font-medium mb-1 text-lg">
                      {localLoading ? "Processing..." : "Upload file order (Excel / CSV)"}
                    </p>
                    <p className="text-sm text-[#E5E7EB]/60 mb-6">
                      Support: .xlsx, .xls, .csv &nbsp; (Max 5MB) – Drag and drop file into this area
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
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#8B5CF6]/20 hover:shadow-[#8B5CF6]/30 flex items-center gap-2"
                      >
                        <Upload size={18} />
                        <span>Upload file from your computer</span>
                      </Button>
                    )}
                  </div>
                </div>
                {/* Expected columns – giống style AddProduct */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-sm text-[#E5E7EB]/80 text-left">
                  <p className="font-semibold mb-2">Expected Excel/CSV columns:</p>

                  {/* 2 cột trên màn hình md trở lên */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Order ID</li>
                      <li>Customer Name</li>
                      <li>Phone Number</li>
                      <li>Gender</li>
                      <li>Birthday</li>
                      <li>Address Detail</li>
                      <li>Ward</li>
                      <li>District</li>
                      <li>Province</li>
                    </ul>

                    <ul className="list-disc list-inside space-y-1">
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

              {/* Message / Status */}
              {message && (
                <div
                  className={`
            flex items-start gap-3 p-4 rounded-lg text-sm border
            ${uploadStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : ''}
            ${uploadStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-200' : ''}
            ${uploadStatus === 'processing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : ''}
          `}
                >
                  {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />}
                  {uploadStatus === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-green-400" />}
                  {uploadStatus === 'processing' && <FileSpreadsheet className="w-5 h-5 shrink-0 animate-pulse text-blue-400" />}

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
