import React, { useState, useEffect } from 'react';
import ComplaintForm from '../../components/ComplaintForm';

const SubmitComplaintPage = () => {
    const [formOptions, setFormOptions] = useState(null);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await fetch('/api/comphand/options/form-data');
                if (response.ok) {
                    const data = await response.json();
                    // Trim all codes and names to prevent trailing whitespace mismatch
                    Object.keys(data).forEach(key => {
                        if (Array.isArray(data[key])) {
                            data[key] = data[key].map(item => ({
                                ...item,
                                code: typeof item.code === 'string' ? item.code.trim() : item.code,
                                name: typeof item.name === 'string' ? item.name.trim() : item.name
                            }));
                        }
                    });
                    setFormOptions(data);
                }
            } catch (err) {
                console.error('Failed to fetch options', err);
            }
        };
        fetchOptions();
    }, []);

    const generateRequestId = async (channelSourceValue, showFeedback) => {
        try {
            const response = await fetch(`/api/comphand/generate-request-id?comp_type=${channelSourceValue}`);
            if (response.ok) {
                const data = await response.json();
                return data.request_id;
            } else {
                if (showFeedback) showFeedback('error', 'Failed to generate Request ID. Please try again.');
                return '';
            }
        } catch (err) {
            if (showFeedback) showFeedback('error', 'Failed to generate Request ID.');
            return '';
        }
    };

    const handleFormSubmit = async (form, files, showFeedback, setIsSubmitting) => {
        if (!form.channelSource) return showFeedback('error', 'Channel Of Complaint Is Required.');
        if (!form.requestId) return showFeedback('error', 'Request ID is missing. Please select Channel Of Complaint again.');
        if (!form.requestType) return showFeedback('error', 'Type Of Request Is Required.');
        if (!form.customerName.trim()) return showFeedback('error', 'Customer Name Is Required.');
        if (!form.amount || parseFloat(form.amount) < 0) return showFeedback('error', 'Valid Amount Is Required.');
        if (!form.city) return showFeedback('error', 'City Is Required.');
        if (!form.branch) return showFeedback('error', 'Branch Is Required.');
        if (!form.atmCardNumber.trim()) return showFeedback('error', 'ATM Card Number Is Required.');
        if (!form.description.trim()) return showFeedback('error', 'Description Is Required.');
        if (!form.receivedDate) return showFeedback('error', 'Received Date Is Required.');
        if (!form.incidentDate) return showFeedback('error', 'Incident Date Is Required.');
        if (!form.channel) return showFeedback('error', 'Channel (Issue) Is Required.');
        if (!files.complaint) return showFeedback('error', 'Complaint (Pengaduan) File Is Required.');

        if (new Date(form.receivedDate) < new Date(form.incidentDate)) {
            return showFeedback('error', 'Received date tidak dapat lebih awal dari Incident date');
        }

        if (form.completionDate && (new Date(form.completionDate) < new Date(form.incidentDate) || new Date(form.completionDate) < new Date(form.receivedDate))) {
            return showFeedback('error', 'Completion date must later than incident date');
        }

        // Validation using either dynamic or hardcoded channels from the form data
        const activeOptions = formOptions || {}; // In reality, we'd want to look up from formOptions if available
        const channels = activeOptions.channels || [];
        const selectedChannelObj = channels.find(ch => ch.code === form.channel);
        const selectedChannelName = selectedChannelObj ? selectedChannelObj.name.toLowerCase() : '';

        if (selectedChannelName.includes('atm') && !form.location.trim()) {
            return showFeedback('error', 'ATM ID / Location is mandatory for ATM channel.');
        }

        if (form.settlementNumber && !files.resolution) {
            return showFeedback('error', 'Resolution file is required if settlement number is provided.');
        }
        if (files.resolution && !form.settlementNumber) {
            return showFeedback('error', 'Settlement number is required if resolution file is provided.');
        }

        if (form.extensionNumber && !files.extension) {
            return showFeedback('error', 'Extension file is required if extension number is provided.');
        }
        if (files.extension && !form.extensionNumber) {
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

            formData.append('complaint_file', files.complaint);
            if (files.resolution) formData.append('resolution_file', files.resolution);
            if (files.extension) formData.append('extension_file', files.extension);

            const response = await fetch('/api/comphand/complaints/comp_otor', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Submission Failed.');
            }

            const result = await response.json();
            showFeedback('success', result.message || `Complaint ${form.requestId} Submitted Successfully.`, () => {
                setFormKey(prev => prev + 1);
            });
        } catch (err) {
            showFeedback('error', err.message || 'Submission Failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ComplaintForm
            key={formKey}
            onSubmit={handleFormSubmit}
            isEditMode={false}
            formOptions={formOptions}
            generateRequestId={generateRequestId}
        />
    );
};

export default SubmitComplaintPage;