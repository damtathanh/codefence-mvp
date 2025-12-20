import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
export const PrimaryActionButton = ({ onClick, className = '', label, children, }) => {
    const content = children ?? (_jsxs(_Fragment, { children: [_jsx(Plus, { size: 16, className: "mr-2" }), label] }));
    return (_jsx(Button, { onClick: onClick, size: "sm", className: `w-full sm:w-auto ${className}`, children: content }));
};
