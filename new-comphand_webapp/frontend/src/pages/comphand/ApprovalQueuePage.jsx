import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ApprovalQueuePage = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ total_pending: 0, total_incident: 0 });
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_items: 0, limit: 10 });

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                limit: pagination.limit,
            });
            if (search) params.append('search', search);
            if (status !== 'All') params.append('status', status);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetch(`/api/comphand/complaints/otor_list?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();

            setData(result.data);
            setStats(result.stats);
            setPagination(result.pagination);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Adding a debounce for search if it was typed, but since it's simple, we'll fetch on changes.
        // To avoid too many requests on typing, we use a small timeout.
        const timer = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timer);
    }, [pagination.current_page, pagination.limit, search, status, startDate, endDate]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination(prev => ({ ...prev, current_page: newPage }));
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="font-['Kurious_Looped_Cond',sans-serif] w-full flex flex-col min-h-full">
            {/* Page Content */}
            <div className="p-lg space-y-lg max-w-[1440px] mx-auto w-full">
                {/* Summary Header Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                    <div className="bg-surface border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
                        <div className="w-14 h-14 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">pending_actions</span>
                        </div>
                        <div>
                            <p className="text-on-surface-variant font-label-md">Total Pending</p>
                            <p className="text-headline-lg font-bold text-on-surface">{stats.total_pending.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-surface border border-outline-variant p-lg rounded-xl flex items-center gap-lg border-l-4 border-l-tertiary">
                        <div className="w-14 h-14 rounded-xl bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                            <span className="material-symbols-outlined text-3xl">priority_high</span>
                        </div>
                        <div>
                            <p className="text-on-surface-variant font-label-md">Incident Request</p>
                            <p className="text-headline-lg font-bold text-on-surface">{stats.total_incident.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Main Table Section */}
                <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
                    {/* Advanced Filter Bar */}
                    <div className="p-md bg-surface-container-low border-b border-outline-variant flex flex-wrap gap-md items-center justify-between py-sm">
                        <div className="flex items-center gap-md">
                            <div className="relative hidden sm:block">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                                <input
                                    className="pl-10 pr-md py-xs bg-surface border border-outline-variant rounded-lg text-label-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all w-64"
                                    placeholder="Search Ticket ID, Name, Submitter, or Type..."
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPagination(prev => ({ ...prev, current_page: 1 }));
                                    }}
                                />
                            </div>

                            <select
                                className="bg-surface border border-outline-variant rounded-lg text-label-md px-md py-sm focus:ring-primary outline-none"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPagination(prev => ({ ...prev, current_page: 1 }));
                                }}
                            >
                                <option value="All">Status: All</option>
                                <option value="Incident">Incident</option>
                                <option value="Complaint">Complaint</option>
                            </select>

                            <div className="flex items-center gap-md">
                                <div className="flex items-center gap-sm bg-surface border border-outline-variant rounded-lg px-md py-xs">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant">calendar_today</span>
                                    <input
                                        className="bg-transparent border-none outline-none text-label-md w-32 p-0 focus:ring-0"
                                        placeholder="Start: YYYY-MM-DD"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setPagination(prev => ({ ...prev, current_page: 1 }));
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-sm bg-surface border border-outline-variant rounded-lg px-md py-xs">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant">calendar_today</span>
                                    <input
                                        className="bg-transparent border-none outline-none text-label-md w-32 p-0 focus:ring-0"
                                        placeholder="End: YYYY-MM-DD"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setPagination(prev => ({ ...prev, current_page: 1 }));
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-sm">
                            <span className="text-label-md text-on-surface-variant">
                                Showing {(pagination.current_page - 1) * pagination.limit + 1} - {Math.min(pagination.current_page * pagination.limit, pagination.total_items)} of {pagination.total_items}
                            </span>
                            <div className="flex gap-xs">
                                <button
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page === 1}
                                    className="p-xs border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page === pagination.total_pages || pagination.total_pages === 0}
                                    className="p-xs border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* High Density Table */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container text-on-surface-variant font-label-md uppercase tracking-wider text-xs">
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Request ID</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Customer Name</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Issue Type</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Submitter</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Request Date</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Status</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant">Req Action</th>
                                    <th className="px-lg py-md font-medium border-b border-outline-variant text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-body-md">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-lg py-xl text-center text-on-surface-variant">Loading...</td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-lg py-xl text-center text-on-surface-variant">No items found</td>
                                    </tr>
                                ) : (
                                    data.map((item, index) => (
                                        <tr
                                            key={item.request_id}
                                            className={`hover:bg-primary-container/10 transition-colors ${index % 2 === 0 ? 'bg-surface-container-lowest/50' : ''}`}
                                        >
                                            <td className="px-lg py-md font-medium text-primary text-sm">{item.request_id}</td>
                                            <td className="px-lg py-md text-sm">{item.customer_name}</td>
                                            <td className="px-lg py-md text-sm">{item.issue_type}</td>
                                            <td className="px-lg py-md text-sm">{item.submitter}</td>
                                            <td className="px-lg py-md text-sm">{formatDate(item.created_at)}</td>
                                            <td className="px-lg py-md text-sm">
                                                <span className={`px-2 py-0.5 font-semibold rounded text-[10px] uppercase tracking-tight border ${item.status === 'Incident'
                                                        ? 'bg-tertiary-container/20 text-tertiary border-tertiary/20'
                                                        : 'bg-secondary-container/20 text-secondary border-secondary/20'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-lg py-md text-sm font-medium">
                                                {item.action === 'Add' && <span className="text-green-600">New Request</span>}
                                                {item.action === 'Edit' && <span className="text-blue-600">Edit Request</span>}
                                                {item.action === 'Delete' && <span className="text-red-600">Delete Request</span>}
                                            </td>
                                            <td className="px-lg py-md text-center text-sm">
                                                <button
                                                    onClick={() => navigate(`/operations/comphand/checker-detail/${item.id}`)}
                                                    className="px-md py-sm bg-primary text-white rounded-lg font-medium hover:bg-on-primary-fixed-variant transition-all inline-flex items-center gap-xs text-xs whitespace-nowrap"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Pagination */}
                    <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
                        <nav className="flex items-center gap-sm">
                            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                // Simple pagination display logic to show around current page
                                let pageNum;
                                if (pagination.total_pages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.current_page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.current_page >= pagination.total_pages - 2) {
                                    pageNum = pagination.total_pages - 4 + i;
                                } else {
                                    pageNum = pagination.current_page - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-label-md transition-colors ${pagination.current_page === pageNum
                                                ? 'bg-primary text-white'
                                                : 'hover:bg-surface-container-high'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {pagination.total_pages > 5 && pagination.current_page < pagination.total_pages - 2 && (
                                <>
                                    <span className="px-sm text-on-surface-variant">...</span>
                                    <button
                                        onClick={() => handlePageChange(pagination.total_pages)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-label-md transition-colors"
                                    >
                                        {pagination.total_pages}
                                    </button>
                                </>
                            )}
                        </nav>
                    </div>
                </section>
            </div>

            {/* System Status Footer */}
            <footer className="mt-auto p-md border-t border-outline-variant text-center text-xs text-on-surface-variant bg-surface-container-low">
                <p>
                    &copy; 2023 PT Bank ABC Indonesia Tbk. | Last Sync: Today 15:42 WIB | Server Status: <span className="text-primary font-bold">Stable</span>
                </p>
            </footer>
        </div>
    );
};

export default ApprovalQueuePage;