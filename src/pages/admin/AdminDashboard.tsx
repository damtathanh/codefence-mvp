import React from 'react';
import { useLocation } from 'react-router-dom';
import { TrendingUp, ShoppingCart, ShieldCheck, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const dashboardSummary = [
  { label: 'Total Orders', value: '12,458', change: '+12.5%', trend: 'up', icon: ShoppingCart, color: 'text-blue-400' },
  { label: 'Verified Orders', value: '11,234', change: '+8.2%', trend: 'up', icon: ShieldCheck, color: 'text-green-400' },
  { label: 'Fraud Detected', value: '1,224', change: '-5.3%', trend: 'down', icon: TrendingUp, color: 'text-red-400' },
  { label: 'Revenue', value: '$2.4M', change: '+15.8%', trend: 'up', icon: DollarSign, color: 'text-purple-400' },
];

const adminTrendData = [
  { month: 'Jan', rate: 12.5 },
  { month: 'Feb', rate: 11.8 },
  { month: 'Mar', rate: 10.2 },
  { month: 'Apr', rate: 9.5 },
  { month: 'May', rate: 8.9 },
  { month: 'Jun', rate: 9.2 },
];

const adminVerificationData = [
  { day: 'Mon', verified: 450, flagged: 45 },
  { day: 'Tue', verified: 520, flagged: 38 },
  { day: 'Wed', verified: 480, flagged: 52 },
  { day: 'Thu', verified: 610, flagged: 42 },
  { day: 'Fri', verified: 580, flagged: 48 },
  { day: 'Sat', verified: 420, flagged: 35 },
  { day: 'Sun', verified: 390, flagged: 32 },
];

const analyticsTrendData = [
  { month: 'Jan', fraud: 152, verified: 1240 },
  { month: 'Feb', fraud: 138, verified: 1350 },
  { month: 'Mar', fraud: 125, verified: 1420 },
  { month: 'Apr', fraud: 118, verified: 1580 },
  { month: 'May', fraud: 108, verified: 1650 },
  { month: 'Jun', fraud: 112, verified: 1720 },
];

const analyticsSalesData = [
  { month: 'Jan', sales: 45000 },
  { month: 'Feb', sales: 52000 },
  { month: 'Mar', sales: 48000 },
  { month: 'Apr', sales: 61000 },
  { month: 'May', sales: 68000 },
  { month: 'Jun', sales: 75000 },
];

const analyticsRegionsData = [
  { name: 'Ho Chi Minh', value: 35, color: '#8B5CF6' },
  { name: 'Hanoi', value: 28, color: '#6366F1' },
  { name: 'Da Nang', value: 15, color: '#8B5CF6' },
  { name: 'Can Tho', value: 12, color: '#6366F1' },
  { name: 'Others', value: 10, color: '#8B5CF6' },
];

const analyticsKeyMetrics = [
  { label: 'Verification Rate', value: '94.2%', variant: 'success' as const, progress: 94.2 },
  { label: 'Average Risk Score', value: '42.5', variant: 'info' as const, progress: 42.5 },
  { label: 'Flagged Orders', value: '11.7%', variant: 'warning' as const, progress: 11.7 },
  { label: 'Success Rate', value: '96.8%', variant: 'success' as const, progress: 96.8 },
];

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const isAnalytics = location.pathname.includes('/admin/analytics');

  const renderDashboardContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardSummary.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3 rounded-lg bg-white/5 ${item.color}`}>
                    <Icon size={24} />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      item.trend === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fraud Rate Trend</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-2">Monthly fraud detection rate</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adminTrendData}>
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

        <Card>
          <CardHeader>
            <CardTitle>Verification Activity</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-2">Daily verification statistics</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={adminVerificationData}>
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

  const renderAnalyticsContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fraud Rate Trends</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Monthly fraud vs verified orders</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsTrendData}>
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
                <Line type="monotone" dataKey="fraud" stroke="#EF4444" strokeWidth={2} name="Fraud Cases" />
                <Line type="monotone" dataKey="verified" stroke="#10B981" strokeWidth={2} name="Verified Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Growth</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Monthly revenue trends</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsSalesData}>
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
                <Bar dataKey="sales" fill="#6366F1" name="Sales ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Regions</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Order distribution by region</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsRegionsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const percentage = typeof percent === 'number' ? (percent * 100).toFixed(0) : '0';
                    return `${name} ${percentage}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsRegionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12163A',
                    border: '1px solid #1E223D',
                    borderRadius: '8px',
                    color: '#E5E7EB',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {analyticsKeyMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#E5E7EB]/70">{metric.label}</span>
                  <Badge variant={metric.variant}>{metric.value}</Badge>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] rounded-full"
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {isAnalytics ? renderAnalyticsContent() : renderDashboardContent()}
    </div>
  );
};

