import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-4 bg-[#0B0F28]", children: _jsxs("div", { className: "max-w-md w-full text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\u26A0\uFE0F" }), _jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Something went wrong" }), _jsx("p", { className: "text-white/70 mb-6", children: this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.' }), _jsx("button", { onClick: () => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }, className: "button-gradient px-6 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] transition", children: "Refresh Page" })] }) }));
        }
        return this.props.children;
    }
}
