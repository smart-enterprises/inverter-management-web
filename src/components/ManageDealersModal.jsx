// ManageDealersModal.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    FiSearch, FiX, FiCheck, FiTag,
    FiLink2, FiUsers, FiChevronDown, FiChevronUp,
    FiGrid, FiList,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import { TbBuildingStore } from "react-icons/tb";
import Swal from "sweetalert2";
import { fetchDealers } from "../api/dealer";
import { fetchUsers, updateUser } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";

const getDealerId = (dealer) =>
    String(dealer?.employee_id ?? dealer?._id ?? dealer?.id ?? "");

const COLOR_PALETTE = [
    ["#6366f1", "#a5b4fc"],
    ["#0891b2", "#67e8f9"],
    ["#059669", "#6ee7b7"],
    ["#d97706", "#fcd34d"],
    ["#dc2626", "#fca5a5"],
    ["#7c3aed", "#c4b5fd"],
    ["#0284c7", "#7dd3fc"],
    ["#be185d", "#f9a8d4"],
];

const getAvatarColors = (letter) =>
    COLOR_PALETTE[(letter?.charCodeAt(0) ?? 0) % COLOR_PALETTE.length];

const ModalShell = ({ children }) => (
    <>
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-md" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
                style={{ maxHeight: "92vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient bar */}
                <div className="h-1 w-full flex-shrink-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
                {children}
            </div>
        </div>
    </>
);

const ModalHeader = ({ title, subtitle, onClose, assignedCount }) => (
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200 flex-shrink-0">
                <FiLink2 size={16} className="text-white" />
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-none flex items-center gap-2">
                        {subtitle}
                        {assignedCount !== undefined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                {assignedCount} assigned
                            </span>
                        )}
                    </p>
                )}
            </div>
        </div>
        {onClose && (
            <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                aria-label="Close"
            >
                <FiX size={15} />
            </button>
        )}
    </div>
);

const AlertBanner = ({ message }) =>
    message ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <FiX size={11} className="text-rose-500" />
            </div>
            {message}
        </div>
    ) : null;

const DealerAvatar = ({ name, active, size = "md" }) => {
    const letter = name?.trim()[0]?.toUpperCase() ?? "?";
    const [from, to] = getAvatarColors(letter);
    const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

    return (
        <div
            className={`${dim} rounded-xl flex items-center justify-center font-black flex-shrink-0 transition-all duration-200`}
            style={{
                background: active
                    ? `linear-gradient(135deg, ${from}, ${to})`
                    : "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
                color: active ? "#fff" : "#94a3b8",
                boxShadow: active ? `0 3px 10px ${from}55` : "none",
            }}
        >
            {letter}
        </div>
    );
};

const Checkbox = ({ checked, indeterminate = false, onChange, size = 16 }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <label
            className="relative cursor-pointer flex-shrink-0"
            style={{ width: size, height: size }}
            onClick={(e) => e.stopPropagation()}
        >
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only"
            />
            <div
                className="w-full h-full rounded-md border-2 flex items-center justify-center transition-all duration-150"
                style={{
                    background: checked
                        ? "linear-gradient(135deg,#6366f1,#7c3aed)"
                        : indeterminate
                            ? "#eef2ff"
                            : "#fff",
                    borderColor: checked || indeterminate ? "#6366f1" : "#e2e8f0",
                    boxShadow: checked ? "0 1px 6px #6366f140" : "none",
                }}
            >
                {checked && <FiCheck size={size * 0.58} strokeWidth={3} color="#fff" />}
                {!checked && indeterminate && (
                    <div className="w-[45%] h-[2px] rounded-full bg-indigo-500" />
                )}
            </div>
        </label>
    );
};

const STATUS_CONFIG = {
    added: { label: "+ New", cls: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    removed: { label: "− Remove", cls: "bg-rose-50 text-rose-600 border-rose-200" },
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

const StatusBadge = ({ type }) => {
    const { label, cls } = STATUS_CONFIG[type];
    return (
        <span className={`px-2 py-0.5 text-[9px] font-black border rounded-full tracking-wide uppercase flex-shrink-0 ${cls}`}>
            {label}
        </span>
    );
};

const DealerRow = React.memo(({ dealer, isChecked, wasOriginal, userMap, onToggle }) => {
    const id = getDealerId(dealer);

    const badgeType = isChecked && !wasOriginal
        ? "added"
        : !isChecked && wasOriginal
            ? "removed"
            : isChecked && wasOriginal
                ? "active"
                : null;

    const handleClick = useCallback(() => {
        if (id) onToggle(id);
    }, [id, onToggle]);

    return (
        <div
            role="checkbox"
            aria-checked={isChecked}
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
            className={[
                "group flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer",
                "transition-all duration-150 select-none outline-none",
                "focus-visible:ring-2 focus-visible:ring-indigo-200",
                isChecked
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm",
            ].join(" ")}
        >
            <Checkbox checked={isChecked} onChange={handleClick} size={15} />
            <DealerAvatar name={dealer.employee_name} active={isChecked} />
            <div className="flex flex-col leading-tight flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-slate-800 truncate tracking-tight">
                    {capitalizeFirstLetter(dealer.employee_name)}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {dealer.shop_name && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <TbBuildingStore size={9} />
                            <span className="truncate max-w-[130px]">{dealer.shop_name}</span>
                        </span>
                    )}
                    {dealer.created_by && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <FiTag size={8} />
                            {userMap[dealer.created_by] ?? dealer.created_by}
                        </span>
                    )}
                </div>
            </div>
            {badgeType && <StatusBadge type={badgeType} />}
        </div>
    );
});
DealerRow.displayName = "DealerRow";

const AssignedChip = ({ dealer, onRemove }) => (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 group hover:border-indigo-300 hover:bg-indigo-100/70 transition-all">
        <DealerAvatar name={dealer.employee_name} active size="sm" />
        <span className="text-[11px] font-semibold text-indigo-800 leading-none max-w-[90px] truncate">
            {capitalizeFirstLetter(dealer.employee_name)}
        </span>
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onRemove(getDealerId(dealer));
            }}
            className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full text-indigo-300 hover:text-white hover:bg-rose-400 transition-all opacity-0 group-hover:opacity-100"
            aria-label={`Remove ${dealer.employee_name}`}
        >
            <FiX size={8} />
        </button>
    </div>
);

const LoadingSpinner = ({ label = "Loading…" }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">{label}</p>
    </div>
);

const EmptyState = ({ searching }) => (
    <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FiUsers size={22} className="text-slate-400" />
        </div>
        <div className="text-center">
            <p className="text-sm font-bold text-slate-600">No dealers found</p>
            {searching && (
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms</p>
            )}
        </div>
    </div>
);

const StatsBar = ({ total, assigned, pendingAdd, pendingRemove }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="flex-1 text-center">
            <p className="text-[18px] font-black text-slate-800 leading-none">{total}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Total</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex-1 text-center">
            <p className="text-[18px] font-black text-indigo-600 leading-none">{assigned}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Assigned</p>
        </div>
        {pendingAdd > 0 && (
            <>
                <div className="w-px h-8 bg-slate-200" />
                <div className="flex-1 text-center">
                    <p className="text-[18px] font-black text-emerald-600 leading-none">+{pendingAdd}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Adding</p>
                </div>
            </>
        )}
        {pendingRemove > 0 && (
            <>
                <div className="w-px h-8 bg-slate-200" />
                <div className="flex-1 text-center">
                    <p className="text-[18px] font-black text-rose-500 leading-none">−{pendingRemove}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Removing</p>
                </div>
            </>
        )}
    </div>
);

const CHIPS_COLLAPSED_MAX = 8;

const ManageDealersModal = ({
    salesman,
    onClose,
    onSaved,
    userMap: externalUserMap = {},
}) => {
    const [allDealers, setAllDealers] = useState([]);
    const [assignedIds, setAssignedIds] = useState(new Set());
    const [originalIds, setOriginalIds] = useState(new Set());
    const [dealerSearch, setDealerSearch] = useState("");
    const [userMap, setUserMap] = useState(externalUserMap);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [chipsExpanded, setChipsExpanded] = useState(false);
    const [error, setError] = useState("");

    const pendingAdd = useMemo(
        () => [...assignedIds].filter((id) => !originalIds.has(id)).length,
        [assignedIds, originalIds]
    );
    const pendingRemove = useMemo(
        () => [...originalIds].filter((id) => !assignedIds.has(id)).length,
        [assignedIds, originalIds]
    );
    const hasPendingChanges = pendingAdd > 0 || pendingRemove > 0;

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);

                const [dealersRes, usersRes] = await Promise.all([
                    fetchDealers({ limit: 100_000 }),
                    fetchUsers({ page: 1, limit: 500 }),
                ]);

                setAllDealers(dealersRes.data?.employees ?? []);

                const currentIds = new Set(
                    (salesman.dealers ?? []).map((d) =>
                        String(typeof d === "string" ? d : (d?.dealers ?? ""))
                    )
                );

                setAssignedIds(new Set(currentIds));
                setOriginalIds(new Set(currentIds));

                const fetchedMap = Object.fromEntries(
                    (usersRes.data?.employees ?? []).map((u) => [
                        u.employee_id,
                        u.employee_name ?? u.name ?? u.employee_id,
                    ])
                );
                setUserMap((prev) => ({ ...prev, ...fetchedMap }));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
        // Only re-initialize when a different salesman is opened.
        // Adding salesman.dealers would clobber in-progress local edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salesman.employee_id]);

    useEffect(() => {
        const onKeyDown = (e) => e.key === "Escape" && !saving && onClose();
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose, saving]);

    const handleToggle = useCallback((dealerId) => {
        const id = String(dealerId);
        setAssignedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const filteredDealers = useMemo(() => {
        const q = dealerSearch.toLowerCase().trim();
        const matched = q
            ? allDealers.filter(
                (d) =>
                    d.employee_name?.toLowerCase().includes(q) ||
                    d.shop_name?.toLowerCase().includes(q)
            )
            : [...allDealers];

        return matched.sort((a, b) => {
            const aChecked = assignedIds.has(getDealerId(a)) ? 0 : 1;
            const bChecked = assignedIds.has(getDealerId(b)) ? 0 : 1;
            if (aChecked !== bChecked) return aChecked - bChecked;
            return (a.employee_name ?? "").localeCompare(b.employee_name ?? "");
        });
    }, [allDealers, dealerSearch, assignedIds]);

    const allFilteredSelected = useMemo(
        () =>
            filteredDealers.length > 0 &&
            filteredDealers.every((d) => assignedIds.has(getDealerId(d))),
        [filteredDealers, assignedIds]
    );

    const someFilteredSelected = useMemo(
        () =>
            !allFilteredSelected &&
            filteredDealers.some((d) => assignedIds.has(getDealerId(d))),
        [filteredDealers, assignedIds, allFilteredSelected]
    );

    const handleSelectAll = useCallback(() => {
        setAssignedIds((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredDealers.forEach((d) => next.delete(getDealerId(d)));
            } else {
                filteredDealers.forEach((d) => next.add(getDealerId(d)));
            }
            return next;
        });
    }, [filteredDealers, allFilteredSelected]);

    const assignedDealers = useMemo(
        () => allDealers.filter((d) => assignedIds.has(getDealerId(d))),
        [allDealers, assignedIds]
    );

    const visibleChips = chipsExpanded
        ? assignedDealers
        : assignedDealers.slice(0, CHIPS_COLLAPSED_MAX);

    const hasMoreChips = assignedDealers.length > CHIPS_COLLAPSED_MAX;

    const handleSave = async () => {
        setError("");
        if (!hasPendingChanges) {
            setError("No dealer assignments were modified.");
            return;
        }
        try {
            setSaving(true);

            const toAdd = [...assignedIds].filter((id) => !originalIds.has(id));
            const toRemove = [...originalIds].filter((id) => !assignedIds.has(id));

            const payload = {};
            if (toAdd.length) payload.dealers = toAdd;
            if (toRemove.length) payload.remove_dealers = toRemove;

            const res = await updateUser(salesman.employee_id, payload);
            if (!res?.success) throw new Error(res?.message ?? "Update failed");

            await Swal.fire({
                icon: "success",
                title: "Saved!",
                text: "Dealer assignments updated successfully.",
                timer: 1800,
                showConfirmButton: false,
            });

            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell>
            <ModalHeader
                title="Manage Dealer Assignments"
                subtitle={capitalizeFirstLetter(salesman.employee_name)}
                assignedCount={loading ? undefined : assignedIds.size}
                onClose={!saving ? onClose : undefined}
            />

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
                <AlertBanner message={error} />

                {/* ── Stats Overview ── */}
                {!loading && (
                    <StatsBar
                        total={allDealers.length}
                        assigned={assignedIds.size}
                        pendingAdd={pendingAdd}
                        pendingRemove={pendingRemove}
                    />
                )}

                {/* ── Currently Assigned Chips ── */}
                {!loading && assignedDealers.length > 0 && (
                    <section className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 flex items-center gap-2">
                                Currently Assigned
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-black text-[9px]">
                                    {assignedDealers.length}
                                </span>
                            </p>
                            {hasMoreChips && (
                                <button
                                    type="button"
                                    onClick={() => setChipsExpanded((p) => !p)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {chipsExpanded ? (
                                        <><FiChevronUp size={11} /> Collapse</>
                                    ) : (
                                        <><FiChevronDown size={11} /> Show all {assignedDealers.length}</>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50/60 border border-slate-100">
                            {visibleChips.map((dealer) => (
                                <AssignedChip
                                    key={getDealerId(dealer)}
                                    dealer={dealer}
                                    onRemove={handleToggle}
                                />
                            ))}
                            {!chipsExpanded && hasMoreChips && (
                                <button
                                    type="button"
                                    onClick={() => setChipsExpanded(true)}
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-slate-200/70 text-slate-500 text-[11px] font-bold hover:bg-slate-200 transition-colors"
                                >
                                    +{assignedDealers.length - CHIPS_COLLAPSED_MAX} more
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* ── Search & Controls ── */}
                <section className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Select Dealers to Assign
                    </p>

                    <div className="relative">
                        <FiSearch
                            size={13}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search by dealer name or shop name…"
                            value={dealerSearch}
                            onChange={(e) => setDealerSearch(e.target.value)}
                            className="w-full pl-9 pr-9 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all shadow-sm"
                        />
                        {dealerSearch && (
                            <button
                                type="button"
                                onClick={() => setDealerSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors"
                                aria-label="Clear search"
                            >
                                <FiX size={10} />
                            </button>
                        )}
                    </div>

                    {/* ── Bulk Select Row ── */}
                    {!loading && filteredDealers.length > 0 && (
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="inline-flex items-center gap-2 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                <Checkbox
                                    checked={allFilteredSelected}
                                    indeterminate={someFilteredSelected}
                                    onChange={handleSelectAll}
                                    size={15}
                                />
                                {allFilteredSelected ? "Deselect All" : "Select All"}
                                <span className="text-slate-400 font-normal text-[11px]">
                                    ({filteredDealers.length})
                                </span>
                            </button>

                            {dealerSearch && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {filteredDealers.length} result{filteredDealers.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    )}
                </section>

                {/* ── Dealer List ── */}
                <div className="space-y-1.5">
                    {loading ? (
                        <LoadingSpinner label="Loading dealers…" />
                    ) : filteredDealers.length === 0 ? (
                        <EmptyState searching={Boolean(dealerSearch)} />
                    ) : (
                        filteredDealers.map((dealer) => {
                            const id = getDealerId(dealer);
                            return (
                                <DealerRow
                                    key={id}
                                    dealer={dealer}
                                    isChecked={assignedIds.has(id)}
                                    wasOriginal={originalIds.has(id)}
                                    userMap={userMap}
                                    onToggle={handleToggle}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-shrink-0">
                <button
                    type="button"
                    onClick={!saving ? onClose : undefined}
                    disabled={saving}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-all disabled:opacity-40"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading || !hasPendingChanges}
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200/60 inline-flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Saving…
                        </>
                    ) : hasPendingChanges ? (
                        <>
                            <HiOutlineSparkles size={14} />
                            Save Changes ({pendingAdd + pendingRemove})
                        </>
                    ) : (
                        "No Changes"
                    )}
                </button>
            </div>
        </ModalShell>
    );
};

export default ManageDealersModal;