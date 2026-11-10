import React from 'react';

const Button = ({ children, variant = 'primary', onClick, type = 'button', className = '', ...props }) => {
    const baseStyle = "font-label-md rounded-lg transition-all flex items-center justify-center gap-2";

    let variantStyle = "";
    if (variant === 'primary') {
        variantStyle = "px-8 py-3 bg-primary-container text-on-primary hover:bg-primary shadow-sm";
    } else if (variant === 'secondary') {
        variantStyle = "px-6 py-3 text-on-surface-variant hover:bg-surface-container-high border border-outline-variant";
    }

    return (
        <button
            type={type}
            className={`${baseStyle} ${variantStyle} disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;