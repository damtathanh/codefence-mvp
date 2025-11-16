import React, { useEffect } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

export type RejectMode = 'VERIFICATION_REQUIRED' | 'ORDER_REJECTED';

interface RejectOrderModalProps {
  isOpen: boolean;
  mode: RejectMode;
  reason: string;
  onModeChange: (mode: RejectMode) => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  mode,
  reason,
  onModeChange,
  onReasonChange,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onCancel]);

  // Handle click outside to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const isConfirmDisabled = !reason.trim() || loading;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div
        className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="reject-modal-title" className="text-lg font-semibold text-[#E5E7EB]">
            Handle this order
          </h3>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-[#E5E7EB]/70 hover:text-[#E5E7EB] transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#E5E7EB] mb-3">
            Action Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="radio"
                name="rejectMode"
                value="VERIFICATION_REQUIRED"
                checked={mode === 'VERIFICATION_REQUIRED'}
                onChange={() => onModeChange('VERIFICATION_REQUIRED')}
                disabled={loading}
                className="w-4 h-4 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm text-[#E5E7EB]">Verification Required</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="radio"
                name="rejectMode"
                value="ORDER_REJECTED"
                checked={mode === 'ORDER_REJECTED'}
                onChange={() => onModeChange('ORDER_REJECTED')}
                disabled={loading}
                className="w-4 h-4 text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm text-[#E5E7EB]">Order Rejected</span>
            </label>
          </div>
        </div>

        {/* Reason Textarea */}
        <div className="mb-6">
          <label htmlFor="reason-textarea" className="block text-sm font-medium text-[#E5E7EB] mb-2">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            id="reason-textarea"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={loading}
            placeholder="Enter the reason for verification or rejection..."
            rows={4}
            className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F28] disabled:opacity-50 disabled:cursor-not-allowed bg-[#8B5CF6] hover:bg-[#7C3AED] focus:ring-[#8B5CF6]"
          >
            {loading ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectOrderModal;

