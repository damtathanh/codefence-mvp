import React from "react";
import { ShieldCheck, Cpu, LineChart, Handshake } from "lucide-react";

export const About: React.FC = () => {
  return (
    <section
      id="about"
      className="relative pt-16 pb-20 md:pt-20 md:pb-24 text-gray-200 overflow-hidden scroll-mt-24"
      style={{
        background: 'linear-gradient(to bottom right, #0B0F28 0%, #232a6b 25%, #3184b1 75%, #4B3087 100%)',
      }}
    >
      {/* Soft overlay at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F28]/40 via-transparent to-transparent z-0 pointer-events-none" />
      
      {/* subtle texture background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Intro */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
            About CodFence
          </h2>
          <p className="text-lg text-[#E5E7EB]/70 leading-relaxed text-left max-w-5xl mx-auto">
            CodFence is an intelligent verification and protection platform designed to
            make every Cash-on-Delivery (COD) transaction secure, seamless, and
            growth-driven. In markets where COD remains a key payment method yet highly
            vulnerable to cancellations and fraud, CodFence empowers eCommerce merchants
            to turn operational risks into opportunities for trust and conversion.
            <br />
            <br />
            By leveraging AI-powered risk scoring and automated customer engagement,
            CodFence helps merchants confirm orders instantly, prevent losses, and enhance
            delivery success — all while improving customer experience and retention.
            It’s not just about preventing fraud; it’s about building a smarter, more
            reliable path to sales growth.
          </p>

        </div>

        {/* Mission / Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mb-28">
          <div className="glass-card p-8 lg:p-10 text-left hover:translate-y-[-4px]">
            <h3 className="text-3xl font-semibold text-[#E5E7EB] mb-4">Mission</h3>
            <p className="text-[#E5E7EB]/70 leading-relaxed">
              Empower merchants to transform complex COD operations into secure,
              simple, and trustworthy transactions.
            </p>
          </div>

          <div className="glass-card p-8 lg:p-10 text-left hover:translate-y-[-4px]">
            <h3 className="text-3xl font-semibold text-[#E5E7EB] mb-4">Vision</h3>
            <p className="text-[#E5E7EB]/70 leading-relaxed">
              Become Southeast Asia's leading intelligent verification and
              protection solution for eCommerce.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div id="core-values" className="text-center mb-20 scroll-mt-24">
          <h3 className="text-4xl font-bold mb-14 gradient-text">Core Values</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                icon: <ShieldCheck className="w-10 h-10 text-cyan-400 mb-3" />,
                title: "Trust & Efficiency",
                text: "Every transaction secured, every process optimized.",
              },
              {
                icon: <Cpu className="w-10 h-10 text-purple-400 mb-3" />,
                title: "Innovation",
                text: "Leveraging AI and automation for smarter risk prevention.",
              },
              {
                icon: <Handshake className="w-10 h-10 text-blue-400 mb-3" />,
                title: "Reliability",
                text: "Helping merchants grow with confidence and control.",
              },
              {
                icon: <LineChart className="w-10 h-10 text-emerald-400 mb-3" />,
                title: "Scalability",
                text: "Building a secure foundation for long-term growth.",
              },
            ].map((v, i) => (
              <div
                key={i}
                className="glass-card p-6 lg:p-8 hover:translate-y-[-4px] flex flex-col items-center text-center"
              >
                {v.icon}
                <h4 className="text-lg lg:text-xl font-semibold text-[#E5E7EB] mb-2 mt-2">
                  {v.title}
                </h4>
                <p className="text-[#E5E7EB]/70 text-sm leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technology & Offerings */}
        <div id="technology" className="max-w-4xl mx-auto text-left mb-16 scroll-mt-24">
          <h3 className="text-4xl font-bold mb-10 gradient-text text-center">
            Technology & Offerings
          </h3>
          <ul className="space-y-5 text-[#E5E7EB]/70 leading-relaxed">
            <li>
              <span className="text-white font-semibold">FenceAI:</span> AI-driven
              risk scoring engine that learns from transaction data.
            </li>
            <li>
              <span className="text-white font-semibold">FenceBot:</span> Automated
              order confirmation via Zalo OA or Messenger.
            </li>
            <li>
              <span className="text-white font-semibold">FencePay:</span> Optional
              module for QR and prepaid payment integrations.
            </li>
            <li>
              <span className="text-white font-semibold">FenceHub:</span> Centralized
              dashboard for COD data management and analytics.
            </li>
          </ul>
        </div>

        {/* Positioning Statement */}
        <div className="mt-24 max-w-5xl mx-auto text-center px-6">
          <div className="h-[1px] w-32 mx-auto mb-8 bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] opacity-50"></div>
          <p className="text-2xl italic font-light text-[#E5E7EB]/80 leading-relaxed tracking-wide">
            “CodFence enables eCommerce merchants to protect and optimize every COD
            transaction through intelligent verification, automation, and data-driven
            insights. We believe that when verification becomes seamless, protection
            becomes powerful — and protection, in turn, becomes growth.”
          </p>
        </div>
      </div>
    </section>
  );
};

