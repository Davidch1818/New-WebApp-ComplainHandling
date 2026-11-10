import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NewMasterDataLayout from '../../layouts/NewMasterDataLayout';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';
import { useAuth } from '../../context/AuthContext';

const MasterReq602 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const tab = location.state?.tab || 'product';
    const item = location.state?.item;
    const isEditMode = !!item;

    const typeLabel = tab === 'problem' ? 'Problem' : 'Product';
    const codeLabel = `${typeLabel} 602 Code`;
    const nameLabel = `${typeLabel} 602 Name`;

    const [code, setCode] = useState(item?.code || '');
    const [name, setName] = useState(item?.name || '');
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
        const sanitizedCode = code.trim().replace(/[^a-zA-Z0-9]/g, "");
        const sanitizedName = name.trim().replace(/[^a-zA-Z0-9 \-()]/g, "");

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
            action: tab === 'problem' ? '602Problem' : '602Product',
            type_prs: isEditMode ? "Edit" : "Add"
        };

        if (isEditMode) {
            payload.old_name = item.name;
        }

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
                message: `Data dengan code ${sanitizedCode} berhasil request ${isEditMode ? 'Edit' : 'Add'}.`,
                type: 'success',
                showCancel: false,
                onConfirm: () => {
                    closeDialog();
                    setCode('');
                    setName('');
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
        navigate('/operations/comphand/master/602');
    };

    return (
        <>
            <NewMasterDataLayout
                title={`${isEditMode ? 'Edit' : 'Add New'} ${typeLabel} 602`}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            {codeLabel}
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., 110"
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                const maxLength = tab === 'problem' ? 1 : 3;
                                if (val.length <= maxLength) setCode(val);
                            }}
                            disabled={loading || isEditMode}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            {nameLabel}
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., GIRO"
                            value={name}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9 \-()]/g, '');
                                setName(val);
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

export default MasterReq602;