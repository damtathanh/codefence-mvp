import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Package, TrendingUp, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still redirect even if logout fails
      navigate('/');
    }
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: 'linear-gradient(to bottom right, #0B0F28 0%, #232a6b 20%, #3184b1 70%, #4B3087 100%)',
      }}
    >
      {/* Fixed Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Website</span>
            </button>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">Admin Dashboard</h1>
            <p className="text-white/80 text-lg">System analytics and administration</p>
          </div>

          {/* Stats Grid - 2x2 on mobile, 4x1 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Total Users Card */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/25 transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-500/30 backdrop-blur-sm">
                  <Users className="w-6 h-6 text-blue-300" />
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">1,234</p>
              </div>
            </div>

            {/* Total Orders Card */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/25 transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-500/30 backdrop-blur-sm">
                  <Package className="w-6 h-6 text-green-300" />
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white">5,678</p>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/25 transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-500/30 backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6 text-purple-300" />
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Revenue</p>
                <p className="text-3xl font-bold text-white">$123.4K</p>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/25 transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-yellow-500/30 backdrop-blur-sm">
                  <BarChart3 className="w-6 h-6 text-yellow-300" />
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Analytics</p>
                <p className="text-3xl font-bold text-white">98.5%</p>
              </div>
            </div>
          </div>

          {/* System Analytics Section */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 lg:p-8 border border-white/30 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-300" />
                System Analytics
              </h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-white/80 text-base mb-4">
                This section will display comprehensive system-wide analytics including:
              </p>
              
              <ul className="space-y-3 text-white/70">
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 mt-1">•</span>
                  <span>User activity and engagement metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 mt-1">•</span>
                  <span>Platform-wide order statistics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 mt-1">•</span>
                  <span>Revenue and financial analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 mt-1">•</span>
                  <span>System performance and health monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 mt-1">•</span>
                  <span>Risk assessment trends across all merchants</span>
                </li>
              </ul>
            </div>

            {/* Footer Note */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-white/50 text-sm italic text-center">
                Admin analytics dashboard - Coming soon with detailed charts and insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

