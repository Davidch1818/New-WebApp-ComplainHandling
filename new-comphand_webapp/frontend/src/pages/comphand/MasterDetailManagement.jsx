import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConfirmBoxDialog from '../../components/ConfirmBoxDialog';

const MasterDetailManagement = () => {
    const navigate = useNavigate();
    const [masterData, setMasterData] = useState({
        request_types: [],
        comp_types: [],
        channels: [],
        cities: [],
        branches: [],
    });

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

    const [pages, setPages] = useState({
        request_types: 1,
        comp_types: 1,
        channels: 1,
        cities: 1,
        branches: 1,
    });

    const ITEMS_PER_PAGE = 10;

    const handlePageChange = (section, newPage) => {
        setPages(prev => ({ ...prev, [section]: newPage }));
    };

    const getPaginatedData = (dataArray, page) => {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        return dataArray.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    };

    const renderPagination = (section, dataArray) => {
        const totalPages = Math.ceil(dataArray.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-md pt-sm border-t border-outline-variant/20 px-sm">
                <span className="font-body-sm text-on-surface-variant">
                    Showing {((pages[section] - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(pages[section] * ITEMS_PER_PAGE, dataArray.length)} of {dataArray.length} entries
                </span>
                <div className="flex gap-sm">
                    <button
                        onClick={() => handlePageChange(section, pages[section] - 1)}
                        disabled={pages[section] === 1}
                        className="flex items-center justify-center px-sm py-xs border border-outline-variant rounded-DEFAULT text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-label-md flex items-center px-sm">Page {pages[section]} of {totalPages}</span>
                    <button
                        onClick={() => handlePageChange(section, pages[section] + 1)}
                        disabled={pages[section] === totalPages}
                        className="flex items-center justify-center px-sm py-xs border border-outline-variant rounded-DEFAULT text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>
        );
    };

    const fetchData = async () => {
        try {
            const response = await fetch('/api/comphand/options/form-data');
            if (response.ok) {
                const data = await response.json();
                setMasterData({
                    request_types: data.request_types || [],
                    comp_types: data.comp_types || [],
                    channels: data.channels || [],
                    cities: data.cities || [],
                    branches: data.branches || [],
                });
            }
        } catch (err) {
            console.error("Failed to fetch master data", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openDeleteModal = (item, action) => {
        // Special case for branch where code2 is city_code
        const code2 = action === 'Branch' ? item.city_code : '-';
        setItemToDelete({ ...item, action, code2 });
        setIsDeleteModalOpen(true);
    };

    const handleSaveDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const payload = {
                code1: itemToDelete.code,
                code2: itemToDelete.code2 || "-",
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
        <div className="flex h-screen bg-background text-on-surface font-sans">
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background min-w-0">
                {/* TopNavBar (Mobile Only / Responsive Fallback) */}
                <header className="md:hidden flex justify-between items-center px-margin-mobile py-4 w-full bg-surface border-b border-outline-variant sticky top-0 z-20 shrink-0">
                    <div className="font-headline-md text-headline-md font-bold text-primary">ResolverHQ</div>
                    <div className="flex gap-md">
                        <button className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                </header>

                {/* Page Header */}
                <div className="px-margin-desktop py-lg border-b border-outline-variant/30 bg-surface shrink-0">
                    <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs font-bold mt-0">System Configuration</h2>
                    <p className="font-body-lg text-body-lg text-on-surface-variant m-0">Manage the available options for submission form fields.</p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-margin-desktop space-y-xl">
                    {/* Type of Request Section */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">category</span>
                                Type of Request
                            </h3>
                            <button
                                onClick={() => navigate('/operations/comphand/master/add-type')}
                                className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add New Type
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Code</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(masterData.request_types, pages.request_types).map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/edit-type/${item.uuid}`, { state: { item } })}
                                                        className="text-on-surface-variant hover:text-primary cursor-pointer"
                                                    ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                    <button onClick={() => openDeleteModal(item, 'ReqType')} className="text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination('request_types', masterData.request_types)}
                    </section>

                    {/* Type of Complaint Section */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">category</span>
                                Type of Complaints
                            </h3>
                            <button
                                onClick={() => navigate('/operations/comphand/master/add-complaint-type')}
                                className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add New Type
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Code</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(masterData.comp_types, pages.comp_types).map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/edit-complaint-type/${item.uuid}`, { state: { item } })}
                                                        className="text-on-surface-variant hover:text-primary cursor-pointer"
                                                    ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                    <button onClick={() => openDeleteModal(item, 'CompType')} className="text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination('comp_types', masterData.comp_types)}
                    </section>

                    {/* Issues Section */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">category</span> Issues
                            </h3>
                            <button onClick={() => navigate('/operations/comphand/master/add-issues')}
                                className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add New Issues
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Code</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(masterData.channels, pages.channels).map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/edit-issues/${item.uuid}`, { state: { item } })}
                                                        className="text-on-surface-variant hover:text-primary cursor-pointer"
                                                    ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                    <button onClick={() => openDeleteModal(item, 'Issue')} className="text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination('channels', masterData.channels)}
                    </section>

                    {/* Cities Section */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">location_city</span>
                                Cities
                            </h3>
                            <button
                                onClick={() => navigate('/operations/comphand/master/add-city')}
                                className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add New City
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Code</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">City Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(masterData.cities, pages.cities).map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/edit-city/${item.uuid}`, { state: { item } })}
                                                        className="text-on-surface-variant hover:text-primary cursor-pointer"
                                                    ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                    <button onClick={() => openDeleteModal(item, 'City')} className="text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination('cities', masterData.cities)}
                    </section>

                    {/* Branches Section */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">store</span>
                                Branches
                            </h3>
                            <button
                                onClick={() => navigate('/operations/comphand/master/add-branch')}
                                className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add New Branch
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Code</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Location Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">City Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(masterData.branches, pages.branches).map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md font-body-md">{masterData.cities.find(c => c.code === item.city_code)?.name || item.city_code || '-'}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/edit-branch/${item.uuid}`, { state: { item } })}
                                                        className="text-on-surface-variant hover:text-primary cursor-pointer"
                                                    ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                    <button onClick={() => openDeleteModal(item, 'Branch')} className="text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination('branches', masterData.branches)}
                    </section>

                    {/* Reporting Fields (601-605) */}
                    <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-DEFAULT p-lg">
                        <div className="flex justify-between items-center mb-md pb-sm border-b border-outline-variant/20">
                            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm m-0 font-bold">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                Reporting Fields (601-605)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse m-0">
                                <thead>
                                    <tr className="border-b border-outline-variant/30">
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Field ID</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold">Field Name</th>
                                        <th className="py-sm px-md font-label-md text-on-surface-variant font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { code: '601', name: 'Product/Problem' },
                                        { code: '602', name: 'Working Days' },
                                        { code: '603', name: 'Causes' },
                                        { code: '604', name: 'Negative Publication' },
                                        { code: '605', name: 'Dispute Resolution' }
                                    ].map(item => (
                                        <tr key={item.code} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                            <td className="py-sm px-md font-body-md">{item.code}</td>
                                            <td className="py-sm px-md font-body-md">{item.name}</td>
                                            <td className="py-sm px-md text-right">
                                                <div className="flex justify-end items-center gap-md">
                                                    <button
                                                        onClick={() => navigate(`/operations/comphand/master/${item.code}`)}
                                                        className="text-primary hover:underline font-label-md text-label-md font-bold m-0 bg-transparent border-0 cursor-pointer"
                                                    >
                                                        Edit Options
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
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
            </main>
        </div>
    );
};

export default MasterDetailManagement;