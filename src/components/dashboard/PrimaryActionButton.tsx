import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PrimaryActionButtonProps {
    onClick: () => void;
    className?: string;
    label?: string;            // dùng kiểu cũ: label="Add Order"
    children?: React.ReactNode; // dùng kiểu mới: <PrimaryActionButton>...</PrimaryActionButton>
}

export const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({
    onClick,
    className = '',
    label,
    children,
}) => {
    const content = children ?? (
        <>
            <Plus size={16} className="mr-2" />
            {label}
        </>
    );

    return (
        <Button
            onClick={onClick}
            size="sm"
            className={`w-full sm:w-auto ${className}`}
        >
            {content}
        </Button>
    );
};
