import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
const ImageModal = ({ src, alt = "", onClose }) => {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);
    if (!src)
        return null;
    return (_jsx("div", { onClick: onClose, className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/70", children: _jsxs("div", { className: "max-w-[95%] max-h-[95%] p-2", onClick: (e) => e.stopPropagation(), children: [_jsx("img", { src: src, alt: alt, className: "w-auto h-auto max-w-full max-h-[80vh] rounded-md shadow-2xl object-contain" }), _jsx("div", { className: "mt-2 text-right", children: _jsx("button", { onClick: onClose, className: "px-3 py-1 bg-white/10 text-white rounded", children: "Close" }) })] }) }));
};
export default ImageModal;
