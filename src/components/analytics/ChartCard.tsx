import React from 'react';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children }) => {
    return (
        <div className="rounded-2xl bg-[#020617] border border-white/10 p-4 h-full">
            <div className="mb-2">
                <h3 className="text-sm font-medium text-white">{title}</h3>
                {subtitle && (
                    <p className="text-xs text-white/50">{subtitle}</p>
                )}
            </div>
            <div className="h-52 md:h-64">
                {children}
            </div>
        </div>
    );
};
