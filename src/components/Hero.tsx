import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/Button";
import { useAuth } from "../features/auth";

export const Hero: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-12 md:pt-28 md:pb-16"
      style={{
        background: 'linear-gradient(to bottom right, #0B0F28 0%, #232a6b 20%, #3184b1 70%, #4B3087 100%)',
      }}
    >
      {/* Soft overlay at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F28]/40 via-transparent to-transparent z-0 pointer-events-none" />
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
            <span className="gradient-text">
              Smart COD
            </span>
          </h1>
          <h2 className="text-5xl md:text-7xl font-extrabold mt-2 mb-8 leading-tight">
            <span className="gradient-text">
              Risk Protection
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white mb-10 leading-relaxed max-w-3xl mx-auto">
            Protect your business from fraudulent orders with AI-powered verification. 
            Maximize delivery success rates and minimize losses.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center">
            <Link to={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="lg" variant="primary">
                Start Free Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle floating elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#6366F1]/10 rounded-full blur-3xl animate-pulse z-[1]"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-pulse delay-1000 z-[1]"></div>
    </section>
  );
};
