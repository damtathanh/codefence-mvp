import React from 'react';

interface PageLayoutProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, subtitle, children, actions }) => {
    return (
        <div className="flex flex-col gap-4 p-6 h-full min-h-0">
            {(title || actions) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {title && (
                        <div>
                            <h1 className="text-2xl font-bold text-white">{title}</h1>
                            {subtitle && <p className="text-[#E5E7EB]/60 mt-1">{subtitle}</p>}
                        </div>
                    )}
                    {actions && <div className="flex items-center gap-3 ml-auto">{actions}</div>}
                </div>
            )}

            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );
};
