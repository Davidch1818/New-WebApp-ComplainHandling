import React, { useRef, useState } from 'react';

const UploadZone = ({ label, name, accept = 'application/pdf', onFileChange, file }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) onFileChange(name, dropped);
    };

    return (
        <div className="flex flex-col w-full">
            <div
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group min-h-[8rem] ${dragging || file ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest hover:border-primary'}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <span className={`material-symbols-outlined text-4xl mb-2 ${file ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                    {file ? 'check_circle' : 'upload_file'}
                </span>
                <span className="font-label-md text-sm text-on-surface-variant font-medium">{label}</span>
                <span className="text-[10px] text-on-surface-variant uppercase mt-1">PDF ONLY • MAX 5MB</span>
                {file && <span className="text-xs font-semibold text-primary mt-2 break-all">{file.name}</span>}
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => { if (e.target.files[0]) onFileChange(name, e.target.files[0]); }}
                />
            </div>
        </div>
    );
};

export default UploadZone;
