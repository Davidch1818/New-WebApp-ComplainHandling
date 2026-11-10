import React from 'react';

const StatusChip = ({ status }) => {
    let statusClass = 'bg-surface-container-low text-on-surface-variant';
    let label = status;

    if (status.toLowerCase() === 'resolved') {
        statusClass = 'bg-[#DEF7EC] text-[#03543F]';
    } else if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'in progress') {
        statusClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    } else if (status.toLowerCase() === 'urgent' || status.toLowerCase() === 'overdue') {
        statusClass = 'bg-error-container text-on-error-container border border-error/20';
    }

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1 ${statusClass}`}>
            {label}
        </span>
    );
};

export default StatusChip;