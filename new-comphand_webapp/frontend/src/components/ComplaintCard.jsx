import React from 'react';
import StatusChip from './StatusChip';

const ComplaintCard = ({ id, title, status, timestamp, assignee, summary }) => {
    return (
        <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm hover:border-primary transition-colors flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary font-medium">{id}</span>
                    <h3 className="font-headline-md text-on-surface m-0 text-lg">{title}</h3>
                </div>
                <StatusChip status={status} />
            </div>

            <div>
                <p className="text-on-surface-variant text-sm line-clamp-2">{summary}</p>
            </div>

            <div className="flex justify-between items-center mt-2 pt-3 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant">{timestamp}</span>
                <span className="text-xs text-on-surface-variant">Assigned to: {assignee}</span>
            </div>
        </div>
    );
};

export default ComplaintCard;