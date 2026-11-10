import React from 'react';

export default function ConfirmBoxDialog({
    isOpen,
    title = 'Confirm',
    message,
    onCancel,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning', 'danger', 'success', 'info'
    showCancel = true,
}) {
    if (!isOpen) return null;

    let icon = 'warning';
    let iconColor = 'text-tertiary';
    let confirmBtnClass = 'bg-tertiary text-on-tertiary hover:opacity-90';

    if (type === 'danger') {
        icon = 'error';
        iconColor = 'text-error';
        confirmBtnClass = 'bg-error text-white hover:bg-error/90';
    } else if (type === 'success') {
        icon = 'check_circle';
        iconColor = 'text-[#22c55e]'; // green-500
        confirmBtnClass = 'bg-[#22c55e] text-white hover:bg-[#16a34a]';
    } else if (type === 'info') {
        icon = 'info';
        iconColor = 'text-primary';
        confirmBtnClass = 'bg-primary text-white hover:bg-primary/90';
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile bg-on-background/40 backdrop-blur-sm">
            <div className="bg-surface-container-lowest rounded-xl shadow-none border border-outline-variant w-full max-w-[28rem] overflow-hidden">
                <div className="p-lg">
                    <div className={`flex items-center gap-md mb-md ${iconColor}`}>
                        <span className="material-symbols-outlined text-headline-lg">{icon}</span>
                        <h3 className="text-headline-md font-headline-md text-on-surface">{title}</h3>
                    </div>
                    <p className="text-body-md text-on-surface-variant mb-lg">
                        {message}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-end gap-md">
                        {showCancel && onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`px-lg py-sm rounded-lg font-label-md text-label-md transition-colors ${confirmBtnClass}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
