// TemplateViewer.jsx code

import React, { useState, useEffect, useCallback } from "react";
import {
    FiDownload, FiGrid, FiInfo, FiLock, FiChevronDown,
    FiChevronRight, FiLoader, FiAlertCircle,
} from "react-icons/fi";
import { fetchTemplate, downloadTemplate } from "../api/dataUpload";
import { safeSheets } from "../utils/validationUtils";

/* ─────────────────────────────────────────────────────────────
   Skeleton loader
   ───────────────────────────────────────────────────────────── */
const TemplateSkeleton = () => (
    <div className="template-skeleton">
        {[1, 2, 3].map((i) => (
            <div key={i} className="template-skeleton__block">
                <div className="template-skeleton__heading" />
                <div className="template-skeleton__row" />
                <div className="template-skeleton__row template-skeleton__row--short" />
                <div className="template-skeleton__row" />
            </div>
        ))}
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Column row
   ───────────────────────────────────────────────────────────── */
const ColumnRow = ({ col }) => (
    <tr className="template-col-row">
        <td className="template-col-row__cell template-col-row__cell--name">
            <span className="template-col-row__name">{col.name ?? col.column ?? "—"}</span>
            {col.required && (
                <span className="template-col-row__required">required</span>
            )}
        </td>
        <td className="template-col-row__cell">
            <span className="template-col-row__type">{col.type ?? "—"}</span>
        </td>
        <td className="template-col-row__cell template-col-row__cell--desc">
            {col.description ?? col.desc ?? "—"}
        </td>
    </tr>
);

/* ─────────────────────────────────────────────────────────────
   Sheet accordion item
   ───────────────────────────────────────────────────────────── */
const SheetItem = ({ sheet, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    const rawColumns = sheet.columns ?? sheet.fields ?? [];
    const columns = Array.isArray(rawColumns)
        ? rawColumns.map((col) => {
            if (typeof col === "object") return col;

            return {
                name: col,
                type: null,
                description: null,
            };
        })
        : [];

    return (
        <div className={`template-sheet ${open ? "template-sheet--open" : ""}`}>
            <button
                type="button"
                className="template-sheet__toggle"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <div className="template-sheet__toggle-left">
                    <span className="template-sheet__icon-wrap">
                        <FiGrid size={13} />
                    </span>
                    <span className="template-sheet__name">{sheet.name ?? sheet.sheetName ?? "Sheet"}</span>
                    <span className="template-sheet__col-count">{columns.length} columns</span>
                </div>
                {open ? <FiChevronDown size={14} className="template-sheet__arrow" /> : <FiChevronRight size={14} className="template-sheet__arrow" />}
            </button>

            {open && (
                <div className="template-sheet__body">
                    {sheet.description && (
                        <p className="template-sheet__desc">
                            <FiInfo size={12} className="template-sheet__desc-icon" />
                            {sheet.description}
                        </p>
                    )}
                    {columns.length > 0 ? (
                        <div className="template-sheet__table-wrap">
                            <table className="template-col-table">
                                <thead>
                                    <tr>
                                        <th className="template-col-table__th">Column</th>
                                        <th className="template-col-table__th">Type</th>
                                        <th className="template-col-table__th">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((col, i) => (
                                        <ColumnRow key={col.name ?? col.column ?? i} col={col} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="template-sheet__no-cols">No column definitions available.</p>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Password rules panel
   ───────────────────────────────────────────────────────────── */
const PasswordRules = ({ rules }) => {
    if (!rules?.length) return null;
    return (
        <div className="template-pw-rules">
            <div className="template-pw-rules__header">
                <FiLock size={13} />
                <span>Password Rules</span>
            </div>
            <ul className="template-pw-rules__list">
                {rules.map((rule, i) => (
                    <li key={i} className="template-pw-rules__item">
                        <span className="template-pw-rules__bullet" />
                        {rule}
                    </li>
                ))}
            </ul>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   TemplateViewer
   ───────────────────────────────────────────────────────────── */
const TemplateViewer = () => {
    const [template, setTemplate] = useState(null);
    const [loadingFetch, setLoadingFetch] = useState(false);
    const [loadingDL, setLoadingDL] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [dlError, setDlError] = useState(null);

    /* Fetch metadata on mount */
    useEffect(() => {
        const load = async () => {
            setLoadingFetch(true);
            setFetchError(null);
            try {
                const res = await fetchTemplate();
                setTemplate(res?.data ?? res);
            } catch (err) {
                setFetchError(err.message ?? "Failed to load template info.");
            } finally {
                setLoadingFetch(false);
            }
        };
        load();
    }, []);

    const handleDownload = useCallback(async () => {
        setLoadingDL(true);
        setDlError(null);
        try {
            await downloadTemplate();
        } catch (err) {
            setDlError(err.message ?? "Download failed.");
        } finally {
            setLoadingDL(false);
        }
    }, []);

    const sheets = template?.sheets ?? [];
    const normalizedSheets = safeSheets(sheets);

    const passwordRulesRaw =
        template?.passwordRule ?? template?.password_rules ?? [];

    const passwordRules = Array.isArray(passwordRulesRaw)
        ? passwordRulesRaw
        : [passwordRulesRaw];

    return (
        <section className="template-viewer" aria-label="Template Viewer">
            {/* Header row */}
            <div className="template-viewer__header">
                <div>
                    <h3 className="template-viewer__title">Template Structure</h3>
                    <p className="template-viewer__subtitle">
                        Column definitions, data types, and validation rules
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={loadingDL}
                    className="template-viewer__download-btn"
                >
                    {loadingDL ? (
                        <FiLoader size={14} className="spin" />
                    ) : (
                        <FiDownload size={14} />
                    )}
                    {loadingDL ? "Downloading…" : "Download Template"}
                </button>
            </div>

            {dlError && (
                <div className="template-viewer__alert template-viewer__alert--error">
                    <FiAlertCircle size={13} /> {dlError}
                </div>
            )}

            {/* Body */}
            {loadingFetch ? (
                <TemplateSkeleton />
            ) : fetchError ? (
                <div className="template-viewer__alert template-viewer__alert--error">
                    <FiAlertCircle size={13} /> {fetchError}
                </div>
            ) : normalizedSheets.length === 0 ? (
                <div className="template-viewer__empty">
                    <FiInfo size={20} className="template-viewer__empty-icon" />
                    <p>No template structure available.</p>
                </div>
            ) : (
                <div className="template-viewer__sheets">
                    {normalizedSheets.map((sheet, i) => (
                        <SheetItem key={sheet.name ?? i} sheet={sheet} defaultOpen={i === 0} />
                    ))}
                    <PasswordRules rules={passwordRules} />
                </div>
            )}
        </section>
    );
};

export default TemplateViewer;