import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

/*
 * Complaint Detail - Professional Refined Mobile
 * Based on Stitch UI & BMAS / DESIGN.md
 */

const STATUS_STYLES = {
    'In Progress': 'bg-secondary-container text-on-secondary-container',
    'Extend': 'bg-[#fef3c7] text-[#92400e]',
    'Completed': 'bg-surface-container-high text-on-surface-variant',
};

const formatDate = (isostring) => {
    if (!isostring) return '-';
    const date = new Date(isostring);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAmount = (amount) => {
    if (amount == null) return '-';
    return Number(amount).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '-';
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.length <= 4) return cardNumber;
    return `**** **** **** ${clean.slice(-4)}`;
};

const ComplaintDetailPage = () => {
    const { request_id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const fromPath = location.state?.from || '/operations/comphand/list-complain';

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/comphand/complaints/${request_id}`);
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.detail || `Error ${response.status}`);
                }
                const result = await response.json();
                setComplaint(result.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [request_id]);

    const handleDownload = (filePath) => {
        if (!filePath) return;
        // Add a cache-busting timestamp so the browser always fetches the latest file
        const timestamp = new Date().getTime();
        window.open(`/api/comphand/download?filepath=${encodeURIComponent(filePath)}&_t=${timestamp}`, '_blank');
    };

    const getFileName = (filePath) => {
        if (!filePath) return '';
        return filePath.split('/').pop();
    };

    const regulatoryRows = complaint ? [
        { label: '601 - Type of Product/Problem', product: complaint.reg_product_601, problem: complaint.reg_problem_601 },
        { label: '602 - Reporting Period', product: complaint.reg_product_602, problem: complaint.reg_problem_602 },
        { label: '603 - Causes', product: complaint.reg_product_603, problem: complaint.reg_problem_603 },
        { label: '604 - Negative Publication', product: complaint.reg_product_604, problem: complaint.reg_problem_604 },
        { label: '605 - Dispute Resolution', product: complaint.reg_product_605, problem: complaint.reg_problem_605 },
    ] : [];

    const documents = complaint ? [
        { label: 'Complaint File', path: complaint.complaint_file_path },
        { label: 'Resolution File', path: complaint.resolution_file_path },
        { label: 'Extension File', path: complaint.extension_file_path },
    ].filter(d => !!d.path) : [];

    const statusStyle = complaint
        ? (STATUS_STYLES[complaint.status] || 'bg-surface-container-high text-on-surface-variant')
        : '';

    return (
        <div className="bg-background text-on-surface min-h-screen flex flex-col font-sans">
            {/* — TopAppBar — */}
            <header className="flex justify-between items-center w-full px-4 h-16 sticky top-0 z-40 bg-primary shadow-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(fromPath)}
                        className="material-symbols-outlined text-white hover:bg-white/20 transition-colors p-2 rounded-full"
                    >
                        arrow_back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-white m-0">
                        Ticket #{complaint?.request_id || '...'}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {complaint?.user_input && (
                        <span className="text-xs font-medium text-white/80 hidden md:inline">
                            Maker: <span className="font-semibold text-white">{complaint.user_input}</span>
                        </span>
                    )}
                    {complaint?.user_otor && (
                        <span className="text-xs font-medium text-white/80 hidden md:inline">
                            Approved by: <span className="font-semibold text-white">{complaint.user_otor}</span>
                        </span>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* — Main Canvas — */}
                <div className="flex-1 flex flex-col border-outline-variant bg-surface-container-lowest">

                    {/* Status Picker Bar */}
                    <div className="p-4 border-b border-outline-variant flex items-center justify-between sticky top-0 z-10 bg-white/70 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-on-surface-variant">CURRENT STATUS:</span>
                            {loading ? (
                                <div className="h-7 w-28 rounded-full bg-surface-container-high animate-pulse" />
                            ) : complaint ? (
                                <div className="relative group">
                                    <button className={`flex items-center gap-2 px-4 py-1 rounded-full text-xs font-bold shadow-sm ${statusStyle}`}>
                                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            fiber_manual_record
                                        </span>
                                        {complaint.status || '-'}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                        {complaint && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${complaint.classification === 'Incident'
                                    ? 'bg-error-container/10 text-tertiary border-error/20'
                                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                                }`}>
                                {complaint.classification}
                            </span>
                        )}
                    </div>

                    {/* — Loading State — */}
                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                            <span className="material-symbols-outlined text-5xl text-primary animate-spin" style={{ animationDuration: '1s' }}>
                                progress_activity
                            </span>
                            <p className="text-sm text-on-surface-variant">Loading complaint details...</p>
                        </div>
                    )}

                    {/* — Error State — */}
                    {!loading && error && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                            <div className="p-6 rounded-xl border border-error/30 bg-error-container/10 max-w-md w-full text-center">
                                <span className="material-symbols-outlined text-4xl text-error mb-2 block">error</span>
                                <p className="font-bold text-error mb-1">Failed to load complaint</p>
                                <p className="text-sm text-on-surface-variant">{error}</p>
                                <button
                                    onClick={() => navigate(fromPath)}
                                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
                                >
                                    Back to List
                                </button>
                            </div>
                        </div>
                    )}

                    {/* — Content — */}
                    {!loading && !error && complaint && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                            <div className="space-y-8">

                                {/* Section 1: Request Information */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">assignment</span> Request Information
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Request ID</span>
                                            <span className="font-bold text-sm">{complaint.request_id}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Received Date</span>
                                            <span className="text-sm">{formatDate(complaint.received_date)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Date of Incident</span>
                                            <span className="text-sm">{formatDate(complaint.incident_date)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Completion Date</span>
                                            <span className="text-sm">{formatDate(complaint.completion_date)}</span>
                                        </div>
                                        <div className="flex flex-col col-span-2 md:col-span-4">
                                            <span className="text-xs text-on-surface-variant mb-1">Classification</span>
                                            <span className={`font-bold text-sm ${complaint.classification === 'Incident' ? 'text-tertiary' : 'text-error'}`}>
                                                {complaint.classification}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Additional Information */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">info</span> Additional Information
                                    </h3>
                                    <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Type of Request</span>
                                            <span className="text-sm">{complaint.request_type || '-'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 3: Customer & Transaction Details */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">payments</span> Customer &amp; Transaction
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Customer Name</span>
                                            <span className="text-sm">{complaint.customer_name}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">ATM Card Number</span>
                                            <span className="text-sm font-mono">{maskCardNumber(complaint.atm_card_number)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Amount (Rp)</span>
                                            <span className="text-sm font-semibold">{formatAmount(complaint.amount)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Channel</span>
                                            <span className="text-sm">{complaint.channel || '-'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 4: Location & Branch */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">location_on</span> Location &amp; Branch
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">City</span>
                                            <span className="text-sm">{complaint.city || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-on-surface-variant mb-1">Branch</span>
                                            <span className="text-sm">{complaint.branch || '-'}</span>
                                        </div>
                                        <div className="flex flex-col md:col-span-2">
                                            <span className="text-xs text-on-surface-variant mb-1">Full Address</span>
                                            <span className="text-sm">{complaint.address || '-'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 5: Issue Description */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">description</span> Issue Description
                                    </h3>
                                    <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <p className="text-sm m-0 leading-relaxed whitespace-pre-wrap">
                                            {complaint.description || '-'}
                                        </p>
                                    </div>
                                </section>

                                {/* Section 6: Regulatory Reporting (OJK) */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">list_alt</span> Regulatory Reporting (OJK)
                                    </h3>
                                    <div className="space-y-2 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                                        <div className="grid grid-cols-12 gap-4 border-b border-outline-variant pb-3 mb-3">
                                            <div className="col-span-6 text-xs font-bold text-outline uppercase tracking-wider">Field</div>
                                            <div className="col-span-3 text-xs font-bold text-outline uppercase tracking-wider">Product</div>
                                            <div className="col-span-3 text-xs font-bold text-outline uppercase tracking-wider">Problem</div>
                                        </div>
                                        <div className="space-y-3">
                                            {regulatoryRows.map((row, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-4 items-start">
                                                    <div className="col-span-6 text-sm font-medium">{row.label}</div>
                                                    <div className="col-span-3 text-sm text-on-surface-variant">{row.product || '-'}</div>
                                                    <div className="col-span-3 text-sm text-on-surface-variant">{row.problem || '-'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* Section 7: Documentation */}
                                <section className="space-y-4">
                                    <h3 className="text-lg text-primary flex items-center gap-2 font-bold m-0">
                                        <span className="material-symbols-outlined">folder_open</span> Documentation
                                    </h3>
                                    {documents.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm text-on-surface-variant">
                                            No documents attached.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {documents.map((doc, i) => (
                                                <div
                                                    key={i}
                                                    className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between hover:border-primary transition-all group cursor-pointer shadow-sm"
                                                    onClick={() => handleDownload(doc.path)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded bg-error-container/20 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold truncate">{doc.label}</span>
                                                            <span className="text-[10px] text-outline mt-1 truncate">{getFileName(doc.path)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="text-primary material-symbols-outlined p-2 hover:bg-surface-container rounded-full transition-colors border-none bg-transparent flex-shrink-0"
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(doc.path); }}
                                                        title="Download"
                                                    >
                                                        download
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* — BottomNavBar (Mobile Only) — */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 pb-safe bg-surface-container-lowest border-t border-outline-variant shadow-lg">
                <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 border-none bg-transparent">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="text-xs mt-1 font-medium">Dashboard</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 border-none">
                    <span className="material-symbols-outlined">confirmation_number</span>
                    <span className="text-xs mt-1 font-medium">Tickets</span>
                </button>
                <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 border-none bg-transparent">
                    <span className="material-symbols-outlined">add_circle</span>
                    <span className="text-xs mt-1 font-medium">Submit</span>
                </button>
                <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 border-none bg-transparent">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-xs mt-1 font-medium">Settings</span>
                </button>
            </nav>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bfc9c1; border-radius: 10px; }
      `}} />
        </div>
    );
};

export default ComplaintDetailPage;
