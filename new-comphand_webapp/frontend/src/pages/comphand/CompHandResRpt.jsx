import React, { useState, useEffect } from 'react';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';

const CompHandResRpt = () => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [allReportData, setAllReportData] = useState([]);
    const [branch, setBranch] = useState('all');
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '' });

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

            const response = await fetch(`/api/comphand/resolution-report?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch report data');
            }

            const result = await response.json();
            const fetchedData = result.data || result || [];

            setAllReportData(fetchedData);

            const branchMap = new Map();
            fetchedData.forEach(item => {
                if (item.branchCode && !branchMap.has(item.branchCode)) {
                    branchMap.set(item.branchCode, {
                        code: item.branchCode,
                        name: item.branchName !== 'Unknown' && item.branchName ? item.branchName : item.branchCode
                    });
                }
            });

            const newBranches = Array.from(branchMap.values()).sort((a, b) => a.code.localeCompare(b.code));
            setBranches(newBranches);

            setBranch(currentBranch => {
                if (currentBranch !== 'all' && !branchMap.has(currentBranch)) {
                    return 'all';
                }
                return currentBranch;
            });

            if (fetchedData.length === 0) {
                showDialog('info', 'No Data', 'No data found for the selected date range.');
            }
        } catch (error) {
            console.error('Error fetching report data:', error);
            showDialog('danger', 'Error', error.message || 'An error occurred while fetching data.');
            setAllReportData([]);
            setBranches([]);
            setBranch('all');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const reportData = branch === 'all'
        ? allReportData
        : allReportData.filter(item => item.branchCode === branch);

    const handleDownload = async () => {
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

            if (branch && branch !== 'all') {
                params.append('branch_code', branch);
            }

            const url = `/api/comphand/resolution-report?${params.toString()}`;

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
            link.setAttribute('download', 'Complaint_Resolution_Report.xlsx');

            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const match = contentDisposition.match(/filename=([^;]+)/);
                if (match && match[1]) {
                    link.setAttribute('download', match[1].replace(/["']/g, ''));
                }
            }

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error('Error downloading report:', error);
            showDialog('danger', 'Error', error.message || 'Failed to download report.');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate totals
    const totalComplaints = reportData.reduce((sum, row) => sum + (Number(row.totalComplaints) || 0), 0);
    const avgResolutionTime = reportData.length > 0
        ? (reportData.reduce((sum, row) => sum + (Number(row.avgResolutionTime) || 0), 0) / reportData.length).toFixed(1)
        : 0;

    return (
        <div className="flex-1 p-4 md:p-[48px] bg-[#FFFFFF] overflow-y-auto min-h-screen text-[#333333]">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-[36px] font-semibold leading-[44px] mb-2">Resolution Handling Report</h1>
                    <p className="text-[18px] font-normal leading-[28px]">Monitor branch performance and resolution efficiency</p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={isLoading}
                    className={`text-[#FFFFFF] text-[14px] font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap
                        ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00A94F] hover:bg-[#008F62]'}`}
                >
                    <span className="material-symbols-outlined">download</span>
                    {isLoading ? 'Processing...' : 'Download Report'}
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-[#FFFFFF] border border-[#E0E0E0] rounded-xl p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold">Start Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-[16px] text-[#333333] outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold">End Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-[16px] text-[#333333] outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold">Branch</label>
                        <div className="relative">
                            <select
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-[16px] text-[#333333] outline-none transition-all appearance-none"
                            >
                                <option value="all">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b.code} value={b.code}>
                                        {b.code} - {b.name}
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#333333] pointer-events-none">expand_more</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-[#FFFFFF] border border-[#E0E0E0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f6f3f2] border-b border-[#E0E0E0]">
                                <th className="text-[14px] font-semibold py-4 px-6">Branch</th>
                                <th className="text-[14px] font-semibold py-4 px-6">Resolution Status</th>
                                <th className="text-[14px] font-semibold py-4 px-6 text-right">Total Complaint</th>
                                <th className="text-[14px] font-semibold py-4 px-6 text-right">Avg. Resolution Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E0E0]">
                            {reportData.length > 0 ? (
                                reportData.map((row, index) => (
                                    <tr key={index} className="hover:bg-[#E0E0E0] transition-colors group">
                                        <td className="py-4 px-6 text-[16px] font-medium">{row.branchCode} {row.branchName && row.branchName !== 'Unknown' ? `- ${row.branchName}` : ''}</td>
                                        <td className="py-4 px-6">
                                            {row.resolutionStatus === 'Resolved' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#85f5c0] text-[#00714d] text-[12px] font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#006d31] mr-1.5"></span>
                                                    Resolved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#fff8e1] text-[#f57f17] border border-[#ffecb3] text-[12px] font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#fbc02d] mr-1.5"></span>
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-[16px] text-right">{row.totalComplaints}</td>
                                        <td className="py-4 px-6 text-[16px] text-right">{row.avgResolutionTime} Days</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-[16px] text-[#757575]">
                                        {isLoading ? 'Loading data...' : 'No data available'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-[#f6f3f2] border-t border-[#E0E0E0]">
                            <tr>
                                <td className="py-4 px-6 text-[14px] font-semibold" colSpan="2">Total / Average</td>
                                <td className="py-4 px-6 text-[14px] font-semibold text-right">{totalComplaints}</td>
                                <td className="py-4 px-6 text-[14px] font-semibold text-right">{avgResolutionTime} Days</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <ConfirmBoxDialog
                isOpen={dialogConfig.isOpen}
                onConfirm={closeDialog}
                type={dialogConfig.type}
                title={dialogConfig.title}
                message={dialogConfig.message}
                showCancel={false}
                confirmText="OK"
            />
        </div>
    );
};

export default CompHandResRpt;