import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
export const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission
        alert('Thank you for your message! We will get back to you soon.');
        setFormData({ name: '', email: '', message: '' });
    };
    return (_jsxs("section", { id: "contact", className: "pt-16 pb-20 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 relative scroll-mt-24", style: {
            background: 'linear-gradient(to bottom right, #0B0F28 0%, #232a6b 35%, #3184b1 85%, #4B3087 100%)',
        }, children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-[#0B0F28]/40 via-transparent to-transparent z-0 pointer-events-none" }), _jsxs("div", { className: "relative z-10 max-w-4xl mx-auto", children: [_jsxs("div", { className: "text-center mb-16 lg:mb-20", children: [_jsx("h2", { className: "text-4xl md:text-5xl lg:text-6xl font-bold mb-6", children: _jsx("span", { className: "gradient-text", children: "Get in Touch" }) }), _jsx("p", { className: "text-xl lg:text-2xl text-[#E5E7EB]/70 leading-relaxed", children: "Have questions? We'd love to hear from you" })] }), _jsx("div", { className: "glass-card p-8 lg:p-10", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx(Input, { label: "Name", type: "text", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "Your name", required: true }), _jsx(Input, { label: "Email", type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), placeholder: "your.email@example.com", required: true }), _jsxs("div", { className: "w-full", children: [_jsx("label", { className: "block text-sm font-semibold text-[#E5E7EB]/90 mb-3", children: "Message" }), _jsx("textarea", { className: "w-full px-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 focus:bg-white/10 transition-all duration-300 resize-none", rows: 6, value: formData.message, onChange: (e) => setFormData({ ...formData, message: e.target.value }), placeholder: "Your message...", required: true })] }), _jsx(Button, { type: "submit", variant: "primary", size: "lg", className: "w-full", children: "Send Message" })] }) })] })] }));
};
