import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ListDataMenu from '../../layouts/ListDataMenu';

export default function ListComplain() {
    const navigate = useNavigate();

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const renderFilterSection = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate, setPagination, handleDownload }) => (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg items-end">
            <div className="md:col-span-4 flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Search</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input
                        className="w-full pl-10 pr-sm py-sm rounded-lg border border-outline-variant bg-surface focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
                        placeholder="Ticket ID or Name..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPagination(prev => ({ ...prev, current_page: 1 }));
                        }}
                    />
                </div>
            </div>
            <div className="md:col-span-3 flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Priority</label>
                <select
                    className="w-full p-sm rounded-lg border border-outline-variant bg-surface font-body-md text-on-surface-variant"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination(prev => ({ ...prev, current_page: 1 }));
                    }}
                >
                    <option value="">All Priority</option>
                    <option value="incident">Incident</option>
                    <option value="complaint">Complaint</option>
                </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Start Date</label>
                <input
                    type="date"
                    className="w-full p-sm rounded-lg border border-outline-variant bg-surface font-body-md text-on-surface-variant"
                    value={startDate}
                    onChange={(e) => {
                        setStartDate(e.target.value);
                        setPagination(prev => ({ ...prev, current_page: 1 }));
                    }}
                />
            </div>
            <div className="md:col-span-2 flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">End Date</label>
                <input
                    type="date"
                    className="w-full p-sm rounded-lg border border-outline-variant bg-surface font-body-md text-on-surface-variant"
                    value={endDate}
                    onChange={(e) => {
                        setEndDate(e.target.value);
                        setPagination(prev => ({ ...prev, current_page: 1 }));
                    }}
                />
            </div>
            <div className="md:col-span-1">
                <button
                    onClick={handleDownload}
                    className="w-full h-[42px] flex items-center justify-center rounded-lg border border-primary text-primary hover:bg-primary-container/10 transition-colors"
                    title="Download Report"
                >
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>
        </div>
    );

    const renderTableBody = (data, loading, showActions) => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={showActions ? 7 : 6} className="p-sm text-center text-on-surface-variant font-body-md">Loading...</td>
                </tr>
            );
        }
        if (data.length === 0) {
            return (
                <tr>
                    <td colSpan={showActions ? 7 : 6} className="p-sm text-center text-on-surface-variant font-body-md">No items found</td>
                </tr>
            );
        }
        return data.map((item, index) => (
            <tr key={item.request_id} className={`hover:bg-surface-container-lowest transition-colors group ${index % 2 !== 0 ? 'bg-surface-container-lowest/50' : ''}`}>
                <td className="p-sm font-body-md text-body-md text-primary font-medium whitespace-nowrap">
                    <button
                        onClick={() => navigate(`/operations/comphand/complaint-detail/${item.id}`, { state: { from: '/operations/comphand/list-complain' } })}
                        className="hover:underline focus:outline-none"
                    >
                        {item.request_id}
                    </button>
                </td>
                <td className="p-sm font-body-md text-body-md text-on-background whitespace-nowrap">{item.customer_name}</td>
                <td className="p-sm font-body-md text-body-md text-on-surface-variant truncate max-w-[200px]" title={item.issue_type}>{item.issue_type}</td>
                <td className="p-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-md text-xs font-medium border ${item.req_status === 'In-Progress' || item.req_status === 'In Progress' ? 'bg-primary-container/10 text-primary border-primary/20' : item.req_status === 'Extend' ? 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'}`}>
                        {item.req_status || 'In-Progress'}
                    </span>
                </td>
                <td className="p-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-md text-xs border ${item.status === 'Incident' ? 'bg-error-container/10 text-tertiary border-error/20' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'}`}>
                        {item.status}
                    </span>
                </td>
                <td className="p-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">{formatDate(item.created_at)}</td>
                {showActions && (
                    <td className="p-sm whitespace-nowrap">
                        <div className="flex items-center gap-xs">
                            <button className="p-xs rounded hover:bg-primary-container/10 text-primary transition-colors" title="Edit">
                                <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="p-xs rounded hover:bg-error-container/10 text-tertiary transition-colors" title="Delete">
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        ));
    };

    return (
        <ListDataMenu
            title="Outstanding Complaint"
            subtitle="Manage and resolve customer support inquiries with precision."
            apiEndpoint="/api/comphand/complaints/list"
            renderFilterSection={renderFilterSection}
            renderTableBody={renderTableBody}
            showActions={false}
        />
    );
}