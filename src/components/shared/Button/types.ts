import { ReactNode } from 'react';

export interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'outline' | 'ghost';
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
    disabled?: boolean;
}
