// BulkUpload.jsx
import React, { useState, useCallback, useRef } from "react";
import {
    FiUploadCloud, FiRefreshCw, FiCheckCircle,
    FiAlertCircle, FiFileText, FiLoader,
} from "react-icons/fi";
import { uploadExcel, validateExcelFile } from "../api/dataUpload";
import UploadBox from "./UploadBox";
import UploadSummary from "./UploadSummary";
import UploadDetails from "./UploadDetails";
import TemplateViewer from "./TemplateViewer";

// Upload state machine values
const STATUS = {
    IDLE: "idle",
    LOADING: "loading",
    SUCCESS: "success",
    ERROR: "error",
};

// Progress bar
const ProgressBar = ({ percent }) => (
    <div className="bulk-progress">
        <div className="bulk-progress__track">
            <div
                className="bulk-progress__fill"
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            />
        </div>
        <span className="bulk-progress__label">{percent}%</span>
    </div>
);

// Toast notification (lightweight, no external dep)
const Toast = ({ toasts }) => (
    <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.type}`}>
                {t.type === "success" ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                <span>{t.message}</span>
            </div>
        ))}
    </div>
);

// useToast
const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = "success", duration = 4000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);
    return { toasts, addToast };
};

// Section tabs
const MAIN_TABS = { UPLOAD: "upload", TEMPLATE: "template" };

// BulkUpload
const DataUpload = () => {
    const [activeTab, setActiveTab] = useState(MAIN_TABS.UPLOAD);
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState(STATUS.IDLE);
    const [progress, setProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const { toasts, addToast } = useToast();
    const abortRef = useRef(null);

    /* ── File handlers ── */
    const handleFileSelect = useCallback((selected) => {
        setFile(selected);
        setStatus(STATUS.IDLE);
        setUploadResult(null);
        setUploadError(null);
        setProgress(0);
    }, []);

    const handleFileRemove = useCallback(() => {
        setFile(null);
        setStatus(STATUS.IDLE);
        setUploadResult(null);
        setUploadError(null);
        setProgress(0);
    }, []);

    /* ── Upload ── */
    const handleUpload = useCallback(async () => {
        if (!file) return;

        const validationError = validateExcelFile(file);
        if (validationError) {
            addToast(validationError, "error");
            return;
        }

        setStatus(STATUS.LOADING);
        setUploadResult(null);
        setUploadError(null);
        setProgress(0);

        try {
            const result = await uploadExcel(file, (event) => {
                if (event.lengthComputable) {
                    setProgress(Math.round((event.loaded / event.total) * 100));
                }
            });

            setUploadResult(result);
            setStatus(STATUS.SUCCESS);
            setProgress(100);

            const summary = result?.data?.summary ?? result?.summary;
            const total = summary?.totalRows ?? 0;
            const failed = summary?.failedCount ?? 0;

            if (failed > 0) {
                addToast(
                    `Upload complete — ${total - failed} succeeded, ${failed} failed.`,
                    "error"
                );
            } else {
                addToast(`Upload successful! ${total} rows processed.`, "success");
            }
        } catch (err) {
            setStatus(STATUS.ERROR);
            setUploadError(err.message ?? "Upload failed. Please try again.");
            addToast(err.message ?? "Upload failed.", "error");
        }
    }, [file, addToast]);

    /* ── Reset ── */
    const handleReset = useCallback(() => {
        setFile(null);
        setStatus(STATUS.IDLE);
        setUploadResult(null);
        setUploadError(null);
        setProgress(0);
    }, []);

    // Derived
    const isLoading = status === STATUS.LOADING;
    const isSuccess = status === STATUS.SUCCESS;
    const isError = status === STATUS.ERROR;
    const resultData = uploadResult?.data ?? uploadResult;
    const summary = resultData?.summary;
    const details = resultData?.details;

    // Render
    return (
        <div className="bulk-upload-page">
            <Toast toasts={toasts} />

            {/* Page header */}
            <div className="bulk-upload-page__header">
                <div className="bulk-upload-page__title-group">
                    <div className="bulk-upload-page__icon-wrap">
                        <FiUploadCloud size={20} />
                    </div>
                    <div>
                        <h1 className="bulk-upload-page__title">Bulk Upload</h1>
                        <p className="bulk-upload-page__subtitle">
                            Import dealers, users, and brands from a single Excel file
                        </p>
                    </div>
                </div>
            </div>

            {/* Main tabs */}
            <div className="bulk-upload-page__tab-bar">
                <button
                    type="button"
                    onClick={() => setActiveTab(MAIN_TABS.UPLOAD)}
                    className={`bulk-upload-page__tab ${activeTab === MAIN_TABS.UPLOAD ? "bulk-upload-page__tab--active" : ""}`}
                >
                    <FiUploadCloud size={14} />
                    Upload File
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab(MAIN_TABS.TEMPLATE)}
                    className={`bulk-upload-page__tab ${activeTab === MAIN_TABS.TEMPLATE ? "bulk-upload-page__tab--active" : ""}`}
                >
                    <FiFileText size={14} />
                    Template Guide
                </button>
            </div>

            {/* ── UPLOAD TAB ── */}
            {activeTab === MAIN_TABS.UPLOAD && (
                <div className="bulk-upload-page__content">
                    <div className="bulk-upload-page__left">
                        {/* Upload card */}
                        <div className="bulk-card">
                            <div className="bulk-card__header">
                                <h2 className="bulk-card__title">Select File</h2>
                                <p className="bulk-card__subtitle">
                                    Drop or browse an Excel (.xlsx) file to begin
                                </p>
                            </div>
                            <div className="bulk-card__body">
                                <UploadBox
                                    file={file}
                                    onFileSelect={handleFileSelect}
                                    onFileRemove={handleFileRemove}
                                    disabled={isLoading}
                                />

                                {/* Progress */}
                                {isLoading && <ProgressBar percent={progress} />}

                                {/* Error banner */}
                                {isError && uploadError && (
                                    <div className="bulk-alert bulk-alert--error">
                                        <FiAlertCircle size={14} />
                                        <span>{uploadError}</span>
                                    </div>
                                )}

                                {/* Success banner */}
                                {isSuccess && (
                                    <div className="bulk-alert bulk-alert--success">
                                        <FiCheckCircle size={14} />
                                        <span>File processed successfully.</span>
                                    </div>
                                )}
                            </div>

                            {/* Action row */}
                            <div className="bulk-card__footer">
                                {(isSuccess || isError) && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="bulk-btn bulk-btn--secondary"
                                    >
                                        <FiRefreshCw size={13} />
                                        Upload Another
                                    </button>
                                )}
                                {!isSuccess && (
                                    <button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={!file || isLoading}
                                        className="bulk-btn bulk-btn--primary"
                                    >
                                        {isLoading ? (
                                            <>
                                                <FiLoader size={13} className="spin" />
                                                Uploading…
                                            </>
                                        ) : (
                                            <>
                                                <FiUploadCloud size={13} />
                                                Upload File
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results panel */}
                    {(isSuccess || isError) && resultData && (
                        <div className="bulk-upload-page__results">
                            {summary && <UploadSummary summary={summary} />}
                            {details && <UploadDetails details={details} />}
                        </div>
                    )}
                </div>
            )}

            {/* ── TEMPLATE TAB ── */}
            {activeTab === MAIN_TABS.TEMPLATE && (
                <div className="bulk-upload-page__content bulk-upload-page__content--single">
                    <TemplateViewer />
                </div>
            )}
        </div>
    );
};

export default DataUpload;