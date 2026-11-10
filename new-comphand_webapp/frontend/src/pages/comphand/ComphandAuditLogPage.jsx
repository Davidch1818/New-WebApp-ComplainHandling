import React, { useState, useEffect } from 'react';

const ComphandAuditLogPage = () => {
    // Audit log states
    const [auditLogs, setAuditLogs] = useState([]);
    const [logPage, setLogPage] = useState(1);
    const [logPageSize] = useState(50);
    const [logTotal, setLogTotal] = useState(0);
    const [logTotalPages, setLogTotalPages] = useState(0);

    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Filters for Audit Log
    const [actorId, setActorId] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState(formatDateForInput(lastWeek));
    const [dateTo, setDateTo] = useState(formatDateForInput(today));

    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Fetch audit logs
    const fetchAuditLogs = async (overrideFilters = null) => {
        setIsLoading(true);
        try {
            const currentActorId = overrideFilters?.actorId !== undefined ? overrideFilters.actorId : actorId;
            const currentActionFilter = overrideFilters?.actionFilter !== undefined ? overrideFilters.actionFilter : actionFilter;
            const currentDateFrom = overrideFilters?.dateFrom !== undefined ? overrideFilters.dateFrom : dateFrom;
            const currentDateTo = overrideFilters?.dateTo !== undefined ? overrideFilters.dateTo : dateTo;

            const queryParams = new URLSearchParams({
                page: logPage.toString(),
                page_size: logPageSize.toString(),
            });
            if (currentActorId) queryParams.append('actor_id', currentActorId);
            if (currentActionFilter) queryParams.append('action', currentActionFilter);
            if (currentDateFrom) queryParams.append('date_from', new Date(currentDateFrom).toISOString());
            if (currentDateTo) queryParams.append('date_to', new Date(currentDateTo).toISOString());

            const res = await fetch(`/api/comphand/audit/log?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.items || []);
                setLogTotal(data.total || 0);
                setLogTotalPages(data.total_pages || 0);
            } else {
                showFeedback('error', 'Failed to fetch audit logs');
            }
        } catch (err) {
            showFeedback('error', 'Network error fetching audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [logPage]);

    const showFeedback = (type, message) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();

        if (dateFrom && dateTo) {
            const dFrom = new Date(dateFrom);
            const dTo = new Date(dateTo);
            const diffTime = dTo - dFrom;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffTime < 0) {
                showFeedback('error', 'From Date cannot be later than To Date');
                return;
            }

            if (diffDays > 31) {
                showFeedback('error', 'Date filter range cannot exceed 1 month (31 days)');
                return;
            }
        }

        setLogPage(1);
        fetchAuditLogs();
    };

    const handleClearFilters = () => {
        const defaultDateFrom = formatDateForInput(lastWeek);
        const defaultDateTo = formatDateForInput(today);

        setActorId('');
        setActionFilter('');
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
        setLogPage(1);

        fetchAuditLogs({
            actorId: '',
            actionFilter: '',
            dateFrom: defaultDateFrom,
            dateTo: defaultDateTo
        });
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Complain Handling Activity Log</h2>
                    <p className="text-sm text-on-surface-variant">Inspect activity logs specific to the Complain Handling module</p>
                </div>
            </div>

            {/* Alert message banner */}
            {feedback.message && (
                <div className={`p-4 rounded-md text-sm font-medium border flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    {feedback.message}
                </div>
            )}

            {/* AUDIT LOGS CONTENT */}
            <div className="flex flex-col gap-4">

                {/* Filters Form */}
                <div className="glass-panel p-5 bg-white border border-outline rounded-xl shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">Actor ID</label>
                            <input
                                type="text"
                                placeholder="Filter by Actor..."
                                value={actorId}
                                onChange={(e) => setActorId(e.target.value)}
                                className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">Action</label>
                            <input
                                type="text"
                                placeholder="Filter by Action..."
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-md font-semibold text-sm hover:bg-primary-dark transition-colors"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-4 py-2 border border-outline text-on-surface-variant rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* Audit Logs Table */}
                <div className="glass-panel overflow-hidden bg-white border border-outline rounded-xl shadow-sm">
                    {isLoading ? (
                        <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
                            <span>Loading logs...</span>
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
                            <span>No activity log records found matching constraints.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-outline">
                                        <th className="p-4 w-[180px]">Timestamp</th>
                                        <th className="p-4 w-[120px]">Actor ID</th>
                                        <th className="p-4 w-[180px]">Action</th>
                                        <th className="p-4 w-[120px]">Target ID</th>
                                        <th className="p-4">Details</th>
                                        <th className="p-4 w-[140px]">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-outline hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-on-surface-variant">{new Date(log.created_at).toLocaleString()}</td>
                                            <td className="p-4 font-semibold text-on-surface">{log.actor_id}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${log.action.includes('FAIL') || log.action.includes('DELETE') || log.action.includes('REJ_') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-on-surface-variant">
                                                {log.target_id ? `${log.target_type || ''} (${log.target_id})` : '-'}
                                            </td>
                                            <td className="p-4 font-mono text-xs max-h-[100px] overflow-y-auto whitespace-pre-wrap text-on-surface">
                                                {log.detail ? JSON.stringify(log.detail) : '-'}
                                            </td>
                                            <td className="p-4 text-on-surface-variant">{log.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {logTotalPages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-outline bg-white">
                            <span className="text-sm text-on-surface-variant">
                                Showing Page {logPage} of {logTotalPages} ({logTotal} logs)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={logPage === 1}
                                    onClick={() => setLogPage(logPage - 1)}
                                    className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${logPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={logPage === logTotalPages}
                                    onClick={() => setLogPage(logPage + 1)}
                                    className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${logPage === logTotalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ComphandAuditLogPage;