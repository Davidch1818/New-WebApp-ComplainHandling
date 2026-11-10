import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmBoxDialog from '../components/ConfirmBoxDialog';

export default function Master60xData({
    title = "Field 601 configuration",
    addButtonLabel = "Add new product",
    onAddClick,
    onEditClick,
    codePrefix = "601"
}) {
    const [activeTab, setActiveTab] = useState('product');
    const [productData, setProductData] = useState([]);
    const [problemData, setProblemData] = useState([]);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Delete Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Result Modal State
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [resultModalConfig, setResultModalConfig] = useState({
        type: 'success',
        title: '',
        message: ''
    });

    const fetchData = async () => {
        try {
            const response = await fetch('/api/comphand/options/form-data');
            const data = await response.json();
            if (data) {
                setProductData(data[`code${codePrefix}`] || []);
                setProblemData(data[`code${codePrefix}_info`] || []);
            }
        } catch (error) {
            console.error("Failed to fetch master data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [codePrefix]);

    const openDeleteModal = (item, tab) => {
        const action = tab === 'product' ? `${codePrefix}Product` : `${codePrefix}Problem`;
        setItemToDelete({ ...item, action, code2: '-' });
        setIsDeleteModalOpen(true);
    };

    const handleSaveDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const payload = {
                code1: itemToDelete.code,
                code2: itemToDelete.code2,
                name: itemToDelete.name,
                user_input: user?.user_id || "frontend",
                action: itemToDelete.action,
                type_prs: "Delete"
            };

            const response = await fetch('/api/comphand/master/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Always close the delete modal first
            setIsDeleteModalOpen(false);

            if (response.ok) {
                const data = await response.json();
                setResultModalConfig({
                    type: 'success',
                    title: 'Success',
                    message: data.message || `Request delete untuk ${itemToDelete.code} berhasil.`
                });
                setIsResultModalOpen(true);
                fetchData(); // Refresh data
            } else {
                const errorData = await response.json();
                setResultModalConfig({
                    type: 'danger',
                    title: 'Error',
                    message: errorData.detail || 'Terjadi kesalahan saat memproses request.'
                });
                setIsResultModalOpen(true);
            }
        } catch (error) {
            setIsDeleteModalOpen(false);
            setResultModalConfig({
                type: 'danger',
                title: 'Error',
                message: 'Koneksi ke server gagal.'
            });
            setIsResultModalOpen(true);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    return (
        <div className="flex-1 p-margin-desktop overflow-y-auto bg-background h-full">
            {/* Header */}
            <header className="mb-lg flex justify-between items-end">
                <div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mb-2">
                        {title}
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                        Manage product and problem taxonomies for regulatory reporting. Changes will be applied across all reporting modules.
                    </p>
                </div>
                <button
                    onClick={() => onAddClick && onAddClick(activeTab)}
                    className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    <span>{activeTab === 'problem' ? 'Add new problem' : addButtonLabel}</span>
                </button>
            </header>

            {/* Tabs */}
            <div className="border-b border-outline-variant mb-lg flex gap-lg">
                <button
                    className={`pb-3 border-b-2 font-label-md text-label-md px-2 transition-colors ${activeTab === 'product'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                    onClick={() => setActiveTab('product')}
                >
                    Product Options
                </button>
                <button
                    className={`pb-3 border-b-2 font-label-md text-label-md px-2 transition-colors ${activeTab === 'problem'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                    onClick={() => setActiveTab('problem')}
                >
                    Problem Options
                </button>
            </div>

            {/* Product Options Content */}
            {activeTab === 'product' && (
                <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <div className="p-lg flex justify-between items-center bg-surface-container-lowest">
                        <div className="relative w-80">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                            <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Search products..." type="text" />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filter
                        </button>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant text-[13px] text-on-surface-variant uppercase tracking-wider">
                                <th className="py-4 px-lg font-semibold w-32">Code</th>
                                <th className="py-4 px-lg font-semibold">Product Name</th>
                                <th className="py-4 px-lg font-semibold text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                            {productData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors group">
                                    <td className="py-5 px-lg font-medium text-on-surface">{item.code}</td>
                                    <td className="py-5 px-lg text-on-surface">{item.name}</td>
                                    <td className="py-5 px-lg text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEditClick && onEditClick('product', item)}
                                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button onClick={() => openDeleteModal(item, 'product')} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-lg border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-sm text-on-surface-variant">
                        <span>Showing 1 to {productData.length} of {productData.length} entries</span>
                        <div className="flex gap-2">
                            <button className="px-4 py-1.5 border border-outline-variant rounded-lg text-on-surface-variant opacity-50 cursor-not-allowed">Previous</button>
                            <button className="px-4 py-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Problem Options Content (from Modern Mobile) */}
            {activeTab === 'problem' && (
                <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <div className="p-md flex justify-between items-center border-b border-outline-variant bg-surface-container-lowest">
                        <div className="relative w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                            <input className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface" placeholder="Search problems..." type="text" />
                        </div>
                        <button className="flex items-center gap-xs text-sm text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            Filter
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant text-sm text-on-surface-variant">
                                    <th className="py-3 px-md font-medium w-32 uppercase tracking-wider">Problem Code</th>
                                    <th className="py-3 px-md font-medium uppercase tracking-wider">Problem Name</th>
                                    <th className="py-3 px-md font-medium text-right w-32 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {problemData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                                        <td className="py-4 px-md font-medium text-on-surface">{item.code}</td>
                                        <td className="py-4 px-md text-on-surface">{item.name}</td>
                                        <td className="py-4 px-md text-right">
                                            <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onEditClick && onEditClick('problem', item)}
                                                    className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button onClick={() => openDeleteModal(item, 'problem')} className="p-1 text-on-surface-variant hover:text-error transition-colors" title="Delete">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-md border-t border-outline-variant bg-surface flex justify-between items-center text-sm text-on-surface-variant">
                        <span>Showing 1 to {problemData.length} of {problemData.length} entries</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-outline-variant rounded-lg text-on-surface-variant opacity-50 cursor-not-allowed">Previous</button>
                            <button className="px-3 py-1 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="mt-lg pt-lg border-t border-outline-variant flex justify-end gap-md">
                <button
                    className="px-6 py-2 border border-outline-variant rounded-lg text-on-surface font-label-md hover:bg-surface-container-low transition-colors"
                    onClick={() => navigate('/operations/comphand/master')}
                >
                    Cancel
                </button>
                <button className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-opacity">
                    Save Changes
                </button>
            </div>

            <ConfirmBoxDialog
                isOpen={isDeleteModalOpen}
                title="Confirm Deletion"
                message={`Apakah yakin hapus data master dengan kode ${itemToDelete?.code} dan action ${itemToDelete?.action} ?`}
                type="warning"
                confirmText={isDeleting ? 'Menyimpan...' : 'Save'}
                cancelText="Cancel"
                onConfirm={handleSaveDelete}
                onCancel={() => !isDeleting && setIsDeleteModalOpen(false)}
                showCancel={true}
            />

            <ConfirmBoxDialog
                isOpen={isResultModalOpen}
                title={resultModalConfig.title}
                message={resultModalConfig.message}
                type={resultModalConfig.type}
                confirmText="OK"
                onConfirm={() => setIsResultModalOpen(false)}
                showCancel={false}
            />
        </div>
    );
}