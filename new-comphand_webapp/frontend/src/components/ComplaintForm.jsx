import React, { useState } from 'react';
import ConfirmBoxDialog from './ConfirmBoxDialog';

const CustomDateInput = ({ id, name, value, onChange, className, disabled, min, max }) => {
    const dateInputRef = React.useRef(null);

    const displayValue = React.useMemo(() => {
        if (!value) return '';
        const [year, month, day] = value.split('-');
        if (!year || !month || !day) return value;
        return `${day}/${month}/${year}`;
    }, [value]);

    const openPicker = () => {
        if (disabled) return;
        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
            try {
                dateInputRef.current.showPicker();
            } catch (e) {
                // ignore
            }
        }
    };

    return (
        <div className={`relative ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={openPicker}>
            <input
                type="text"
                value={displayValue}
                placeholder="DD/MM/YYYY"
                className={`${className} pointer-events-none ${disabled ? 'bg-surface-variant cursor-not-allowed' : 'cursor-pointer'}`}
                readOnly
                disabled={disabled}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_month</span>
            </div>
            <input
                type="date"
                ref={dateInputRef}
                name={name}
                id={id}
                value={value}
                onChange={onChange}
                className={`absolute inset-0 w-full h-full opacity-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={openPicker}
                disabled={disabled}
                min={min}
                max={max}
            />
        </div>
    );
};

const ComplaintForm = ({ initialData, onSubmit, isEditMode = false, formOptions = externalOptions, generateRequestId, existingFiles = {} }) => {
    const [form, setForm] = useState(initialData || {
        channelSource: '',
        requestId: '',
        customerName: '',
        receivedDate: '',
        incidentDate: '',
        completionDate: '',
        incidentCheckbox: false,
        requestType: '',
        atmCardNumber: '',
        settlementNumber: '',
        extensionNumber: '',
        amount: '',
        channel: '',
        location: '',
        city: '',
        branch: '',
        address: '',
        description: '',
        regProduct601: '', regProblem601: '',
        regProduct602: '', regProblem602: '',
        regProduct603: '', regProblem603: '',
        regProduct604: '', regProblem604: '',
        regProduct605: '', regProblem605: '',
    });

    const [files, setFiles] = useState({
        complaint: null,
        resolution: null,
        extension: null,
    });

    const [fileInputKey, setFileInputKey] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ isOpen: false, type: '', message: '', onCloseCallback: null });

    const showFeedback = (type, message, onCloseCallback = null) => {
        setFeedback({ isOpen: true, type, message, onCloseCallback });
    };

    const closeFeedback = () => {
        const callback = feedback.onCloseCallback;
        setFeedback({ isOpen: false, type: '', message: '', onCloseCallback: null });
        if (callback) callback();
    };

    // Use external options if provided, otherwise fallback to hardcoded
    const options = formOptions || {
        comp_types: [
            { code: 'CT01', name: 'WALK IN' },
            { code: 'CT02', name: 'CALL CENTER' },
            { code: 'CT03', name: 'EMAIL' },
        ],
        channels: [
            { code: 'CH01', name: 'ATM' },
            { code: 'CH02', name: 'MOBILE BANKING' },
            { code: 'CH03', name: 'INTERNET BANKING' },
            { code: 'CH04', name: 'OTHER' },
        ],
        cities: [
            { code: 'C01', name: 'JAKARTA' },
            { code: 'C02', name: 'SURABAYA' },
            { code: 'C03', name: 'BANDUNG' },
        ],
        branches: [
            { code: 'B01', name: 'KCU SUDIRMAN' },
            { code: 'B02', name: 'KCP THAMRIN' },
            { code: 'B03', name: 'KCP MENTENG' },
        ],
        request_types: [
            { code: '01', name: 'Customer Query' },
            { code: '02', name: 'Customer Complaint' },
        ],
        code601: [{ code: 'P1', name: 'Tabungan' }, { code: 'P2', name: 'Giro' }],
        code601_info: [{ code: 'I1', name: 'Kartu Tertelan' }, { code: 'I2', name: 'Saldo Berkurang' }],
        code602: [{ code: 'P3', name: 'Deposito' }],
        code602_info: [{ code: 'I3', name: 'Bunga Tidak Sesuai' }],
        code603: [{ code: 'P4', name: 'Kredit' }],
        code603_info: [{ code: 'I4', name: 'Tagihan Ganda' }],
        code604: [{ code: 'P5', name: 'Trade Finance' }],
        code604_info: [{ code: 'I5', name: 'Dokumen Terlambat' }],
        code605: [{ code: 'P6', name: 'Lainnya' }],
        code605_info: [{ code: 'I6', name: 'Lainnya' }],
    };

    const handleChange = async (e) => {
        const { name, value, type, checked } = e.target;
        let processedValue = value;
        if (name === 'atmCardNumber') {
            processedValue = value.replace(/[^0-9]/g, '').slice(0, 16);
        } else if (name === 'customerName' || name === 'address' || name === 'description') {
            processedValue = value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 50);
        } else if (name === 'settlementNumber' || name === 'extensionNumber') {
            processedValue = value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 25);
        }

        setForm((prev) => {
            const newForm = { ...prev, [name]: type === 'checkbox' ? checked : processedValue };
            if (name === 'city') {
                newForm.branch = '';
            }
            return newForm;
        });

        if (name === 'channelSource' && value && !isEditMode) {
            if (generateRequestId) {
                const newId = await generateRequestId(value, showFeedback);
                if (newId) {
                    setForm((prev) => ({ ...prev, requestId: newId }));
                }
            } else {
                // Mock generation fallback
                setForm((prev) => ({ ...prev, requestId: `REQ-${value}-${Math.floor(Math.random() * 10000)}` }));
            }
        }
    };

    const handleFileChange = (name, e) => {
        if (e.target.files.length > 0) {
            setFiles((prev) => ({ ...prev, [name]: e.target.files[0] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit(form, files, showFeedback, setIsSubmitting);
        } else {
            showFeedback('success', 'Complaint Layout Form submitted (Mock).');
        }
    };

    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = getLocalDateString();

    const filteredBranches = options.branches.filter(branch => branch.code === form.branch || (branch.city_code === form.city && !branch.is_deleted));

    return (
        <div className="font-sans w-full px-8 py-10 flex-1">
            <div className="w-full">
                <ConfirmBoxDialog
                    isOpen={feedback.isOpen}
                    type={feedback.type === 'error' ? 'danger' : 'success'}
                    title={feedback.type === 'error' ? 'Attention Needed' : 'Success'}
                    message={feedback.message}
                    showCancel={false}
                    confirmText="OK"
                    onConfirm={closeFeedback}
                />

                {/* Loading Overlay when submitting */}
                {isSubmitting && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface/30 backdrop-blur-sm">
                        <div className="flex flex-col items-center bg-surface p-8 rounded-2xl shadow-xl border border-outline-variant">
                            <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-4">progress_activity</span>
                            <p className="text-on-surface font-semibold text-lg">{isEditMode ? 'Saving Changes...' : 'Submitting Complaint...'}</p>
                            <p className="text-on-surface-variant text-sm mt-2">Please wait, do not close or refresh this page.</p>
                        </div>
                    </div>
                )}

                {/* Main Form Card */}
                <section className="bg-surface rounded-xl border border-outline-variant overflow-hidden mb-12 shadow-none">
                    <div className="p-8">
                        <form className="space-y-10" onSubmit={handleSubmit}>

                            {/* Channel of Complaint */}
                            <div>
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">hub</span> Channel of Complaint
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="channelSource">Channel Of Complaint*</label>
                                        <div className="relative">
                                            <select
                                                name="channelSource"
                                                value={form.channelSource}
                                                onChange={handleChange}
                                                disabled={isEditMode}
                                                className={`w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary ${isEditMode ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-surface'}`}
                                                id="channelSource"
                                            >
                                                <option disabled value="">Select Channel</option>
                                                {options.comp_types.filter(type => !type.is_deleted || type.code === form.channelSource).map((type) => (
                                                    <option key={type.code} value={type.code} hidden={type.is_deleted && type.code !== form.channelSource}>{type.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Request Information */}
                            <div>
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">assignment</span> Request Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="requestId">Request ID*</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal bg-surface-variant text-on-surface-variant outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="requestId"
                                            name="requestId"
                                            type="text"
                                            value={form.requestId}
                                            readOnly
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="customerName">Customer Name*</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="customerName"
                                            name="customerName"
                                            placeholder="Full Legal Name"
                                            type="text"
                                            value={form.customerName}
                                            onChange={handleChange}
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="receivedDate">Received Date</label>
                                            <CustomDateInput
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                id="receivedDate"
                                                name="receivedDate"
                                                value={form.receivedDate}
                                                onChange={handleChange}
                                                max={today}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="incidentDate">Date Of Incident</label>
                                            <CustomDateInput
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                id="incidentDate"
                                                name="incidentDate"
                                                value={form.incidentDate}
                                                onChange={handleChange}
                                                max={today}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="completionDate">Completion Date</label>
                                            <CustomDateInput
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                id="completionDate"
                                                name="completionDate"
                                                value={form.completionDate}
                                                onChange={handleChange}
                                                min={!isEditMode ? today : undefined}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 px-1 justify-center">
                                            <label className="relative inline-flex items-center cursor-pointer" htmlFor="incidentCheckbox">
                                                <input
                                                    className="sr-only peer"
                                                    id="incidentCheckbox"
                                                    name="incidentCheckbox"
                                                    type="checkbox"
                                                    checked={form.incidentCheckbox}
                                                    onChange={handleChange}
                                                />
                                                <div className={`w-10 h-5 rounded-full peer transition-all relative ${form.incidentCheckbox ? 'bg-primary' : 'bg-surface-variant'}`}>
                                                    <div className={`absolute top-[2px] bg-white border border-outline-variant rounded-full h-4 w-4 transition-all ${form.incidentCheckbox ? 'left-[22px]' : 'left-[2px]'}`}></div>
                                                </div>
                                            </label>
                                            <div className="flex flex-col">
                                                <label className="text-base font-semibold text-primary cursor-pointer" htmlFor="incidentCheckbox">Incident</label>
                                                <p className="text-sm font-normal text-on-surface-variant">Status: <span className="font-semibold text-on-surface">{form.incidentCheckbox ? 'Checked' : 'Unchecked'}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Additional Information (Optional) */}
                            <div className="pt-8 border-t border-outline-variant">
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">assignment</span> Additional Information (Optional)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-1 md:col-span-3 mb-2">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="requestType">Type Of Request*</label>
                                        <div className="relative">
                                            <select
                                                name="requestType"
                                                value={form.requestType}
                                                onChange={handleChange}
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal bg-surface outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                id="requestType"
                                            >
                                                <option disabled value="">Select Type</option>
                                                {options.request_types.filter(reqtype => !reqtype.is_deleted || reqtype.code === form.requestType).map((reqtype) => (
                                                    <option key={reqtype.code} value={reqtype.code} hidden={reqtype.is_deleted && reqtype.code !== form.requestType}>{reqtype.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="atmCardNumber">ATM Card Number</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="atmCardNumber"
                                            name="atmCardNumber"
                                            placeholder="Last 4 Digits Or Full"
                                            type="text"
                                            inputMode="numeric"
                                            value={form.atmCardNumber}
                                            onChange={handleChange}
                                            maxLength={16}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="settlementNumber">Settlement Number</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="settlementNumber"
                                            name="settlementNumber"
                                            placeholder="Settlement Ref"
                                            type="text"
                                            value={form.settlementNumber}
                                            onChange={handleChange}
                                            maxLength={25}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="extensionNumber">Extension Number</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="extensionNumber"
                                            name="extensionNumber"
                                            placeholder="Extension (If Any)"
                                            type="text"
                                            value={form.extensionNumber}
                                            onChange={handleChange}
                                            maxLength={25}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Transaction Details */}
                            <div className="pt-8 border-t border-outline-variant">
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">payments</span> Transaction Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="amount">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">Rp</span>
                                            <input
                                                className="w-full h-10 pl-10 pr-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                id="amount"
                                                name="amount"
                                                placeholder="0"
                                                step="0.01"
                                                type="number"
                                                value={form.amount}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Location & Categorization */}
                            <div className="pt-8 border-t border-outline-variant">
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">location_on</span> Location & Categorization
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="channel">Issues</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                                                id="channel"
                                                name="channel"
                                                value={form.channel}
                                                onChange={handleChange}
                                            >
                                                <option disabled value="">Select Issue Type</option>
                                                {options.channels.filter(ch => !ch.is_deleted || ch.code === form.channel).map((ch) => (
                                                    <option key={ch.code} value={ch.code} hidden={ch.is_deleted && ch.code !== form.channel}>{ch.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const selected = options.channels.find(ch => ch.code === form.channel);
                                            const name = selected ? selected.name.toLowerCase() : '';
                                            const isAtm = name.includes('atm');
                                            const isOther = name.includes('other') || name.includes('lain');

                                            if (isAtm) {
                                                return (
                                                    <div className="mt-2 space-y-1">
                                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="location">ATM ID / Location</label>
                                                        <input
                                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                            id="location"
                                                            name="location"
                                                            placeholder="e.g. MASPION"
                                                            type="text"
                                                            value={form.location}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                );
                                            }
                                            if (isOther) {
                                                return (
                                                    <div className="mt-2 space-y-1">
                                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="location">Specify Other</label>
                                                        <input
                                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                            id="location"
                                                            name="location"
                                                            placeholder="Please Specify..."
                                                            type="text"
                                                            value={form.location}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="city">City</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                                                id="city"
                                                name="city"
                                                value={form.city}
                                                onChange={handleChange}
                                            >
                                                <option disabled value="">Select City</option>
                                                {options.cities.filter(city => !city.is_deleted || city.code === form.city).map((city) => (
                                                    <option key={city.code} value={city.code} hidden={city.is_deleted && city.code !== form.city}>{city.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="branch">Branch</label>
                                        <div className="relative">
                                            <select
                                                className={`w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary ${!form.city ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-surface'}`}
                                                id="branch"
                                                name="branch"
                                                value={form.branch}
                                                onChange={handleChange}
                                                disabled={!form.city}
                                            >
                                                <option disabled value="">Select Branch</option>
                                                {filteredBranches.map((branch) => (
                                                    <option key={branch.code} value={branch.code} hidden={branch.is_deleted && branch.code !== form.branch || branch.city_code !== form.city}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="address">Full Address</label>
                                        <input
                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            id="address"
                                            name="address"
                                            placeholder="Residential Or Office Address"
                                            type="text"
                                            value={form.address}
                                            onChange={handleChange}
                                            maxLength={50}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-normal text-on-surface-variant ml-1" htmlFor="description">Detailed Description</label>
                                        <textarea
                                            className="w-full p-4 rounded border border-outline-variant text-base font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                            id="description"
                                            name="description"
                                            placeholder="Explanation Of The Issue"
                                            rows="4"
                                            value={form.description}
                                            onChange={handleChange}
                                            maxLength={50}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Regulatory Reporting */}
                            <div className="pt-8 border-t border-outline-variant">
                                <h3 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined">list_alt</span> Regulatory Reporting
                                </h3>
                                <div className="space-y-6">
                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const labels = [
                                            'Type Of Product And Problem',
                                            'Reporting Period',
                                            'Causes',
                                            'Negative Publication',
                                            'Dispute Resolution'
                                        ];

                                        return (
                                            <div key={num} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-normal text-on-surface-variant ml-1">
                                                        60{num} - {labels[num - 1]} (Product)
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            name={`regProduct60${num}`}
                                                            value={form[`regProduct60${num}`]}
                                                            onChange={handleChange}
                                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                                                        >
                                                            <option value="">Select Product</option>
                                                            {options[`code60${num}`]?.filter(item => !item.is_deleted || item.code === form[`regProduct60${num}`]).map((item) => (
                                                                <option key={item.code} value={item.code} hidden={item.is_deleted && item.code !== form[`regProduct60${num}`]}>
                                                                    {item.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <span className="material-symbols-outlined text-on-surface-variant">unfold_more</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-sm font-normal text-on-surface-variant ml-1">
                                                        60{num} - {labels[num - 1]} (Problem)
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            name={`regProblem60${num}`}
                                                            value={form[`regProblem60${num}`]}
                                                            onChange={handleChange}
                                                            className="w-full h-10 px-4 rounded border border-outline-variant text-base font-normal outline-none appearance-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                                                        >
                                                            <option value="">Select Problem</option>
                                                            {options[`code60${num}_info`]?.filter(item => !item.is_deleted || item.code === form[`regProblem60${num}`]).map((item) => (
                                                                <option key={item.code} value={item.code} hidden={item.is_deleted && item.code !== form[`regProblem60${num}`]}>
                                                                    {item.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <span className="material-symbols-outlined text-on-surface-variant">unfold_more</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 6: Documentation */}
                            <div className="pt-8 border-t border-outline-variant">
                                <h3 className="text-xl font-semibold text-primary mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined">description</span> Documentation
                                </h3>
                                <p className="text-base font-normal text-on-surface-variant mb-8">Please upload relevant PDF documents. Maximum 10MB per file.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['complaint', 'resolution', 'extension'].map((docType) => {
                                        const hasFile = files[docType];
                                        const hasExisting = existingFiles[docType];
                                        const displayFileName = hasFile ? files[docType].name : (hasExisting ? existingFiles[docType].split('/').pop() : 'Click To Upload');
                                        const isActive = hasFile || hasExisting;

                                        return (
                                            <div key={docType} className="space-y-2">
                                                <label className="text-sm font-normal text-on-surface-variant ml-1">
                                                    {docType.charAt(0).toUpperCase() + docType.slice(1)} (PDF)
                                                </label>
                                                <label className={`border-2 border-dashed ${isActive ? 'border-primary' : 'border-outline-variant'} rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer`}>
                                                    <input
                                                        key={fileInputKey}
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf"
                                                        onChange={(e) => handleFileChange(docType, e)}
                                                    />
                                                    <span className={`material-symbols-outlined text-[36px] ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                                                        {docType === 'complaint' ? 'upload_file' : docType === 'resolution' ? 'task' : 'more_time'}
                                                    </span>
                                                    <span className={`text-base ${isActive ? 'text-primary font-semibold' : 'text-on-surface-variant font-normal'} text-center break-all`}>
                                                        {displayFileName}
                                                    </span>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-8 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    <span className="text-sm font-normal">Fields Marked With * Are Mandatory For Audit Compliance.</span>
                                </div>
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 sm:flex-none px-10 h-12 rounded bg-primary text-on-primary font-semibold shadow-none border-none transition-all disabled:opacity-50 hover:bg-primary-container"
                                    >
                                        {isSubmitting ? 'Submitting...' : (isEditMode ? 'Save Changes' : 'Submit Complaint')}
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ComplaintForm;