import React, { useState, useEffect } from 'react';

/**
 * ListDataMenu
 * 
 * A reusable UI layout component for List Data screens following KBank Indonesia design principles.
 * Includes a main content area with headers, filter/search section, table section, and pagination.
 * 
 * Props:
 * - title: Page title (default: "Outstanding Complaint")
 * - subtitle: Page subtitle
 * - filterSection: React node to replace default filters
 * - tableHeader: React node for <thead> content
 * - tableBody: React node for <tbody> content
 * - pagination: React node for pagination
 * - children: If provided, replaces the entire <table> element
 */
export default function ListDataMenu({
    title = "Outstanding Complaint",
    subtitle = "Manage and resolve customer support inquiries with precision.",
    apiEndpoint,
    filterSection,
    renderFilterSection,
    tableHeader,
    tableBody,
    renderTableBody,
    pagination,
    children,
    showActions = false,
    refreshTrigger = 0
}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paginationState, setPaginationState] = useState({ current_page: 1, total_pages: 1, total_items: 0, limit: 10 });

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (!apiEndpoint) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: paginationState.current_page,
                    limit: paginationState.limit,
                });
                if (searchTerm) params.append('search', searchTerm);
                if (statusFilter) params.append('status', statusFilter);
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);

                const response = await fetch(`${apiEndpoint}?${params.toString()}`);
                if (!response.ok) throw new Error('Failed to fetch data');
                const result = await response.json();

                setData(result.data || []);
                if (result.pagination) {
                    setPaginationState(result.pagination);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timer);
    }, [apiEndpoint, paginationState.current_page, paginationState.limit, searchTerm, statusFilter, startDate, endDate, refreshTrigger]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= paginationState.total_pages) {
            setPaginationState(prev => ({ ...prev, current_page: newPage }));
        }
    };

    const handleDownload = () => {
        if (!apiEndpoint) return;

        const exportEndpoint = apiEndpoint.replace('/list', '/export');
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('status', statusFilter);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const url = `${exportEndpoint}?${params.toString()}`;

        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', ''); // The actual filename is provided by the backend's Content-Disposition header
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const renderFilters = () => {
        if (renderFilterSection) {
            return renderFilterSection({
                searchTerm,
                setSearchTerm,
                statusFilter,
                setStatusFilter,
                startDate,
                setStartDate,
                endDate,
                setEndDate,
                setPagination: setPaginationState,
                handleDownload
            });
        }
        if (filterSection) return filterSection;
        return (
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
                                setPaginationState(prev => ({ ...prev, current_page: 1 }));
                            }}
                        />
                    </div>
                </div>
                <div className="md:col-span-2 flex flex-col gap-xs">
                    <label className="font-label-md text-on-surface-variant">Status</label>
                    <select
                        className="w-full p-sm rounded-lg border border-outline-variant bg-surface font-body-md text-on-surface-variant"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPaginationState(prev => ({ ...prev, current_page: 1 }));
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="in_progress">In-Progress</option>
                        <option value="extend">Extend</option>
                        <option value="completed">Completed</option>
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
                            setPaginationState(prev => ({ ...prev, current_page: 1 }));
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
                            setPaginationState(prev => ({ ...prev, current_page: 1 }));
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
    };

    const renderTableHeader = () => {
        if (tableHeader) return tableHeader;
        return (
            <tr>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Ticket ID</th>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Customer Name</th>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant w-1/3 min-w-[200px]">Subject</th>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Status</th>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Priority</th>
                <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Created Date</th>
                {showActions && (
                    <th className="p-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Actions</th>
                )}
            </tr>
        );
    };

    const renderTableBodyContent = () => {
        if (renderTableBody) return renderTableBody(data, loading, showActions);
        if (tableBody) return tableBody;

        if (loading) {
            return (
                <tr>
                    <td colSpan={showActions ? 7 : 6} className="p-sm text-center text-on-surface-variant font-body-md">Loading...</td>
                </tr>
            );
        }

        if (data.length > 0) {
            return data.map((item, index) => (
                <tr key={index} className={`hover:bg-surface-container-lowest transition-colors group ${index % 2 !== 0 ? 'bg-surface-container-lowest/50' : ''}`}>
                    <td className="p-sm font-body-md text-body-md text-primary font-medium whitespace-nowrap">{item.id || item.request_id || '-'}</td>
                    <td colSpan="6" className="p-sm font-body-md text-body-md text-on-background whitespace-nowrap">{JSON.stringify(item)}</td>
                </tr>
            ));
        }

        return (
            <tr>
                <td colSpan="7" className="p-sm text-center text-on-surface-variant font-body-md">No items found</td>
            </tr>
        );
    };

    const renderPaginationSection = () => {
        if (pagination) return pagination;

        const startItem = (paginationState.current_page - 1) * paginationState.limit + 1;
        const endItem = Math.min(paginationState.current_page * paginationState.limit, paginationState.total_items);

        return (
            <>
                <span className="font-body-md text-body-md text-on-surface-variant">
                    Showing {paginationState.total_items === 0 ? 0 : startItem}-{endItem} of {paginationState.total_items}
                </span>
                <div className="flex items-center gap-xs">
                    <button
                        onClick={() => handlePageChange(paginationState.current_page - 1)}
                        disabled={paginationState.current_page === 1}
                        className="p-xs rounded border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {Array.from({ length: Math.min(5, paginationState.total_pages) }, (_, i) => {
                        let pageNum;
                        if (paginationState.total_pages <= 5) {
                            pageNum = i + 1;
                        } else if (paginationState.current_page <= 3) {
                            pageNum = i + 1;
                        } else if (paginationState.current_page >= paginationState.total_pages - 2) {
                            pageNum = paginationState.total_pages - 4 + i;
                        } else {
                            pageNum = paginationState.current_page - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 h-8 flex items-center justify-center rounded font-label-md text-label-md transition-colors ${paginationState.current_page === pageNum
                                        ? 'bg-primary-container text-primary'
                                        : 'border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    {paginationState.total_pages > 5 && paginationState.current_page < paginationState.total_pages - 2 && (
                        <>
                            <span className="font-body-md text-body-md text-on-surface-variant px-1">...</span>
                        </>
                    )}

                    <button
                        onClick={() => handlePageChange(paginationState.current_page + 1)}
                        disabled={paginationState.current_page === paginationState.total_pages || paginationState.total_pages === 0}
                        className="p-xs rounded border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </>
        );
    };

    return (
        <main className="flex-1 flex flex-col min-h-screen bg-background text-on-background">
            {/* Top App Bar (Mobile Only for Navigation) */}
            <header className="flex justify-between items-center px-lg w-full sticky top-0 z-40 bg-surface h-16 border-b border-outline-variant dark:border-outline-mid md:hidden">
                <div className="flex items-center gap-sm">
                    <button className="text-primary hover:bg-surface-container-low p-sm rounded-full transition-colors">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <h1 className="text-headline-md font-headline-md text-primary dark:text-primary-fixed">Bank Customer Support</h1>
                </div>
                <div className="flex items-center gap-sm text-primary dark:text-primary-fixed">
                    <button className="hover:bg-surface-container-low p-sm rounded-full transition-colors cursor-pointer active:opacity-80">
                        <span className="material-symbols-outlined">search</span>
                    </button>
                    <button className="hover:bg-surface-container-low p-sm rounded-full transition-colors cursor-pointer active:opacity-80">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer">
                        <img alt="Agent Profile Picture" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AxuPDtITyQtqb6JBhazWMACEJYs7I4F-aYB8M5FZAyv1MF4EnpBWxvd_wFuk309i5iYFq-vqKteSYAwX3Sq_Q-sn8F9_QbnQgUT5zKRTiMisnw9hPdi1PaF8NyZ-jOzM-subNTN4pI7A2E1R9RzwhoY-xjKSHs-vcMtM66WJ5clRbqbfzUwfIz-ih-OUWbzaRRsrhtxuIcchH5xP2jc8TVhCQFi936QTBKBVwizRSGgX4NKGDz_Fuo8xneAmLk4zIRvtCrNuH_6DA" />
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <div className="p-margin-mobile md:p-margin-desktop flex-1 flex flex-col gap-lg">
                {/* Header Section */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-md">
                    <div>
                        <h2 className="text-headline-xl font-bold text-on-background tracking-tight">{title}</h2>
                        <p className="text-body-md text-on-surface-variant mt-xs">{subtitle}</p>
                    </div>
                </section>

                {/* Filter & Search Bar */}
                <section className="bg-surface p-md rounded-xl border border-outline-variant flex flex-col gap-md">
                    {renderFilters()}
                </section>

                {/* Table Section */}
                <section className="bg-surface rounded-xl border border-outline-variant overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        {children ? (
                            children
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="border-b border-outline-variant bg-surface-container-low">
                                    {renderTableHeader()}
                                </thead>
                                <tbody className="divide-y divide-outline-variant">
                                    {renderTableBodyContent()}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {/* Pagination */}
                    <div className="bg-surface-container-low p-sm border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-sm shadow-none">
                        {renderPaginationSection()}
                    </div>
                </section>
            </div>
        </main>
    );
}