import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NewMasterDataLayout from '../../layouts/NewMasterDataLayout';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';
import { useAuth } from '../../context/AuthContext';

const MasterReqIssues = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const location = useLocation();
    const editItem = location.state?.item;
    const isEditMode = !!editItem;

    const [issueCode, setIssueCode] = useState(editItem ? editItem.code : '');
    const [issueName, setIssueName] = useState(editItem ? editItem.name : '');
    const [oldName, setOldName] = useState(editItem ? editItem.name : '');
    const [loading, setLoading] = useState(false);

    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        showCancel: false,
        onConfirm: null,
    });

    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

    const handleSave = async () => {
        // Sanitization
        const sanitizedCode = issueCode.trim().replace(/[^a-zA-Z0-9]/g, '');
        const sanitizedName = issueName.trim().replace(/[^a-zA-Z0-9 \-()]/g, '');

        // Validation
        if (!sanitizedCode || !sanitizedName) {
            setDialog({
                isOpen: true,
                title: 'Validation Error',
                message: 'Inputan belum lengkap',
                type: 'warning',
                showCancel: false,
                onConfirm: null,
            });
            return;
        }

        setLoading(true);

        const payload = {
            code1: sanitizedCode,
            code2: "-",
            name: sanitizedName,
            user_input: user?.user_id || 'system',
            action: "Issue",
            type_prs: isEditMode ? "Edit" : "Add",
            ...(isEditMode && { old_name: oldName })
        };

        try {
            const response = await fetch('/api/comphand/master/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || errData.message || `Gagal request ${isEditMode ? 'Edit' : 'Add'}.`);
            }

            setDialog({
                isOpen: true,
                title: 'Success',
                message: `Data dengan Issues code ${sanitizedCode} berhasil request ${isEditMode ? 'Edit' : 'Add'}.`,
                type: 'success',
                showCancel: false,
                onConfirm: () => {
                    closeDialog();
                    setIssueCode('');
                    setIssueName('');
                    navigate('/operations/comphand/master');
                },
            });
        } catch (err) {
            setDialog({
                isOpen: true,
                title: 'Error',
                message: err.message,
                type: 'danger',
                showCancel: false,
                onConfirm: null,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/operations/comphand/master');
    };

    return (
        <>
            <NewMasterDataLayout
                title={isEditMode ? "Edit Issues" : "Add New Issues"}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            Issues Code
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., ISS-001"
                            value={issueCode}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                if (val.length <= 3) setIssueCode(val);
                            }}
                            disabled={loading || isEditMode}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            Issues Name
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., ATM"
                            value={issueName}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9 \-()]/g, '');
                                setIssueName(val);
                            }}
                            disabled={loading}
                        />
                    </div>
                </div>
            </NewMasterDataLayout>
            <ConfirmBoxDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                showCancel={dialog.showCancel}
                onConfirm={() => {
                    if (dialog.onConfirm) {
                        dialog.onConfirm();
                    } else {
                        closeDialog();
                    }
                }}
                onCancel={closeDialog}
                confirmText="OK"
            />
        </>
    );
};

export default MasterReqIssues;