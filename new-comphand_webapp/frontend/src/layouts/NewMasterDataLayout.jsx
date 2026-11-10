import React from 'react';

const NewMasterDataLayout = ({
    title = "Add New Type of Request",
    requestNameLabel = "Request name",
    codeLabel = "Code",
    showCityCombobox = false,
    onSave,
    onCancel,
    children
}) => {
    return (
        <main className="flex-1 p-margin-desktop bg-surface">
            <div className="w-full">

                {/* Header with Actions */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                            Define parameters for a new category of incoming requests.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-outline text-primary font-label-md text-label-md rounded hover:bg-surface-container-high transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            className="px-6 py-2 bg-primary-container text-on-primary-container font-label-md text-label-md rounded hover:bg-primary transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Save
                        </button>
                    </div>
                </div>

                {/* Bento Grid Layout for Form */}
                <div className="gap-gutter">
                    {/* Primary Details */}
                    <div className="col-span-12 space-y-gutter">
                        <div
                            className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm hover:border-primary/20 transition-colors"
                            style={{ borderColor: 'rgba(0, 109, 49, 0.2)' }}
                        >
                            <h2 className="font-headline-md text-headline-md mb-6">General Information</h2>
                            {children ? (
                                <div className="mt-6">
                                    {children}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                                            {codeLabel}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                                            placeholder="e.g., REQ-001"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                                            {requestNameLabel}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none"
                                            placeholder="e.g., General Inquiry"
                                        />
                                    </div>
                                    {showCityCombobox && (
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                                                City Name
                                            </label>
                                            <select
                                                className="w-full kbank-input border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md focus:ring-0 focus:border-primary outline-none bg-surface"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Select a city</option>
                                                <option value="Jakarta">Jakarta</option>
                                                <option value="Surabaya">Surabaya</option>
                                                <option value="Bandung">Bandung</option>
                                                <option value="Medan">Medan</option>
                                                <option value="Semarang">Semarang</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Bottom Sticky (Mobile Only) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant p-4 flex gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 border border-outline text-primary font-label-md text-label-md rounded"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex-1 py-3 bg-primary text-on-primary font-label-md text-label-md rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </main>
    );
};

export default NewMasterDataLayout;