import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fraudTrendData = [
  { month: 'Jan', fraud: 152, verified: 1240 },
  { month: 'Feb', fraud: 138, verified: 1350 },
  { month: 'Mar', fraud: 125, verified: 1420 },
  { month: 'Apr', fraud: 118, verified: 1580 },
  { month: 'May', fraud: 108, verified: 1650 },
  { month: 'Jun', fraud: 112, verified: 1720 },
];

const salesGrowthData = [
  { month: 'Jan', sales: 45000 },
  { month: 'Feb', sales: 52000 },
  { month: 'Mar', sales: 48000 },
  { month: 'Apr', sales: 61000 },
  { month: 'May', sales: 68000 },
  { month: 'Jun', sales: 75000 },
];

const topRegionsData = [
  { name: 'Ho Chi Minh', value: 35, color: '#8B5CF6' },
  { name: 'Hanoi', value: 28, color: '#6366F1' },
  { name: 'Da Nang', value: 15, color: '#8B5CF6' },
  { name: 'Can Tho', value: 12, color: '#6366F1' },
  { name: 'Others', value: 10, color: '#8B5CF6' },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Rate Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Fraud Rate Trends</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Monthly fraud vs verified orders</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fraudTrendData}>
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

        {/* Sales Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Growth</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Monthly revenue trends</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesGrowthData}>
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

        {/* Top Regions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Regions</CardTitle>
            <p className="text-sm text-[#E5E7EB]/70 mt-1">Order distribution by region</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topRegionsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topRegionsData.map((entry, index) => (
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
      </div>
    </div>
  );
};

