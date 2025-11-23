import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon }) => {
    return (
        <div className="rounded-2xl bg-[#020617] border border-white/10 p-4 flex items-start justify-between">
            <div className="flex-1">
                <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">
                    {title}
                </h3>
                <p className="mt-1 text-2xl font-semibold text-white">
                    {value}
                </p>
                {subtitle && (
                    <p className="mt-1 text-xs text-white/50">
                        {subtitle}
                    </p>
                )}
            </div>
            {icon && (
                <div className="flex-shrink-0 rounded-xl bg-white/5 p-2 ml-3">
                    {icon}
                </div>
            )}
        </div>
    );
};
