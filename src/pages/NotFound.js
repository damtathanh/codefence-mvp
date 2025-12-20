import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
export const NotFound = () => {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-4", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-9xl font-bold gradient-text mb-4", children: "404" }), _jsx("h2", { className: "text-3xl font-semibold text-white mb-4", children: "Page Not Found" }), _jsx("p", { className: "text-white/70 mb-8 max-w-md mx-auto", children: "The page you're looking for doesn't exist or has been moved." }), _jsx(Link, { to: "/", children: _jsx(Button, { variant: "primary", size: "lg", children: "Go Back Home" }) })] }) }));
};
