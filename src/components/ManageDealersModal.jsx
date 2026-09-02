// ManageDealersModal.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    MdSearch, MdClose, MdCheck, MdSell,
    MdLink, MdGroup, MdExpandMore, MdExpandLess,
    MdGridView, MdViewList, MdAutoAwesome, MdStorefront,
} from "react-icons/md";
import Swal from "sweetalert2";
import { fetchDealers } from "../api/dealer";
import { fetchUsers, updateUser } from "../api/user";
import { formatName } from "../utils/constants";
import { Button, IconButton, Banner, Chip, EmptyState as M3EmptyState } from "./m3";
import { T, CHIP_TONES } from "./m3/tokens";

const getDealerId = (dealer) =>
    String(dealer?.employee_id ?? dealer?._id ?? dealer?.id ?? "");

/* Avatars vary by initial across the M3 tonal containers instead of an
   eight-hue gradient palette. The name sits beside every avatar, so the
   colour is decoration, not identification. */
const AVATAR_TONES = ["primary", "secondary", "tertiary", "success", "warning"];

const getAvatarTone = (letter) =>
    CHIP_TONES[AVATAR_TONES[(letter?.charCodeAt(0) ?? 0) % AVATAR_TONES.length]];

const ModalShell = ({ children }) => (
    <>
        <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="relative w-full max-w-2xl flex flex-col overflow-hidden"
                style={{
                    maxHeight: "92vh",
                    backgroundColor: "var(--md-sys-color-surface-container-high)",
                    borderRadius: T.cornerExtraLarge,
                    boxShadow: T.elevation3,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    </>
);

const ModalHeader = ({ title, subtitle, onClose, assignedCount }) => (
    <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
    >
        <div className="flex items-center gap-4">
            <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                    borderRadius: T.cornerFull,
                    backgroundColor: T.primaryContainer,
                    color: T.onPrimaryContainer,
                }}
            >
                <MdLink size={20} />
            </div>
            <div>
                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>{title}</h2>
                {subtitle && (
                    <p className="m3-body-small mt-1 flex items-center gap-2" style={{ color: T.onSurfaceVariant }}>
                        {subtitle}
                        {assignedCount !== undefined && (
                            <Chip tone="primary">{assignedCount} assigned</Chip>
                        )}
                    </p>
                )}
            </div>
        </div>
        {onClose && <IconButton icon={MdClose} onClick={onClose} aria-label="Close" />}
    </div>
);

const AlertBanner = ({ message }) =>
    message ? (
        <Banner tone="error">{message}</Banner>
    ) : null;

const DealerAvatar = ({ name, active, size = "md" }) => {
    const letter = name?.trim()[0]?.toUpperCase() ?? "?";
    const tone = getAvatarTone(letter);
    const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

    return (
        <div
            className={`${dim} flex items-center justify-center font-medium flex-shrink-0 transition-all duration-200`}
            style={{
                borderRadius: T.cornerFull,
                backgroundColor: active ? tone.bg : T.surfaceContainerHighest,
                color: active ? tone.fg : T.onSurfaceVariant,
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
                    background: checked ? T.primary : "transparent",
                    borderColor: checked || indeterminate ? T.primary : T.outline,
                    borderRadius: "2px",
                }}
            >
                {checked && <MdCheck size={size * 0.72} color="var(--md-sys-color-on-primary)" />}
                {!checked && indeterminate && (
                    <div className="w-[45%] h-[2px]" style={{ backgroundColor: T.primary }} />
                )}
            </div>
        </label>
    );
};

const STATUS_CONFIG = {
    added: { label: "+ New", tone: "primary" },
    removed: { label: "− Remove", tone: "error" },
    active: { label: "Active", tone: "success" },
};

const StatusBadge = ({ type }) => {
    const { label, tone } = STATUS_CONFIG[type];
    return <Chip tone={tone} className="flex-shrink-0">{label}</Chip>;
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
            className="group flex items-center gap-3 px-4 py-3 cursor-pointer select-none outline-none m3-state-layer m3-focus"
            style={{
                borderRadius: T.cornerMedium,
                backgroundColor: isChecked ? T.secondaryContainer : T.surface,
                color: isChecked ? T.onSecondaryContainer : T.onSurface,
                border: `1px solid ${isChecked ? "transparent" : T.outlineVariant}`,
            }}
        >
            <Checkbox checked={isChecked} onChange={handleClick} size={15} />
            <DealerAvatar name={dealer.employee_name} active={isChecked} />
            <div className="flex flex-col leading-tight flex-1 min-w-0">
                <span className="m3-body-medium truncate">
                    {formatName(dealer.employee_name)}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {dealer.shop_name && (
                        <span className="inline-flex items-center gap-1 m3-body-small" style={{ color: T.onSurfaceVariant }}>
                            <MdStorefront size={12} />
                            <span className="truncate max-w-[130px]">{dealer.shop_name}</span>
                        </span>
                    )}
                    {dealer.created_by && (
                        <span className="inline-flex items-center gap-1 m3-body-small" style={{ color: T.onSurfaceVariant }}>
                            <MdSell size={12} />
                            {formatName(userMap[dealer.created_by] ?? dealer.created_by)}
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
    <div
        className="inline-flex items-center gap-1.5 px-2 py-1 group"
        style={{
            borderRadius: T.cornerFull,
            backgroundColor: T.secondaryContainer,
            color: T.onSecondaryContainer,
        }}
    >
        <DealerAvatar name={dealer.employee_name} active size="sm" />
        <span className="m3-label-medium leading-none max-w-[90px] truncate">
            {formatName(dealer.employee_name)}
        </span>
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onRemove(getDealerId(dealer));
            }}
            className="ml-0.5 w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            aria-label={`Remove ${dealer.employee_name}`}
        >
            <MdClose size={12} />
        </button>
    </div>
);

const LoadingSpinner = ({ label = "Loading…" }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] rounded-full" style={{ borderColor: T.surfaceContainerHighest }} />
            <div
                className="absolute inset-0 border-[3px] border-t-transparent rounded-full animate-spin"
                style={{ borderLeftColor: T.primary, borderRightColor: T.primary, borderBottomColor: T.primary }}
            />
        </div>
        <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>{label}</p>
    </div>
);

const EmptyState = ({ searching }) => (
    <div>
        <M3EmptyState icon={MdGroup} label="No dealers found" />
        {searching && (
            <p className="m3-body-small text-center -mt-8 pb-8" style={{ color: T.onSurfaceVariant }}>
                Try adjusting your search terms
            </p>
        )}
    </div>
);

const StatsBar = ({ total, assigned, pendingAdd, pendingRemove }) => (
    <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: T.surfaceContainerLow, borderRadius: T.cornerMedium }}
    >
        <div className="flex-1 text-center">
            <p className="m3-title-large m3-numeric" style={{ color: T.onSurface }}>{total}</p>
            <p className="m3-label-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>Total</p>
        </div>
        <div className="w-px h-8" style={{ backgroundColor: T.outlineVariant }} />
        <div className="flex-1 text-center">
            <p className="m3-title-large m3-numeric" style={{ color: T.primary }}>{assigned}</p>
            <p className="m3-label-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>Assigned</p>
        </div>
        {pendingAdd > 0 && (
            <>
                <div className="w-px h-8" style={{ backgroundColor: T.outlineVariant }} />
                <div className="flex-1 text-center">
                    <p className="m3-title-large m3-numeric" style={{ color: T.success }}>+{pendingAdd}</p>
                    <p className="m3-label-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>Adding</p>
                </div>
            </>
        )}
        {pendingRemove > 0 && (
            <>
                <div className="w-px h-8" style={{ backgroundColor: T.outlineVariant }} />
                <div className="flex-1 text-center">
                    <p className="m3-title-large m3-numeric" style={{ color: T.error }}>−{pendingRemove}</p>
                    <p className="m3-label-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>Removing</p>
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
                subtitle={formatName(salesman.employee_name)}
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
                            <p className="m3-label-medium flex items-center gap-2" style={{ color: T.onSurfaceVariant }}>
                                Currently Assigned
                                <Chip tone="primary">{assignedDealers.length}</Chip>
                            </p>
                            {hasMoreChips && (
                                <button
                                    type="button"
                                    onClick={() => setChipsExpanded((p) => !p)}
                                    className="inline-flex items-center gap-1 m3-label-medium"
                                    style={{ color: T.primary }}
                                >
                                    {chipsExpanded ? (
                                        <><MdExpandLess size={16} /> Collapse</>
                                    ) : (
                                        <><MdExpandMore size={16} /> Show all {assignedDealers.length}</>
                                    )}
                                </button>
                            )}
                        </div>

                        <div
                            className="flex flex-wrap gap-1.5 p-3"
                            style={{ backgroundColor: T.surfaceContainerLow, borderRadius: T.cornerMedium }}
                        >
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
                                    className="inline-flex items-center px-2.5 py-1.5 m3-label-medium m3-state-layer"
                                    style={{
                                        borderRadius: T.cornerFull,
                                        backgroundColor: T.surfaceContainerHighest,
                                        color: T.onSurfaceVariant,
                                    }}
                                >
                                    +{assignedDealers.length - CHIPS_COLLAPSED_MAX} more
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* ── Search & Controls ── */}
                <section className="space-y-3">
                    <p className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>
                        Select Dealers to Assign
                    </p>

                    <div className="relative">
                        <MdSearch
                            size={20}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: T.onSurfaceVariant }}
                        />
                        <input
                            type="text"
                            placeholder="Search by dealer name or shop name…"
                            value={dealerSearch}
                            onChange={(e) => setDealerSearch(e.target.value)}
                            className="w-full pl-11 pr-11 h-10 m3-body-medium focus:outline-none"
                            style={{
                                backgroundColor: T.surfaceContainerHigh,
                                borderRadius: T.cornerFull,
                                color: T.onSurface,
                            }}
                        />
                        {dealerSearch && (
                            <button
                                type="button"
                                onClick={() => setDealerSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                                style={{ color: T.onSurfaceVariant }}
                                aria-label="Clear search"
                            >
                                <MdClose size={16} />
                            </button>
                        )}
                    </div>

                    {/* ── Bulk Select Row ── */}
                    {!loading && filteredDealers.length > 0 && (
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="inline-flex items-center gap-2 m3-label-large"
                                style={{ color: T.primary }}
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
            <div
                className="px-6 py-4 flex gap-2 flex-shrink-0"
                style={{ borderTop: `1px solid ${T.outlineVariant}` }}
            >
                <Button
                    variant="text"
                    type="button"
                    onClick={!saving ? onClose : undefined}
                    disabled={saving}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    variant="filled"
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading || !hasPendingChanges}
                    className="flex-1"
                >
                    {saving ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Saving…
                        </>
                    ) : hasPendingChanges ? (
                        <>
                            <MdAutoAwesome size={18} />
                            Save Changes ({pendingAdd + pendingRemove})
                        </>
                    ) : (
                        "No Changes"
                    )}
                </Button>
            </div>
        </ModalShell>
    );
};

export default ManageDealersModal;