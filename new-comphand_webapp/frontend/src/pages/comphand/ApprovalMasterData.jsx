import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';

const ApprovalMasterData = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState(''); // 'approve' or 'reject'
    const [selectedItem, setSelectedItem] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/comphand/master_otor/pending', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch pending requests');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenDialog = (item, type) => {
        setSelectedItem(item);
        setDialogType(type);
        setIsDialogOpen(true);
    };

    const handleConfirm = async () => {
        if (!selectedItem) return;
        setIsProcessing(true);
        setIsDialogOpen(false);

        try {
            const url = `/api/comphand/master_otor/${selectedItem.uuid}/${dialogType}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || `Failed to ${dialogType}`);
            }

            // Refresh data
            await fetchData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setSelectedItem(null);
        }
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(data.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="flex-1 p-8 md:p-12 bg-background overflow-y-auto w-full min-h-screen">
            {/* Page Header & Workflow */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-[1440px] mx-auto w-full">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-on-surface-variant font-label-md">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <button
                            onClick={() => navigate('/operations/comphand/approval-queue')}
                            className="hover:underline bg-transparent border-none cursor-pointer p-0 font-label-md"
                        >
                            Back to complaints Queue
                        </button>
                    </div>
                    <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Administrative Configuration Approval</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Review and approve changes to system configurations.</p>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 gap-6 max-w-[1440px] mx-auto w-full">
                {/* Left Column: Request Details & Comparison */}
                <div className="space-y-6">
                    {/* Comparison View */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-headline-md text-headline-md text-on-surface">Comparison View</h3>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-outline-variant">
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Code1</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Name</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Code2</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">User Input</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Action</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Type Process</th>
                                        <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="font-body-md text-body-md">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="py-4 px-4 text-center text-on-surface-variant">Loading...</td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan="7" className="py-4 px-4 text-center text-error">{error}</td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-4 px-4 text-center text-on-surface-variant">No pending requests found.</td>
                                        </tr>
                                    ) : (
                                        currentItems.map((item) => (
                                            <tr key={item.uuid} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 transition-colors">
                                                <td className="py-4 px-4 text-on-surface">{item.code1 || '-'}</td>
                                                <td className="py-4 px-4 text-on-surface-variant">{item.name || '-'}</td>
                                                <td className="py-4 px-4 text-on-surface-variant">{item.code2 || '-'}</td>
                                                <td className="py-4 px-4 text-on-surface-variant">{item.user_input || '-'}</td>
                                                <td className="py-4 px-4 text-on-surface-variant">{item.action || '-'}</td>
                                                <td className="py-4 px-4 text-on-surface-variant">{item.type_prs || '-'}</td>
                                                <td className="py-4 px-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenDialog(item, 'reject')}
                                                            disabled={isProcessing}
                                                            className="px-3 py-1 border border-error text-error hover:bg-error-container rounded text-label-md transition-colors disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDialog(item, 'approve')}
                                                            disabled={isProcessing}
                                                            className="px-3 py-1 bg-primary-container text-on-primary hover:opacity-90 rounded text-label-md flex items-center gap-1 transition-opacity disabled:opacity-50"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                                            Approve
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6">
                                <p className="font-body-md text-on-surface-variant">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, data.length)} of {data.length} entries
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 border border-outline-variant rounded text-on-surface hover:bg-surface-container-lowest disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-label-md text-label-md"
                                    >
                                        Previous
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`px-3 py-1 border rounded transition-colors font-label-md text-label-md ${currentPage === i + 1
                                                ? 'bg-primary text-on-primary border-primary'
                                                : 'border-outline-variant text-on-surface hover:bg-surface-container-lowest'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 border border-outline-variant rounded text-on-surface hover:bg-surface-container-lowest disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-label-md text-label-md"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmBoxDialog
                isOpen={isDialogOpen}
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={handleConfirm}
                type="info"
                title={`Confirm ${dialogType === 'approve' ? 'Approval' : 'Rejection'}`}
                message={selectedItem ? `Apakah yakin ${dialogType === 'approve' ? 'otor' : 'reject'} data master dengan kode ${selectedItem.code1} dan action ${selectedItem.action}?` : ''}
            />
        </div>
    );
};

export default ApprovalMasterData;