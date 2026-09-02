// UploadSummary.jsx
import React from "react";
import {
  MdCheckCircle,
  MdErrorOutline,
  MdGroup,
  MdSell,
  MdStorage,
} from "react-icons/md";

// Stat Card
const StatCard = ({ icon: Icon, label, value, variant = "default" }) => (
    <div className={`summary-stat summary-stat--${variant}`}>
        <div className="summary-stat__icon">
            <Icon size={16} />
        </div>
        <div className="summary-stat__body">
            <p className="summary-stat__value">{value ?? 0}</p>
            <p className="summary-stat__label">{label}</p>
        </div>
    </div>
);

// UploadSummary
const UploadSummary = ({ summary }) => {
    if (!summary) return null;

    const {
        totalRows = 0,
        successCount = 0,
        failedCount = 0,
        dealers = 0,
        users = 0,
        brands = 0,
    } = summary;

    const hasFailures = failedCount > 0;

    return (
        <section className="upload-summary" aria-label="Upload Summary">
            {/* Header */}
            <div className="upload-summary__header">
                <div className={`upload-summary__status-dot ${hasFailures ? "upload-summary__status-dot--warn" : "upload-summary__status-dot--ok"}`} />
                <h3 className="upload-summary__title">Upload Summary</h3>
                <span className={`upload-summary__badge ${hasFailures ? "upload-summary__badge--warn" : "upload-summary__badge--ok"}`}>
                    {hasFailures ? "Partial Success" : "All Processed"}
                </span>
            </div>

            {/* Main stats row */}
            <div className="upload-summary__grid">
                <StatCard icon={MdStorage} label="Total Rows" value={totalRows} variant="neutral" />
                <StatCard icon={MdCheckCircle} label="Succeeded" value={successCount} variant="success" />
                <StatCard icon={MdErrorOutline} label="Failed" value={failedCount} variant={failedCount > 0 ? "danger" : "neutral"} />
            </div>

            {/* Entity breakdown */}
            {(dealers > 0 || users > 0 || brands > 0) && (
                <>
                    <div className="upload-summary__divider" />
                    <p className="upload-summary__section-label">Created / Updated</p>
                    <div className="upload-summary__entity-row">
                        {dealers > 0 && <StatCard icon={MdGroup} label="Dealers" value={dealers} variant="brand" />}
                        {users > 0 && <StatCard icon={MdGroup} label="Users" value={users} variant="brand" />}
                        {brands > 0 && <StatCard icon={MdSell} label="Brands" value={brands} variant="brand" />}
                    </div>
                </>
            )}
        </section>
    );
};

export default UploadSummary;