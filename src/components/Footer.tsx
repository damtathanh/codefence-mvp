import React from "react";
import { Facebook, Youtube, Linkedin, MapPin, Mail, Phone } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative footer-gradient text-gray-300 border-t border-white/10 backdrop-blur-2xl overflow-hidden">
      {/* Decorative layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#6366F1]/10 via-[#8B5CF6]/10 to-transparent opacity-60 pointer-events-none"></div>

      {/* Main Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-2">
        <h2 className="gradient-logo text-3xl font-bold mb-3">CodFence</h2>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-4">
            Smart COD risk protection platform powered by AI. Protect your
            business from fraudulent orders and maximize delivery success rates.
          </p>
          {/* Social icons */}
          <div className="flex space-x-4">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#8B5CF6] transition group"
            >
              <Facebook className="w-5 h-5 text-gray-300 group-hover:text-[#8B5CF6] transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400 transition group"
            >
              <Youtube className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/codfence"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#6366F1] transition group"
            >
              <Linkedin className="w-5 h-5 text-gray-300 group-hover:text-[#6366F1] transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            </a>
          </div>
        </div>

        {/* Company */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <a href="#about" className="hover:text-[#8B5CF6] transition">
                About Us
              </a>
            </li>
            <li>
              <a href="#solutions" className="hover:text-[#8B5CF6] transition">
                Our Solutions
              </a>
            </li>
          </ul>
        </div>

        {/* Information */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <a href="#news" className="hover:text-[#8B5CF6] transition">
                News
              </a>
            </li>
            <li>
              <a href="#careers" className="hover:text-[#8B5CF6] transition">
                Careers
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-[#8B5CF6] transition">
                Contact
              </a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="sm:col-span-2 md:col-span-1 lg:col-span-1 min-w-[260px]">
          <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
          <ul className="space-y-4 text-gray-400">
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#8B5CF6] mt-0.5 flex-shrink-0" />
              <div className="text-sm leading-relaxed">
                <div className="whitespace-nowrap">Floor 81, Landmark 81 Tower</div>
                <div className="whitespace-nowrap">Nui Thanh, Tan Binh District</div>
                <div className="whitespace-nowrap">Ho Chi Minh City, Vietnam</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
              <a href="mailto:contact@codfence.com" className="hover:text-[#8B5CF6] transition text-sm whitespace-nowrap">
                contact@codfence.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
              <a href="tel:+84707970216" className="hover:text-[#8B5CF6] transition text-sm whitespace-nowrap">
                (+84) 707 970 216
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Divider line */}
      <div className="relative z-10 border-t border-white/10"></div>

      {/* Bottom bar */}
      <div className="relative z-10 py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()}{" "}
        <span className="gradient-logo font-semibold">CodFence</span>. All rights reserved.
      </div>
    </footer>
  );
};
