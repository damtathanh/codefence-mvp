import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface OrderVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export const OrderVerificationModal: React.FC<OrderVerificationModalProps> = ({
  isOpen,
  onClose,
  orderId = 'ORD-2024-001234',
}) => {
  if (!isOpen) return null;

  const orderData = {
    orderId,
    customerName: 'Nguyen Van A',
    phone: '+84 123 456 789',
    address: '123 Main Street, Ho Chi Minh City',
    amount: '2,500,000 VND',
    items: ['Product A x2', 'Product B x1'],
    riskScore: 72,
    status: 'High Risk',
  };

  const handleVerify = () => {
    alert('Order verified successfully!');
    onClose();
  };

  const handleFlag = () => {
    alert('Order flagged for review.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Order Verification</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/70 text-sm mb-1">Order ID</p>
              <p className="text-white font-semibold">{orderData.orderId}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm mb-1">Risk Score</p>
              <div className="flex items-center space-x-2">
                <p className="text-white font-semibold">{orderData.riskScore}/100</p>
                <Badge variant={orderData.riskScore > 70 ? 'danger' : orderData.riskScore > 40 ? 'warning' : 'success'}>
                  {orderData.status}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Customer Name</p>
            <p className="text-white font-semibold">{orderData.customerName}</p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Phone Number</p>
            <p className="text-white font-semibold">{orderData.phone}</p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Delivery Address</p>
            <p className="text-white font-semibold">{orderData.address}</p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Order Amount</p>
            <p className="text-white font-semibold text-xl">{orderData.amount}</p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-2">Items</p>
            <ul className="space-y-1">
              {orderData.items.map((item, index) => (
                <li key={index} className="text-white">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleVerify}
              className="flex-1"
            >
              Verify Order
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleFlag}
              className="flex-1"
            >
              Flag for Review
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

