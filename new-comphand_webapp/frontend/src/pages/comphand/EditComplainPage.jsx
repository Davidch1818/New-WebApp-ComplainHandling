import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ComplaintForm from '../../components/ComplaintForm';

const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date)) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const EditComplainPage = () => {
    const { request_id } = useParams();
    const navigate = useNavigate();
    const [formOptions, setFormOptions] = useState(null);
    const [initialData, setInitialData] = useState(null);
    const [existingFiles, setExistingFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch form options
                const optionsResponse = await fetch('/api/comphand/options/form-data?include_deleted=true');
                let options = null;
                if (optionsResponse.ok) {
                    options = await optionsResponse.json();
                    // Trim all codes and names to prevent trailing whitespace mismatch
                    Object.keys(options).forEach(key => {
                        if (Array.isArray(options[key])) {
                            options[key] = options[key].map(item => ({
                                ...item,
                                code: typeof item.code === 'string' ? item.code.trim() : item.code,
                                name: typeof item.name === 'string' ? item.name.trim() : item.name
                            }));
                        }
                    });
                    setFormOptions(options);
                }

                // Fetch complaint details
                const detailResponse = await fetch(`/api/comphand/complaints/${request_id}`);
                if (!detailResponse.ok) {
                    throw new Error('Failed to fetch complaint details');
                }
                const result = await detailResponse.json();
                const data = result.data;

                // Determine if channel is returned as name or code
                // and map it to code if necessary based on options
                let mappedChannelCode = data.channel_code || data.channel || '';
                if (options && options.channels) {
                    const channelFoundByName = options.channels.find(ch => ch.name.toLowerCase() === mappedChannelCode.toLowerCase());
                    if (channelFoundByName) {
                        mappedChannelCode = channelFoundByName.code;
                    }
                }

                let mappedCityCode = data.city_code || data.city || '';
                if (options && options.cities) {
                    const cityFound = options.cities.find(c => c.name.toLowerCase() === mappedCityCode.toLowerCase());
                    if (cityFound) {
                        mappedCityCode = cityFound.code;
                    }
                }

                let mappedBranchCode = data.branch_code || data.branch || '';
                if (options && options.branches) {
                    const branchFound = options.branches.find(b => b.name.toLowerCase() === mappedBranchCode.toLowerCase());
                    if (branchFound) {
                        mappedBranchCode = branchFound.code;
                    }
                }

                let mappedRequestType = data.request_type_code || data.request_type || '';
                if (options && options.request_types && !data.request_type_code) {
                    const reqTypeFound = options.request_types.find(r => r.name.toLowerCase() === mappedRequestType.toLowerCase());
                    if (reqTypeFound) {
                        mappedRequestType = reqTypeFound.code;
                    }
                }

                let mappedChannelSource = data.channel_source || '';
                if (options && options.comp_types) {
                    const sourceFoundByName = options.comp_types.find(ct => ct.name.trim().toLowerCase() === mappedChannelSource.trim().toLowerCase());
                    if (sourceFoundByName) {
                        mappedChannelSource = sourceFoundByName.code;
                    } else {
                        const sourceFoundByCode = options.comp_types.find(ct => ct.code.trim().toLowerCase() === mappedChannelSource.trim().toLowerCase());
                        if (sourceFoundByCode) {
                            mappedChannelSource = sourceFoundByCode.code;
                        }
                    }
                }

                setInitialData({
                    channelSource: mappedChannelSource,
                    requestId: data.request_id || '',
                    customerName: data.customer_name || '',
                    receivedDate: formatDateForInput(data.received_date),
                    incidentDate: formatDateForInput(data.incident_date),
                    completionDate: formatDateForInput(data.completion_date),
                    incidentCheckbox: data.classification === 'Incident' || data.incident_checkbox === 'Y',
                    requestType: mappedRequestType,
                    atmCardNumber: data.atm_card_number || '',
                    settlementNumber: data.settlement_number || '',
                    extensionNumber: data.extension_number || '',
                    amount: data.amount || '',
                    channel: mappedChannelCode,
                    location: data.location || '',
                    city: mappedCityCode,
                    branch: mappedBranchCode,
                    address: data.address || '',
                    description: data.description || '',
                    regProduct601: data.reg_product_601_code || data.reg_product_601 || '', regProblem601: data.reg_problem_601_code || data.reg_problem_601 || '',
                    regProduct602: data.reg_product_602_code || data.reg_product_602 || '', regProblem602: data.reg_problem_602_code || data.reg_problem_602 || '',
                    regProduct603: data.reg_product_603_code || data.reg_product_603 || '', regProblem603: data.reg_problem_603_code || data.reg_problem_603 || '',
                    regProduct604: data.reg_product_604_code || data.reg_product_604 || '', regProblem604: data.reg_problem_604_code || data.reg_problem_604 || '',
                    regProduct605: data.reg_product_605_code || data.reg_product_605 || '', regProblem605: data.reg_problem_605_code || data.reg_problem_605 || ''
                });

                setExistingFiles({
                    complaint: data.complaint_file_path || null,
                    resolution: data.resolution_file_path || null,
                    extension: data.extension_file_path || null
                });

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (request_id) {
            fetchData();
        }
    }, [request_id]);

    const handleFormSubmit = async (form, files, showFeedback, setIsSubmitting) => {
        // Validations (Editable fields mostly)
        if (!form.requestType) return showFeedback('error', 'Type Of Request Is Required.');
        if (!form.amount || parseFloat(form.amount) < 0) return showFeedback('error', 'Valid Amount Is Required.');
        if (!form.atmCardNumber.trim()) return showFeedback('error', 'ATM Card Number Is Required.');
        if (!form.description.trim()) return showFeedback('error', 'Description Is Required.');

        if (new Date(form.receivedDate) < new Date(form.incidentDate)) {
            return showFeedback('error', 'Received date tidak dapat lebih awal dari Incident date');
        }

        if (form.completionDate && (new Date(form.completionDate) < new Date(form.incidentDate) || new Date(form.completionDate) < new Date(form.receivedDate))) {
            return showFeedback('error', 'Completion date must later than incident date');
        }

        const activeOptions = formOptions || {};
        const channels = activeOptions.channels || [];
        const selectedChannelObj = channels.find(ch => ch.code === form.channel);
        const selectedChannelName = selectedChannelObj ? selectedChannelObj.name.toLowerCase() : '';

        if (selectedChannelName.includes('atm') && !form.location.trim()) {
            return showFeedback('error', 'ATM ID / Location is mandatory for ATM channel.');
        }

        // File constraints with existing files
        if (form.settlementNumber && !files.resolution && !existingFiles.resolution) {
            return showFeedback('error', 'Resolution file is required if settlement number is provided.');
        }
        if ((files.resolution || existingFiles.resolution) && !form.settlementNumber) {
            return showFeedback('error', 'Settlement number is required if resolution file is provided.');
        }
        if (form.extensionNumber && !files.extension && !existingFiles.extension) {
            return showFeedback('error', 'Extension file is required if extension number is provided.');
        }
        if ((files.extension || existingFiles.extension) && !form.extensionNumber) {
            return showFeedback('error', 'Extension number is required if extension file is provided.');
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('request_id', form.requestId);
            formData.append('customer_name', form.customerName);
            formData.append('amount', form.amount);
            formData.append('city_code', form.city);
            formData.append('branch_code', form.branch);
            formData.append('atm_card_number', form.atmCardNumber);
            formData.append('description', form.description);
            formData.append('received_date', form.receivedDate);
            formData.append('incident_date', form.incidentDate);
            formData.append('completion_date', form.completionDate);
            formData.append('channel_code', form.channel);

            formData.append('incident_checkbox', form.incidentCheckbox ? 'Y' : 'N');
            formData.append('request_type', form.requestType);
            formData.append('channel_source', form.channelSource);
            formData.append('location', form.location);
            formData.append('address', form.address);

            formData.append('settlement_number', form.settlementNumber);
            formData.append('extension_number', form.extensionNumber);

            for (let i = 1; i <= 5; i++) {
                formData.append(`reg_product_60${i}`, form[`regProduct60${i}`]);
                formData.append(`reg_problem_60${i}`, form[`regProblem60${i}`]);
            }

            // Only append if there are newly selected files
            if (files.complaint) formData.append('complaint_file', files.complaint);
            if (files.resolution) formData.append('resolution_file', files.resolution);
            if (files.extension) formData.append('extension_file', files.extension);

            // Using PUT to the specific resource endpoint based on user feedback
            const response = await fetch(`/api/comphand/complaints/${form.requestId}`, {
                method: 'PUT',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = errorData.detail || 'Update Failed.';
                if (errorMessage.toLowerCase().includes('already pending in authorization queue')) {
                    errorMessage = 'this req id complain already requested for "Add" or "Edit" or Delete';
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            showFeedback('success', result.message || `Complaint ${form.requestId} Updated Successfully.`, () => {
                navigate('/operations/comphand/list-edit-del');
            });

        } catch (err) {
            showFeedback('error', err.message || 'Update Failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-on-surface h-full min-h-screen">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin" style={{ animationDuration: '1s' }}>
                    progress_activity
                </span>
                <p className="mt-4 text-sm text-on-surface-variant font-medium">Loading complaint data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-on-surface h-full min-h-screen">
                <div className="p-6 rounded-xl border border-error/30 bg-error-container/10 max-w-md w-full text-center">
                    <span className="material-symbols-outlined text-4xl text-error mb-2 block">error</span>
                    <p className="font-bold text-error mb-1">Failed to load data</p>
                    <p className="text-sm text-on-surface-variant mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/operations/comphand/list-edit-del')}
                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Back to List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="flex justify-between items-center w-full px-4 h-16 sticky top-0 z-40 bg-surface border-b border-outline-variant">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/operations/comphand/list-edit-del')}
                        className="material-symbols-outlined text-primary hover:bg-surface-container transition-colors p-2 rounded-full"
                    >
                        arrow_back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-primary m-0">
                        Edit Complaint
                    </h1>
                </div>
            </header>
            <ComplaintForm
                initialData={initialData}
                existingFiles={existingFiles}
                onSubmit={handleFormSubmit}
                isEditMode={true}
                formOptions={formOptions}
            />
        </div>
    );
};

export default EditComplainPage;