import React, { useState, useEffect } from 'react';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';

const CompHandRpt = () => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('all');

    const [reportData, setReportData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const showDialog = (type, title, message) => {
        setDialogConfig({ isOpen: true, type, title, message });
    };

    const closeDialog = () => {
        setDialogConfig({ isOpen: false, type: '', title: '', message: '' });
    };

    const validateDates = () => {
        if (new Date(startDate) > new Date(endDate)) {
            showDialog('danger', 'Validation Error', 'End Date cannot be earlier than Start Date.');
            return false;
        }
        return true;
    };

    const fetchReportData = async () => {
        if (!validateDates()) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
            });
            if (category && category !== 'all') {
                params.append('product_category', category);
            }

            const response = await fetch(`/api/comphand/report?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch report data');
            }

            const result = await response.json();
            const fetchedData = result.data || result || [];

            setReportData(fetchedData);
            setCurrentPage(1);

            if (fetchedData.length === 0) {
                showDialog('info', 'No Data', 'No data available for the selected filters.');
            }
        } catch (error) {
            console.error('Error fetching report data:', error);
            showDialog('danger', 'Error', error.message || 'An error occurred while fetching data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReportData();
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, category]);

    const handleDownloadReport = async () => {
        if (!validateDates()) return;

        if (reportData.length === 0) {
            showDialog('info', 'No Data', 'No data available for the selected filters.');
            return;
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                download: 'true'
            });
            if (category && category !== 'all') {
                params.append('product_category', category);
            }

            const url = `/api/comphand/report?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download Excel file');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', 'Complaint_Handling_Report.xlsx'); // Fallback name

            // Try to extract filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const match = contentDisposition.match(/filename=([^;]+)/);
                if (match && match[1]) {
                    link.setAttribute('download', match[1].trim());
                }
            }

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading report:', error);
            showDialog('danger', 'Error', 'Failed to download report. Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    const totalComplaints = reportData.reduce((sum, item) => sum + (Number(item.totalComplaints) || 0), 0);

    const totalPages = Math.ceil(reportData.length / itemsPerPage);
    const currentData = reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface-bright h-full w-full">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="font-headline-xl text-4xl font-bold text-on-surface mb-2">Complaint Handling Report</h1>
                        <p className="font-body-md text-base text-on-surface-variant">Review and analyze complaint metrics by product category and problem type.</p>
                    </div>
                    <button
                        onClick={handleDownloadReport}
                        className="bg-primary-container text-on-primary hover:bg-primary font-label-md text-sm font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
                        Download Report
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="bg-surface border border-outline-variant rounded-xl p-6 mb-8 shadow-sm">
                    <h3 className="font-headline-md text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">filter_list</span>
                        Filter Criteria
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="font-label-md text-sm font-medium text-on-surface-variant" htmlFor="start-date">Start Date</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">calendar_today</span>
                                <input
                                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-label-md text-sm font-medium text-on-surface-variant" htmlFor="end-date">End Date</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">calendar_today</span>
                                <input
                                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-label-md text-sm font-medium text-on-surface-variant" htmlFor="product-category">Product Category</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">category</span>
                                <select
                                    className="w-full pl-10 pr-10 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                                    id="product-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="all">All Categories</option>
                                    {[...new Set(reportData.map(item => item.productType).filter(Boolean))].map(pt => (
                                        <option key={pt} value={pt}>{pt}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
                        <h3 className="font-headline-md text-lg font-medium text-on-surface">Data Overview</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant">
                                    <th className="p-4 font-label-md text-sm text-on-surface-variant font-semibold">Product Type</th>
                                    <th className="p-4 font-label-md text-sm text-on-surface-variant font-semibold">Problem Type</th>
                                    <th className="p-4 font-label-md text-sm text-on-surface-variant font-semibold text-right">Number of Complaint</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-on-surface-variant font-body-md">Loading...</td>
                                    </tr>
                                ) : currentData.length > 0 ? (
                                    currentData.map((item, index) => (
                                        <tr key={index} className="hover:bg-surface-container-low transition-colors group">
                                            <td className="p-4 font-body-md text-base text-on-surface flex items-center gap-3">{item.productType || '-'}</td>
                                            <td className="p-4 font-body-md text-base text-on-surface">{item.problemType || '-'}</td>
                                            <td className="p-4 font-body-md text-base text-on-surface font-semibold text-right">
                                                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-surface-variant rounded-md group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                                                    {item.totalComplaints || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-on-surface-variant font-body-md">No items found</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-surface-container-low border-t border-outline-variant font-semibold">
                                    <td className="p-4 text-right text-on-surface-variant font-label-md text-sm" colSpan="2">Total Complaints:</td>
                                    <td className="p-4 text-right text-on-surface font-headline-md text-lg">{totalComplaints}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-wrap items-center justify-between gap-4">
                            <span className="text-sm text-on-surface-variant">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, reportData.length)} of {reportData.length} entries
                            </span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-on-surface">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                                >
                                    Next
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmBoxDialog
                isOpen={dialogConfig.isOpen}
                type={dialogConfig.type}
                title={dialogConfig.title}
                message={dialogConfig.message}
                showCancel={false}
                onConfirm={closeDialog}
                confirmText="OK"
            />
        </div>
    );
};

export default CompHandRpt;