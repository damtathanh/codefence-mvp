import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
export const FileUploader = ({ onFileSelect, onRemove, selectedFile, accept = 'image/*,.pdf,.doc,.docx', maxSizeMB = 10, }) => {
    const fileInputRef = useRef(null);
    const [error, setError] = useState(null);
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File size must be less than ${maxSizeMB}MB`);
            return;
        }
        setError(null);
        onFileSelect(file);
    };
    const handleClick = () => {
        fileInputRef.current?.click();
    };
    const isImage = selectedFile?.type.startsWith('image/');
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: accept, onChange: handleFileChange, className: "hidden" }), !selectedFile ? (_jsxs(Button, { type: "button", variant: "outline", onClick: handleClick, className: "flex items-center gap-2", children: [_jsx(Upload, { size: 16 }), "Attach File"] })) : (_jsxs("div", { className: "flex items-center gap-2 p-2 bg-[#1E223D] rounded-lg border border-[#2F3655]", children: [isImage ? (_jsx(ImageIcon, { size: 16, className: "text-[#8B5CF6]" })) : (_jsx(File, { size: 16, className: "text-[#6366F1]" })), _jsx("span", { className: "flex-1 text-sm text-[#E5E7EB] truncate", children: selectedFile.name }), _jsx("button", { type: "button", onClick: onRemove, className: "p-1 hover:bg-white/10 rounded transition", "aria-label": "Remove file", children: _jsx(X, { size: 14, className: "text-[#E5E7EB]/70" }) })] })), error && (_jsx("p", { className: "text-xs text-red-400", children: error }))] }));
};
