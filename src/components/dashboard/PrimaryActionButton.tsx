import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface PrimaryActionButtonProps {
    label: string;
    onClick: () => void;
    className?: string;
}

export const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({
    label,
    onClick,
    className = '',
}) => {
    return (
        <Button
            onClick={onClick}
            size="sm"
            className={`w-full sm:w-auto ${className}`}
        >
            <Plus size={16} className="mr-2" />
            {label}
        </Button>
    );
};
