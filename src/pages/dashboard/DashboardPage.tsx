import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, ShieldCheck, DollarSign } from 'lucide-react';

const summaryData = [
  { label: 'Total Orders', value: '12,458', change: '+12.5%', trend: 'up', icon: ShoppingCart, color: 'text-blue-400' },
  { label: 'Verified Orders', value: '11,234', change: '+8.2%', trend: 'up', icon: ShieldCheck, color: 'text-green-400' },
  { label: 'Fraud Detected', value: '1,224', change: '-5.3%', trend: 'down', icon: TrendingUp, color: 'text-red-400' },
  { label: 'Revenue', value: '$2.4M', change: '+15.8%', trend: 'up', icon: DollarSign, color: 'text-purple-400' },
];

const fraudRateData = [
  { month: 'Jan', rate: 12.5 },
  { month: 'Feb', rate: 11.8 },
  { month: 'Mar', rate: 10.2 },
  { month: 'Apr', rate: 9.5 },
  { month: 'May', rate: 8.9 },
  { month: 'Jun', rate: 9.2 },
  { month: 'Jul', rate: 8.5 },
];

const verificationActivityData = [
  { day: 'Mon', verified: 450, flagged: 45 },
  { day: 'Tue', verified: 520, flagged: 38 },
  { day: 'Wed', verified: 480, flagged: 52 },
  { day: 'Thu', verified: 610, flagged: 42 },
  { day: 'Fri', verified: 580, flagged: 48 },
  { day: 'Sat', verified: 420, flagged: 35 },
  { day: 'Sun', verified: 390, flagged: 32 },
];

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Dashboard</h1>
        <p className="text-[#E5E7EB]/70 text-lg">Welcome back! Here's your overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3 rounded-lg bg-white/5 ${item.color}`}>
                    <Icon size={24} />
                  </div>
                  <span className={`text-sm font-medium ${
                    item.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {item.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-[#E5E7EB] mb-2">{item.value}</h3>
                <p className="text-sm text-[#E5E7EB]/70">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fraud Rate Trend</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-2">Monthly fraud detection rate</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fraudRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                <XAxis dataKey="month" stroke="#E5E7EB" />
                <YAxis stroke="#E5E7EB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12163A',
                    border: '1px solid #1E223D',
                    borderRadius: '8px',
                    color: '#E5E7EB',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Fraud Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Activity</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-2">Daily verification statistics</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={verificationActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E223D" />
                <XAxis dataKey="day" stroke="#E5E7EB" />
                <YAxis stroke="#E5E7EB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12163A',
                    border: '1px solid #1E223D',
                    borderRadius: '8px',
                    color: '#E5E7EB',
                  }}
                />
                <Legend />
                <Bar dataKey="verified" fill="#6366F1" name="Verified" />
                <Bar dataKey="flagged" fill="#EF4444" name="Flagged" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

