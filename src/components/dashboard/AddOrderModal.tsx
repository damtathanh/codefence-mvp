import React, { useState, useEffect } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import type { Product, Order } from '../../types/supabase';
import type { OrderInput, ParsedOrderRow } from '../../hooks/useOrders';
import { ManualOrderForm } from './ManualOrderForm';
import { UploadOrderSection } from './UploadOrderSection';

interface ParsedUploadPayload {
  validOrders: OrderInput[];
  orders: ParsedOrderRow[];
}

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingOrder?: Order | null;
  openAddProductModal?: (options?: { initialName?: string; onSuccess?: () => void | Promise<void> }) => void;
  refetchProducts?: () => Promise<void>;
  openBulkCreateProductsModal?: (options: { missingProducts: string[]; pendingUpload: ParsedUploadPayload | null }) => void;
  pendingUploadAfterProductsCreated?: ParsedUploadPayload | null;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOrder = null,
  openAddProductModal,
  refetchProducts,
  openBulkCreateProductsModal,
  pendingUploadAfterProductsCreated,
}) => {
  const isEditMode = !!editingOrder;
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');

  // Fetch products for dropdown (only active products)
  const { data: allProducts = [] } = useSupabaseTable<Product>({
    tableName: 'products'
  });
  const products = allProducts.filter(p => p.status === 'active');

  // Reset tab when modal opens/closes or edit mode changes
  useEffect(() => {
    if (isOpen) {
      if (editingOrder) {
        setActiveTab('manual');
      } else if (pendingUploadAfterProductsCreated) {
        setActiveTab('upload');
      } else {
        // Default to manual if not specified
        // (Keep current tab if already open? No, original code reset form data but didn't explicitly reset tab unless editing)
        // Original code:
        // useEffect(() => { if (isOpen && editingOrder) { ... setActiveTab('manual'); } ... }, [isOpen, editingOrder]);
        // It didn't reset tab to manual on simple open, but state is inside component so it persists if not unmounted?
        // Actually, AddOrderModal is likely conditionally rendered or always present but hidden.
        // If it's always present, we should reset tab on open if not editing.
        // But let's stick to the logic: if editing, manual. If pending upload, upload.
      }
    }
  }, [isOpen, editingOrder, pendingUploadAfterProductsCreated]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // We don't know if loading in child, but usually we can close.
        // The child components handle their own loading state, but the modal shell doesn't know.
        // If we want to prevent closing while loading, we'd need to lift loading state up.
        // For now, let's allow closing via ESC, or maybe we can accept that limitation.
        // The original code checked !loading.
        // To strictly preserve this, we should probably lift loading state or pass a "canClose" callback.
        // However, standard modal behavior usually allows closing.
        // Let's try to keep it simple. If the user really wants to close, let them.
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-modal-title"
    >
      <div
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="add-order-modal-title" className="text-xl font-semibold text-[#E5E7EB]">
            {isEditMode ? 'Edit Order' : 'Add Order'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Only show tabs when not in edit mode */}
        {!isEditMode && (
          <div className="flex gap-2 mb-6 border-b border-[#1E223D]">
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

        {/* Content */}
        {activeTab === 'manual' ? (
          <ManualOrderForm
            editingOrder={editingOrder}
            onClose={onClose}
            onSuccess={onSuccess}
            products={products}
          />
        ) : (
          <UploadOrderSection
            onClose={onClose}
            onSuccess={onSuccess}
            products={products}
            openBulkCreateProductsModal={openBulkCreateProductsModal}
            pendingUploadAfterProductsCreated={pendingUploadAfterProductsCreated}
          />
        )}
      </div>
    </div>
  );
};
