import React from 'react';
import { Shield, BarChart3, AlertTriangle, TrendingUp, Plug, Bell } from 'lucide-react';

export const Solutions: React.FC = () => {
  const features = [
    {
      title: 'Order Verification',
      description: 'Automatically verify customer information and order legitimacy before processing',
      icon: Shield,
      gradient: 'from-[#6366F1] via-[#7C3AED] to-[#8B5CF6]',
    },
    {
      title: 'Risk Scoring',
      description: 'AI-powered risk assessment with real-time scoring and recommendations',
      icon: BarChart3,
      gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#6366F1]',
    },
    {
      title: 'Fraud Detection',
      description: 'Advanced pattern recognition to identify suspicious orders and prevent losses',
      icon: AlertTriangle,
      gradient: 'from-[#6366F1] via-[#7C3AED] to-[#8B5CF6]',
    },
    {
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights and reporting to track performance and trends',
      icon: TrendingUp,
      gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#6366F1]',
    },
    {
      title: 'API Integration',
      description: 'Seamless integration with your existing e-commerce and logistics systems',
      icon: Plug,
      gradient: 'from-[#6366F1] via-[#7C3AED] to-[#8B5CF6]',
    },
    {
      title: 'Real-Time Alerts',
      description: 'Instant notifications for high-risk orders and potential fraud attempts',
      icon: Bell,
      gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#6366F1]',
    },
  ];

  return (
    <section 
      id="solutions" 
      className="pt-16 pb-20 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 relative scroll-mt-24"
      style={{
        background: 'linear-gradient(to bottom right, #0B0F28 0%, #232a6b 30%, #3184b1 80%, #4B3087 100%)',
      }}
    >
      {/* Soft overlay at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F28]/40 via-transparent to-transparent z-0 pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="gradient-text">Solutions</span>
          </h2>
          <p className="text-xl lg:text-2xl text-[#E5E7EB]/70 max-w-3xl mx-auto leading-relaxed">
            Everything you need to protect your COD business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass-card p-6 lg:p-8 hover:translate-y-[-4px] hover:scale-[1.02] group"
              >
                <div className={`p-3 rounded-xl bg-gradient-to-tr ${feature.gradient} w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-[#E5E7EB] mb-3 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm lg:text-base text-[#E5E7EB]/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

