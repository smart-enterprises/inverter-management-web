import React, { memo } from "react";

/* ── Role display labels ── */
const ROLE_LABELS = {
    ROLE_SUPER_ADMIN: "Super Admin",
    ROLE_ADMIN: "Admin",
    ROLE_MANAGER: "Manager",
    ROLE_SALESMAN: "Salesman",
    ROLE_PRODUCTION: "Production",
    ROLE_PACKING: "Packing",
    ROLE_ACCOUNTS: "Accounts",
    ROLE_DELIVERY: "Delivery",
};

/* ── Role badge Tailwind classes ── */
const ROLE_BADGE_CLASSES = {
    ROLE_SUPER_ADMIN: "bg-violet-50  text-violet-700  border-violet-200",
    ROLE_ADMIN: "bg-blue-50    text-blue-700    border-blue-200",
    ROLE_MANAGER: "bg-indigo-50  text-indigo-700  border-indigo-200",
    ROLE_SALESMAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ROLE_PRODUCTION: "bg-orange-50  text-orange-700  border-orange-200",
    ROLE_PACKING: "bg-pink-50    text-pink-700    border-pink-200",
    ROLE_ACCOUNTS: "bg-cyan-50    text-cyan-700    border-cyan-200",
    ROLE_DELIVERY: "bg-amber-50   text-amber-700   border-amber-200",
};

const DEFAULT_BADGE = "bg-slate-100 text-slate-600 border-slate-200";

/* ── Header accent dot colour per theme ── */
const THEME_DOTS = {
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    purple: "bg-violet-500",
    amber: "bg-amber-500",
};

const getRoleLabel = (role) =>
    ROLE_LABELS[role] ||
    role?.replace(/^ROLE_/, "").replace(/_/g, " ") ||
    "";

const getRoleBadgeClass = (role) =>
    ROLE_BADGE_CLASSES[role] || DEFAULT_BADGE;

/* ────────────────────────────────────────────────
   NoteItem — single note row
   ──────────────────────────────────────────────── */
const NoteItem = memo(({ note }) => {
    const hasHeader = note.employee || note.role;
    const hasDates = note.fromDate || note.toDate;

    return (
        <div className="
      px-3 py-2.5
      border-b border-slate-100 last:border-0
      hover:bg-slate-50/60 transition-colors duration-100
    ">
            {/* Employee + role badge */}
            {hasHeader && (
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {note.employee && (
                        <span className="text-[11px] font-semibold text-slate-800 leading-none">
                            {note.employee}
                        </span>
                    )}
                    {note.role && (
                        <span className={`
              inline-flex items-center px-2 py-0.5
              text-[9px] font-black uppercase tracking-wide
              rounded-full border
              ${getRoleBadgeClass(note.role)}
            `}>
                            {getRoleLabel(note.role)}
                        </span>
                    )}
                </div>
            )}

            {/* Note text */}
            {note.noteText && (
                <p className="text-[11px] text-slate-700 leading-relaxed mb-1.5 break-words">
                    {note.noteText}
                </p>
            )}

            {/* From → To dates */}
            {hasDates && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {note.fromDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wide">
                                From
                            </span>
                            {note.fromDate}
                        </span>
                    )}
                    {note.fromDate && note.toDate && (
                        <span className="text-slate-300 text-[10px] select-none">→</span>
                    )}
                    {note.toDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-400 text-[9px] uppercase tracking-wide">
                                To
                            </span>
                            {note.toDate}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
});

NoteItem.displayName = "NoteItem";

/* ────────────────────────────────────────────────
   DeliveryNotesCard
   Props:
     title  – string   (default "Delivery Notes")
     notes  – array    from formatDeliveryNotes()
     color  – "blue" | "teal" | "purple" | "amber"
   ──────────────────────────────────────────────── */
const DeliveryNotesCard = memo(({ title = "Delivery Notes", notes = [], color = "blue" }) => {
    if (!notes?.length) return null;

    const dotClass = THEME_DOTS[color] ?? THEME_DOTS.blue;

    return (
        <div className="
      mt-2 w-full min-w-[220px]
      bg-white border border-slate-200
      rounded-xl overflow-hidden
      text-left
    ">
            {/* Card header */}
            <div className="
        flex items-center gap-2 px-3 py-2
        border-b border-slate-100
        bg-slate-50/70
      ">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                <span className="
          flex-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400
        ">
                    {title}
                </span>
                <span className="
          text-[9px] font-semibold text-slate-400
          bg-white border border-slate-200
          rounded-full px-2 py-0.5
        ">
                    {notes.length}
                </span>
            </div>

            {/* Notes */}
            <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                {notes.map((note, i) => (
                    <NoteItem key={i} note={note} />
                ))}
            </div>
        </div>
    );
});

DeliveryNotesCard.displayName = "DeliveryNotesCard";

export default DeliveryNotesCard;