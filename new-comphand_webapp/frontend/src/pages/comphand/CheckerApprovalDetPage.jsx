import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';

const CheckerApprovalDetPage = () => {
    const { request_id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: 'warning',
        title: '',
        message: '',
        isAlert: false,
        onConfirm: () => { }
    });

    const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

    const showAlert = (isSuccess, msg, redirectPath = null) => {
        setDialogState({
            isOpen: true,
            type: isSuccess ? 'success' : 'danger',
            title: isSuccess ? 'Success' : 'Error',
            message: msg,
            isAlert: true,
            onConfirm: () => {
                closeDialog();
                if (redirectPath) navigate(redirectPath);
            }
        });
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`/api/comphand/complaints/comp_otor/${request_id}`);
                if (!response.ok) throw new Error('Failed to fetch data');
                const result = await response.json();
                setData(result.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (request_id) {
            fetchDetail();
        }
    }, [request_id]);

    const handleApprove = () => {
        setDialogState({
            isOpen: true,
            type: 'info',
            title: 'Confirm Approval',
            message: `Apakah yakin otor data complain dengan request id ${data?.request_id || '...'}?`,
            isAlert: false,
            onConfirm: async () => {
                closeDialog();
                setIsApproving(true);
                try {
                    const res = await fetch(`/api/comphand/complaints/comp_otor/${request_id}/approve`, {
                        method: 'POST'
                    });
                    const result = await res.json();
                    if (res.ok) {
                        showAlert(true, result.message || 'Request approved successfully.', '/operations/comphand/approval');
                    } else {
                        showAlert(false, `Error: ${result.detail || 'Failed to approve'}`);
                    }
                } catch (err) {
                    showAlert(false, `Error: ${err.message}`);
                } finally {
                    setIsApproving(false);
                }
            }
        });
    };

    const handleReject = () => {
        setDialogState({
            isOpen: true,
            type: 'danger',
            title: 'Confirm Rejection',
            message: `Apakah yakin menolak otor data complain dengan request id ${data?.request_id || '...'}?`,
            isAlert: false,
            onConfirm: async () => {
                closeDialog();
                setIsRejecting(true);
                try {
                    const res = await fetch(`/api/comphand/complaints/comp_otor/${request_id}/reject`, {
                        method: 'POST'
                    });
                    const result = await res.json();
                    if (res.ok) {
                        showAlert(true, result.message || 'Request rejected successfully.', '/operations/comphand/approval');
                    } else {
                        showAlert(false, `Error: ${result.detail || 'Failed to reject'}`);
                    }
                } catch (err) {
                    showAlert(false, `Error: ${err.message}`);
                } finally {
                    setIsRejecting(false);
                }
            }
        });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-on-surface-variant">Loading data...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-error">Error: {error || 'Data not found'}</p>
            </div>
        );
    }

    return (
        <div className="font-body-md overflow-x-hidden min-h-screen bg-background text-on-surface">
            <main className="max-w-[1440px] mx-auto p-gutter lg:p-margin-desktop flex flex-col gap-lg">

                {/* Header Section */}
                <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-headline-xl font-headline-xl text-on-surface">Verification Queue</h1>
                        <p className="text-body-md text-on-surface-variant">
                            Request ID: <span className="font-bold text-primary">{data.request_id}</span>
                        </p>
                    </div>
                </section>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-12 gap-gutter">

                    {/* Left Column: Detailed Submission Overview */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">

                        {/* Reference Info Section */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined" data-icon="assignment">assignment</span>
                                    Reference Info
                                </h3>
                                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-label-sm">
                                    In Verification
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Request ID</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.request_id}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Received Date</span>
                                    <span className="text-body-md font-bold text-on-surface">{formatDate(data.received_date)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Date of Incident</span>
                                    <span className="text-body-md font-bold text-on-surface">{formatDate(data.incident_date)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Completion Date</span>
                                    <span className="text-body-md font-bold text-on-surface">{formatDate(data.completion_date)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Incident Status</span>
                                    <span className="text-body-md font-bold text-primary">{data.status}</span>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Transaction Section */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined" data-icon="payments">payments</span>
                                Customer &amp; Transaction
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">Customer Name</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.customer_name}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">ATM Card Number</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.atm_card_number}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">Amount</span>
                                    <span className="text-body-md font-bold text-primary">{formatCurrency(data.amount)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">Channel</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.channel}</span>
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined" data-icon="location_on">location_on</span>
                                Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">City</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.city}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">Branch</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.branch}</span>
                                </div>
                                <div className="flex flex-col gap-1 lg:col-span-2">
                                    <span className="text-label-sm text-on-surface-variant">Specific Location</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.location || '-'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-label-sm text-on-surface-variant">Full Address</span>
                                <span className="text-body-md font-bold text-on-surface">{data.address || '-'}</span>
                            </div>
                        </div>

                        {/* Issue Description Section */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-headline-md font-headline-md text-primary mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined" data-icon="error_outline">error_outline</span>
                                Issue Description
                            </h3>
                            <div className="bg-surface-container-low p-4 rounded-lg">
                                <p className="text-body-md text-on-surface leading-relaxed">
                                    {data.description || '-'}
                                </p>
                            </div>
                        </div>

                        {/* Regulatory Reporting */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined" data-icon="gavel">gavel</span>
                                Regulatory Reporting
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">601 - Product</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_product_601 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">601 - Problem</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_problem_601 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">602 - Product</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_product_602 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">602 - Problem</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_problem_602 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">603 - Product</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_product_603 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">603 - Problem</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_problem_603 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">604 - Product</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_product_604 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">604 - Problem</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_problem_604 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">605 - Product</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_product_605 || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-label-sm text-on-surface-variant">605 - Problem</span>
                                    <span className="text-body-md font-bold text-on-surface">{data.reg_problem_605 || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attachments Section */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined" data-icon="perm_media">attach_file</span>
                                Supporting Documentation
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.complaint_file_path && (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-label-sm text-on-surface-variant">Customer Complaint's Form</span>
                                        <a
                                            href={`/api/comphand/download?filepath=${encodeURIComponent(data.complaint_file_path)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-4 p-3 rounded-lg border border-outline hover:bg-surface-container-low transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded bg-error-container flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-error" data-icon="picture_as_pdf">picture_as_pdf</span>
                                            </div>
                                            <span className="text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                                {data.complaint_file_path.split('/').pop()}
                                            </span>
                                        </a>
                                    </div>
                                )}
                                {data.resolution_file_path && (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-label-sm text-on-surface-variant">Completion</span>
                                        <a
                                            href={`/api/comphand/download?filepath=${encodeURIComponent(data.resolution_file_path)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-4 p-3 rounded-lg border border-outline hover:bg-surface-container-low transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-primary" data-icon="description">description</span>
                                            </div>
                                            <span className="text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                                {data.resolution_file_path.split('/').pop()}
                                            </span>
                                        </a>
                                    </div>
                                )}
                                {data.extension_file_path && (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-label-sm text-on-surface-variant">Extension Document</span>
                                        <a
                                            href={`/api/comphand/download?filepath=${encodeURIComponent(data.extension_file_path)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-4 p-3 rounded-lg border border-outline hover:bg-surface-container-low transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-secondary" data-icon="more_time">more_time</span>
                                            </div>
                                            <span className="text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                                {data.extension_file_path.split('/').pop()}
                                            </span>
                                        </a>
                                    </div>
                                )}
                                {!data.complaint_file_path && !data.resolution_file_path && !data.extension_file_path && (
                                    <p className="text-on-surface-variant col-span-full">No documents attached.</p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sidebar Actions */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">

                        {/* Action Panel */}
                        <div className="bg-primary text-white shadow-xl rounded-xl p-6 sticky top-24">
                            <h3 className="text-headline-md font-headline-md mb-6">Checker Decision</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleApprove}
                                        className="flex-1 h-12 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary-container transition-colors shadow-lg active:scale-95 duration-150"
                                        disabled={isApproving}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                        Approve
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="flex-1 h-12 bg-error text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-error/80 transition-colors active:scale-95 duration-150"
                                        disabled={isRejecting}
                                    >
                                        <span className="material-symbols-outlined text-[18px]" data-icon="cancel">cancel</span>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Maker Info */}
                        <div className="bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl p-6">
                            <h3 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-4">Submission Metadata</h3>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary" data-icon="person">person</span>
                                </div>
                                <p className="text-body-sm font-bold text-on-surface">{data.user_input || 'Unknown Maker'}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-label-sm text-on-surface-variant">Processing Time</span>
                                    <span className="text-label-sm font-bold text-primary">{data.aging} days</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>

            <ConfirmBoxDialog
                isOpen={dialogState.isOpen}
                type={dialogState.type}
                title={dialogState.title}
                message={dialogState.message}
                showCancel={!dialogState.isAlert}
                onCancel={closeDialog}
                onConfirm={dialogState.onConfirm}
                confirmText={dialogState.isAlert ? 'OK' : 'Confirm'}
            />
        </div>
    );
};

export default CheckerApprovalDetPage;