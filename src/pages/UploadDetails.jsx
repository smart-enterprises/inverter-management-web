// UploadDetails.jsx
import React, { useState, useMemo } from "react";
import {
  MdCancel,
  MdCheckCircle,
  MdExpandLess,
  MdExpandMore,
  MdSearch,
} from "react-icons/md";

// Constants
const TABS = {
    FAILED: "failed",
    SUCCESS: "success",
};

const PAGE_SIZE = 10;

// Helpers
const getRowKeys = (rows) => {
    if (!rows?.length) return [];
    // Collect all unique keys, placing 'row' / 'rowNumber' first
    const priority = ["row", "rowNumber", "name", "email", "phone", "role", "error", "reason"];
    const all = [...new Set(rows.flatMap(Object.keys))];
    return [
        ...priority.filter((k) => all.includes(k)),
        ...all.filter((k) => !priority.includes(k)),
    ];
};

const formatHeader = (key) =>
    key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();

// Row error badge
const ErrorBadge = ({ text }) => (
    <span className="detail-error-badge" title={text}>
        {text}
    </span>
);

// Data table
const DetailTable = ({ rows, variant }) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const columns = useMemo(() => getRowKeys(rows), [rows]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return q
            ? rows.filter((r) =>
                Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
            )
            : rows;
    }, [rows, search]);

    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const av = String(a[sortKey] ?? "");
            const bv = String(b[sortKey] ?? "");
            return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
        setPage(1);
    };

    if (!rows?.length) {
        return (
            <div className="detail-empty">
                {variant === "failed" ? (
                    <>
                        <MdCheckCircle size={24} className="detail-empty__icon detail-empty__icon--ok" />
                        <p>No errors — all rows processed successfully.</p>
                    </>
                ) : (
                    <>
                        <MdCancel size={24} className="detail-empty__icon detail-empty__icon--muted" />
                        <p>No records were created.</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="detail-table-wrap">
            {/* Search */}
            <div className="detail-search">
                <MdSearch size={13} className="detail-search__icon" />
                <input
                    type="text"
                    placeholder="Search rows…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="detail-search__input"
                />
                {search && (
                    <button onClick={() => { setSearch(""); setPage(1); }} className="detail-search__clear">
                        ×
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="detail-table-scroll">
                <table className="detail-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className={`detail-table__th ${col === "error" || col === "reason" ? "detail-table__th--error" : ""}`}
                                    onClick={() => handleSort(col)}
                                >
                                    <span className="detail-table__th-inner">
                                        {formatHeader(col)}
                                        {sortKey === col ? (
                                            sortDir === "asc" ? <MdExpandLess size={11} /> : <MdExpandMore size={11} />
                                        ) : null}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((row, i) => (
                            <tr
                                key={i}
                                className={`detail-table__row ${variant === "failed" ? "detail-table__row--failed" : "detail-table__row--success"}`}
                            >
                                {columns.map((col) => (
                                    <td key={col} className="detail-table__td">
                                        {col === "error" || col === "reason" ? (
                                            row[col] ? <ErrorBadge text={String(row[col])} /> : "—"
                                        ) : (
                                            <span className="detail-table__cell-text">
                                                {row[col] != null ? String(row[col]) : "—"}
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="detail-pagination">
                    <span className="detail-pagination__info">
                        Showing {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </span>
                    <div className="detail-pagination__controls">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="detail-pagination__btn"
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === "…" ? (
                                    <span key={`e-${i}`} className="detail-pagination__ellipsis">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`detail-pagination__btn ${page === p ? "detail-pagination__btn--active" : ""}`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="detail-pagination__btn"
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// UploadDetails
const UploadDetails = ({ details }) => {
    const [activeTab, setActiveTab] = useState(TABS.FAILED);

    if (!details) return null;

    const { success = [], failed = [] } = details;
    const hasFailed = failed.length > 0;
    const hasSuccess = success.length > 0;

    // Default to whichever has data; prefer failed for visibility
    const effectiveTab = activeTab;

    return (
        <section className="upload-details" aria-label="Row Details">
            {/* Tab bar */}
            <div className="upload-details__tabs">
                <button
                    type="button"
                    onClick={() => setActiveTab(TABS.FAILED)}
                    className={`upload-details__tab ${effectiveTab === TABS.FAILED ? "upload-details__tab--active upload-details__tab--failed" : ""}`}
                >
                    <MdCancel size={13} />
                    Failed Rows
                    <span className={`upload-details__count ${hasFailed ? "upload-details__count--danger" : "upload-details__count--muted"}`}>
                        {failed.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab(TABS.SUCCESS)}
                    className={`upload-details__tab ${effectiveTab === TABS.SUCCESS ? "upload-details__tab--active upload-details__tab--success" : ""}`}
                >
                    <MdCheckCircle size={13} />
                    Successful Rows
                    <span className={`upload-details__count ${hasSuccess ? "upload-details__count--ok" : "upload-details__count--muted"}`}>
                        {success.length}
                    </span>
                </button>
            </div>

            {/* Content */}
            <div className="upload-details__body">
                {effectiveTab === TABS.FAILED && (
                    <DetailTable rows={failed} variant="failed" />
                )}
                {effectiveTab === TABS.SUCCESS && (
                    <DetailTable rows={success} variant="success" />
                )}
            </div>
        </section>
    );
};

export default UploadDetails;