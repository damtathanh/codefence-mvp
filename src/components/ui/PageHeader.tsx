import React, { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    actions,
    className = ""
}) => {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">{title}</h1>
                {description && (
                    <p className="text-[var(--text-muted)] mt-1 text-sm">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 flex-wrap">
                    {actions}
                </div>
            )}
        </div>
    );
};
