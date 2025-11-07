import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { OrderVerificationModal } from '../components/OrderVerificationModal';

export const Dashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = [
    { label: 'Total Orders', value: '1,234', change: '+12%', trend: 'up' },
    { label: 'Verified', value: '1,089', change: '+8%', trend: 'up' },
    { label: 'Flagged', value: '145', change: '-5%', trend: 'down' },
    { label: 'Success Rate', value: '94.2%', change: '+2.1%', trend: 'up' },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'Nguyen Van A', amount: '2,500,000', risk: 72, status: 'High' },
    { id: 'ORD-002', customer: 'Tran Thi B', amount: '1,800,000', risk: 35, status: 'Low' },
    { id: 'ORD-003', customer: 'Le Van C', amount: '3,200,000', risk: 58, status: 'Medium' },
    { id: 'ORD-004', customer: 'Pham Thi D', amount: '950,000', risk: 25, status: 'Low' },
    { id: 'ORD-005', customer: 'Hoang Van E', amount: '4,500,000', risk: 85, status: 'High' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F28] via-[#12163A] to-[#181C3B] px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-white/70">Overview of your COD operations</p>
          </div>
          <Link to="/analytics">
            <Button variant="outline">View Analytics</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <div>
                <p className="text-white/70 text-sm mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change} from last month
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Orders</h2>
            <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
              Verify Order
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-sm text-white">{order.id}</td>
                    <td className="px-4 py-4 text-sm text-white">{order.customer}</td>
                    <td className="px-4 py-4 text-sm text-white">{order.amount} VND</td>
                    <td className="px-4 py-4 text-sm text-white">{order.risk}/100</td>
                    <td className="px-4 py-4">
                      <Badge variant={order.status === 'High' ? 'danger' : order.status === 'Medium' ? 'warning' : 'success'}>
                        {order.status} Risk
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <OrderVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

