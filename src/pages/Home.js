import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Solutions } from '../components/Solutions';
import { Contact } from '../components/Contact';
export const Home = () => {
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx(Hero, {}), _jsx("div", { className: "h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" }), _jsx("div", { id: "features", children: _jsx(About, {}) }), _jsx("div", { className: "h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" }), _jsx(Solutions, {}), _jsx("div", { className: "h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" }), _jsx(Contact, {})] }));
};
