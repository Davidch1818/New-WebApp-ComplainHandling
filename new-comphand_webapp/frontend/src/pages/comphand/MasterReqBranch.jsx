import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NewMasterDataLayout from '../../layouts/NewMasterDataLayout';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';
import { useAuth } from '../../context/AuthContext';

const MasterReqBranch = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const location = useLocation();
    const editItem = location.state?.item;
    const isEditMode = !!editItem;

    const [branchCode, setBranchCode] = useState(editItem ? editItem.code : '');
    const [branchName, setBranchName] = useState(editItem ? editItem.name : '');
    const [cityCode, setCityCode] = useState(editItem ? (editItem.city_code || '') : '');
    const [oldName, setOldName] = useState(editItem ? editItem.name : '');
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState([]);

    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        showCancel: false,
        onConfirm: null,
    });

    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await fetch('/api/comphand/options/form-data');
                if (!response.ok) throw new Error('Failed to fetch cities');
                const data = await response.json();
                setCities(data.cities || []);
            } catch (error) {
                console.error("Error fetching cities:", error);
            }
        };
        fetchCities();
    }, []);

    const handleSave = async () => {
        // Sanitization
        const sanitizedCode = branchCode.trim().replace(/\D/g, ""); // numbers only
        const sanitizedName = branchName.trim().replace(/[^a-zA-Z0-9 \-()]/g, ""); // valid chars

        // Validation
        if (!sanitizedCode || !sanitizedName || !cityCode) {
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
            code2: cityCode,
            name: sanitizedName,
            user_input: user?.user_id || 'system',
            action: "Branch",
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
                message: `Data dengan Branch code ${sanitizedCode} berhasil request ${isEditMode ? 'Edit' : 'Add'}.`,
                type: 'success',
                showCancel: false,
                onConfirm: () => {
                    closeDialog();
                    setBranchCode('');
                    setBranchName('');
                    setCityCode('');
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
                title={isEditMode ? "Edit Type of Branch" : "Add New Type of Branch"}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            Branch Code
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., 001"
                            value={branchCode}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length <= 3) setBranchCode(val);
                            }}
                            disabled={loading || isEditMode}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            Branch Name
                        </label>
                        <input
                            type="text"
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                            placeholder="e.g., KCP Sudirman"
                            value={branchName}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, '');
                                setBranchName(val);
                            }}
                            disabled={loading}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                            City Name
                        </label>
                        <select
                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none bg-surface"
                            value={cityCode}
                            onChange={(e) => setCityCode(e.target.value)}
                            disabled={loading || isEditMode}
                        >
                            <option value="" disabled>Select a city</option>
                            {cities.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
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

export default MasterReqBranch;