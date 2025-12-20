import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const AnalyticsLayout = ({ summaryCards, charts, chartHeight = 200, children, }) => {
    const hasCharts = charts && charts.length > 0;
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col gap-3 px-[10px] pb-[10px]", children: [_jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", children: summaryCards.map((card, idx) => (_jsx("div", { children: card }, idx))) }), _jsxs("div", { className: "flex-1 min-h-0 flex flex-col gap-3", children: [hasCharts && (_jsx("div", { className: "grid grid-cols-1 gap-3 xl:grid-cols-3", children: charts.map((chart, idx) => (_jsx("div", { className: "h-[200px]", style: { height: chartHeight }, children: chart }, idx))) })), children && (_jsx("div", { className: "flex-1 min-h-0", children: children }))] })] }));
};
