import React from 'react';

const InputField = ({ label, id, type = 'text', placeholder, value, onChange, error, className = '', ...props }) => {
    return (
        <div className="flex flex-col w-full">
            {label && <label htmlFor={id} className="block mb-1.5 text-sm font-medium text-on-surface-variant">{label}</label>}
            <input
                id={id}
                type={type}
                className={`border border-outline-variant px-3 py-[10px] w-full rounded bg-surface text-on-surface font-label-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface-container-low disabled:opacity-70 ${error ? 'border-error focus:border-error focus:ring-error' : ''
                    } ${className}`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                {...props}
            />
            {error && <span className="text-error text-xs mt-1">{error}</span>}
        </div>
    );
};

export default InputField;