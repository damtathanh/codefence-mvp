import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const Analytics: React.FC = () => {
  const chartData = [
    { month: 'Jan', orders: 850, verified: 780, flagged: 70 },
    { month: 'Feb', orders: 920, verified: 850, flagged: 70 },
    { month: 'Mar', orders: 1100, verified: 1010, flagged: 90 },
    { month: 'Apr', orders: 1050, verified: 980, flagged: 70 },
    { month: 'May', orders: 1234, verified: 1145, flagged: 89 },
  ];

  const riskDistribution = [
    { range: '0-30', count: 856, percentage: 69.4 },
    { range: '31-60', count: 233, percentage: 18.9 },
    { range: '61-100', count: 145, percentage: 11.7 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F28] via-[#12163A] to-[#181C3B] px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-white/70">Detailed insights and performance metrics</p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Performance Chart */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Order Trends</h2>
          <div className="space-y-4">
            {chartData.map((data, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-16 text-sm text-white/70">{data.month}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6]"
                        style={{ width: `${(data.orders / 1300) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/70 w-20 text-right">{data.orders}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex-1 flex space-x-1">
                      <div
                        className="h-2 bg-green-500/50 rounded"
                        style={{ width: `${(data.verified / data.orders) * 100}%` }}
                      />
                      <div
                        className="h-2 bg-red-500/50 rounded"
                        style={{ width: `${(data.flagged / data.orders) * 100}%` }}
                      />
                    </div>
                    <span className="text-white/50 w-20 text-right">
                      {data.verified}V / {data.flagged}F
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Distribution */}
          <Card>
            <h2 className="text-xl font-semibold text-white mb-6">Risk Score Distribution</h2>
            <div className="space-y-4">
              {riskDistribution.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">{item.range} Risk</span>
                    <span className="text-white font-semibold">{item.count} orders ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Key Metrics */}
          <Card>
            <h2 className="text-xl font-semibold text-white mb-6">Key Metrics</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70">Verification Rate</span>
                  <Badge variant="success">94.2%</Badge>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '94.2%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70">Average Risk Score</span>
                  <Badge variant="info">42.5</Badge>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] rounded-full" style={{ width: '42.5%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70">Flagged Orders</span>
                  <Badge variant="warning">11.7%</Badge>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: '11.7%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70">Success Rate</span>
                  <Badge variant="success">96.8%</Badge>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '96.8%' }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

