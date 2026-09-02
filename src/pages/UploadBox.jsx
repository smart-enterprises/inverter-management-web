/**
 * UploadBox.jsx
 * Drag-and-drop / click-to-browse file selector.
 * Purely presentational — all state lives in BulkUpload.jsx.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  MdClose,
  MdCloudUpload,
  MdInsertDriveFile,
} from "react-icons/md";
import { ACCEPTED_FILE_TYPES, validateExcelFile } from "../api/dataUpload";

/* ─────────────────────────────────────────────────────────────
   Sub-component: FilePreview
   ───────────────────────────────────────────────────────────── */
const FilePreview = ({ file, onRemove }) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return (
        <div className="upload-file-preview">
            <div className="upload-file-preview__icon">
                <MdInsertDriveFile size={20} />
            </div>
            <div className="upload-file-preview__info">
                <p className="upload-file-preview__name">{file.name}</p>
                <p className="upload-file-preview__meta">{sizeMB} MB · Excel Spreadsheet</p>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="upload-file-preview__remove"
                aria-label="Remove file"
            >
                <MdClose size={14} />
            </button>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   UploadBox
   ───────────────────────────────────────────────────────────── */
const UploadBox = ({ file, onFileSelect, onFileRemove, disabled = false }) => {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragError, setDragError] = useState(null);

    const processFile = useCallback(
        (incoming) => {
            setDragError(null);
            const err = validateExcelFile(incoming);
            if (err) {
                setDragError(err);
                return;
            }
            onFileSelect(incoming);
        },
        [onFileSelect]
    );

    /* ── Drag handlers ── */
    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) processFile(dropped);
    };

    /* ── Input change ── */
    const handleInputChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) processFile(selected);
        // reset so same file can be re-selected
        e.target.value = "";
    };

    const handleRemove = () => {
        setDragError(null);
        onFileRemove();
    };

    const zoneActive = isDragging && !disabled;

    return (
        <div className="upload-box">
            {file ? (
                <FilePreview file={file} onRemove={handleRemove} />
            ) : (
                <div
                    className={`upload-drop-zone ${zoneActive ? "upload-drop-zone--active" : ""} ${disabled ? "upload-drop-zone--disabled" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && inputRef.current?.click()}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
                    aria-label="Upload Excel file"
                >
                    {/* Background grid decoration */}
                    <div className="upload-drop-zone__grid" aria-hidden="true" />

                    <div className="upload-drop-zone__content">
                        <div className={`upload-drop-zone__icon-wrap ${zoneActive ? "upload-drop-zone__icon-wrap--active" : ""}`}>
                            <MdCloudUpload size={28} />
                        </div>
                        <div className="upload-drop-zone__text">
                            <p className="upload-drop-zone__headline">
                                {zoneActive ? "Release to upload" : "Drop your Excel file here"}
                            </p>
                            <p className="upload-drop-zone__sub">
                                or{" "}
                                <span className="upload-drop-zone__browse">browse files</span>
                                {" "}— only{" "}
                                <span className="upload-drop-zone__ext">.xlsx</span> accepted
                            </p>
                        </div>
                        <div className="upload-drop-zone__constraints">
                            <span>Max 10 MB</span>
                            <span className="upload-drop-zone__dot">·</span>
                            <span>Excel 2007+</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation error */}
            {dragError && (
                <p className="upload-box__error">
                    <MdClose size={12} className="upload-box__error-icon" />
                    {dragError}
                </p>
            )}

            {/* Hidden input */}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES.extension}
                onChange={handleInputChange}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
            />
        </div>
    );
};

export default UploadBox;