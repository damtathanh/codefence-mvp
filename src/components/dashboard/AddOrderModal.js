import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { X, Upload, FileText, Loader2, AlertCircle, CheckCircle, FileSpreadsheet, } from "lucide-react";
import { useSupabaseTable } from "../../hooks/useSupabaseTable";
import { ManualOrderForm } from "./ManualOrderForm";
import { useOrders } from "../../hooks/useOrders";
import { Button } from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { logUserAction } from "../../utils/logUserAction";
import { useAuth } from "../../features/auth";
export const AddOrderModal = ({ isOpen, onClose, onSuccess, editingOrder = null, }) => {
    const { user } = useAuth();
    const isEditMode = !!editingOrder;
    const [activeTab, setActiveTab] = useState("manual");
    const { data: allProducts = [] } = useSupabaseTable({
        tableName: "products",
    });
    const products = allProducts.filter((p) => p.status === "active");
    // Upload states
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("idle");
    const [message, setMessage] = useState(null);
    const [localLoading, setLocalLoading] = useState(false);
    const { parseFile, insertOrders } = useOrders();
    const resetFileInput = () => {
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    // Main upload handler
    const processFile = async (file) => {
        if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
            setUploadStatus("error");
            setMessage("Only Excel (.xlsx, .xls) or CSV files are supported.");
            return;
        }
        try {
            setUploadStatus("processing");
            setLocalLoading(true);
            setMessage("Reading file...");
            // 1. Parse Excel/CSV
            const result = (await parseFile(file));
            const parsedOrders = result.validOrders || [];
            if (parsedOrders.length === 0)
                throw new Error("No valid rows found in the file.");
            setMessage(`Uploading ${parsedOrders.length} orders...`);
            // 2. Insert orders
            const insertResult = await insertOrders(parsedOrders);
            const successCount = insertResult.success ?? 0;
            const failedCount = insertResult.failed ?? 0;
            // 3. Extract inserted Order IDs
            const insertedOrderIds = insertResult.insertedOrders?.map((o) => o.id) || [];
            // 4. Nếu có đơn được insert -> fetch lại và chỉ log user action
            //    Logic tạo / update Invoice đã được Postgres trigger xử lý.
            if (insertedOrderIds.length > 0) {
                const { data: newOrders, error } = await supabase
                    .from("orders")
                    .select("*")
                    .in("id", insertedOrderIds);
                if (!error && newOrders && user) {
                    // Log import action cho từng đơn
                    const logPromises = newOrders.map((order) => logUserAction({
                        userId: user.id,
                        action: "Import Orders",
                        status: "success",
                        orderId: order.order_id ?? "",
                        details: {
                            source: "excel_import",
                            file_name: file.name,
                            amount: order.amount?.toString() || "0",
                            product: order.product,
                        },
                    }));
                    await Promise.all(logPromises);
                }
            }
            // 5. Success feedback
            setUploadStatus("success");
            setMessage(`Success! Inserted ${successCount} orders. Failed ${failedCount} orders.`);
            setTimeout(() => {
                setUploadStatus("idle");
                setMessage(null);
                onSuccess?.();
            }, 1500);
        }
        catch (err) {
            console.error("Upload Error:", err);
            setUploadStatus("error");
            setMessage(err.message || "Error processing file");
        }
        finally {
            setLocalLoading(false);
        }
    };
    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (file)
            await processFile(file);
        resetFileInput();
    };
    const handleDrop = async (event) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file)
            await processFile(file);
    };
    // Modal behaviors
    useEffect(() => {
        if (isOpen && editingOrder)
            setActiveTab("manual");
    }, [isOpen, editingOrder]);
    useEffect(() => {
        if (!isOpen)
            return;
        const handleEsc = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget)
            onClose();
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4", onClick: handleOverlayClick, role: "dialog", "aria-modal": "true", "aria-labelledby": "add-order-modal-title", children: _jsxs("div", { className: "bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] shadow-2xl w-full max-w-2xl flex flex-col", onClick: (e) => e.stopPropagation(), style: { maxHeight: "90vh" }, children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#1E223D]", children: [_jsx("h3", { className: "text-xl font-semibold text-[#E5E7EB]", children: isEditMode ? "Edit Order" : "Add Order" }), _jsx("button", { onClick: onClose, className: "text-[#E5E7EB]/70 hover:text-[#E5E7EB] p-1 rounded hover:bg-white/10", children: _jsx(X, { size: 20 }) })] }), !isEditMode && (_jsxs("div", { className: "flex gap-2 px-6 pt-4 border-b border-[#1E223D]", children: [_jsxs("button", { onClick: () => setActiveTab("manual"), className: `px-4 py-2 text-sm ${activeTab === "manual"
                                ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]"
                                : "text-[#E5E7EB]/70 hover:text-[#E5E7EB]"}`, children: [_jsx(FileText, { size: 16, className: "inline mr-2" }), "Manual Entry"] }), _jsxs("button", { onClick: () => setActiveTab("upload"), className: `px-4 py-2 text-sm ${activeTab === "upload"
                                ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]"
                                : "text-[#E5E7EB]/70 hover:text-[#E5E7EB]"}`, children: [_jsx(Upload, { size: 16, className: "inline mr-2" }), "Upload File"] })] })), _jsx("div", { className: "flex-1 overflow-y-auto p-6 min-h-0", children: activeTab === "manual" ? (_jsx(ManualOrderForm, { editingOrder: editingOrder, onClose: onClose, onSuccess: onSuccess, products: products })) : (_jsxs("div", { className: "space-y-5", children: [_jsx("div", { className: `
                  border-2 border-dashed border-[#8B5CF6]/30 rounded-xl p-8 text-center
                  bg-gradient-to-br from-[#8B5CF6]/5 to-transparent
                  ${isDragOver ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : ""}
                  ${localLoading ? "opacity-50 pointer-events-none" : ""}
                `, onDragOver: (e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }, onDragLeave: () => setIsDragOver(false), onDrop: handleDrop, children: _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center mb-4", children: localLoading ? (_jsx(Loader2, { size: 28, className: "animate-spin text-[#8B5CF6]" })) : (_jsx(Upload, { size: 28, className: "text-[#8B5CF6]" })) }), _jsx("p", { className: "text-[#E5E7EB] font-medium mb-1 text-lg", children: localLoading ? "Processing..." : "Upload file order (Excel / CSV)" }), _jsx("p", { className: "text-sm text-[#E5E7EB]/60 mb-6", children: "Supported: .xlsx, .xls, .csv (Max 5MB)" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".xlsx,.xls,.csv", className: "hidden", onChange: handleFileSelect }), !localLoading && (_jsxs(Button, { onClick: () => fileInputRef.current?.click(), className: "px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-xl shadow-md flex items-center gap-2", children: [_jsx(Upload, { size: 18 }), "Upload from your computer"] }))] }) }), _jsx("div", { className: "rounded-xl border border-[#1E223D] bg-white/5 p-4", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 text-sm", children: [_jsxs("div", { children: [_jsx("h4", { className: "mb-2 font-semibold text-[#E5E7EB]", children: "Order Template Format" }), _jsxs("ul", { className: "list-disc list-inside space-y-1 text-[#E5E7EB]/80", children: [_jsx("li", { children: "Order ID" }), _jsx("li", { children: "Customer Name" }), _jsx("li", { children: "Phone Number" }), _jsx("li", { children: "Gender" }), _jsx("li", { children: "Birthyear" }), _jsx("li", { children: "Address Detail" }), _jsx("li", { children: "Ward" }), _jsx("li", { children: "District" }), _jsx("li", { children: "Province" })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "mb-2 font-semibold text-[#E5E7EB]", children: "Order Template Format" }), _jsxs("ul", { className: "list-disc list-inside space-y-1 text-[#E5E7EB]/80", children: [_jsx("li", { children: "Product" }), _jsx("li", { children: "Amount (VND)" }), _jsx("li", { children: "Payment Method" }), _jsx("li", { children: "Discount" }), _jsx("li", { children: "Shipping Fee" }), _jsx("li", { children: "Channel" }), _jsx("li", { children: "Source" }), _jsx("li", { children: "Order Date" })] })] })] }) }), message && (_jsxs("div", { className: `flex items-start gap-3 p-4 rounded-lg text-sm border ${uploadStatus === "error"
                                    ? "bg-red-500/10 border-red-500/20 text-red-200"
                                    : uploadStatus === "success"
                                        ? "bg-green-500/10 border-green-500/20 text-green-200"
                                        : "bg-blue-500/10 border-blue-500/20 text-blue-200"}`, children: [uploadStatus === "error" && (_jsx(AlertCircle, { className: "w-5 h-5 text-red-400" })), uploadStatus === "success" && (_jsx(CheckCircle, { className: "w-5 h-5 text-green-400" })), uploadStatus === "processing" && (_jsx(FileSpreadsheet, { className: "w-5 h-5 text-blue-400 animate-pulse" })), _jsx("div", { className: "flex-1", children: message })] }))] })) })] }) }));
};
