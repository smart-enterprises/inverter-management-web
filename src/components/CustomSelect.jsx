// CustomSelect.jsx — Material Design 3
import React, { useState, useEffect, useRef } from 'react';
import { MdExpandMore, MdSearch } from 'react-icons/md';
import { T } from './m3/tokens';

/* ── inject scrollbar styles once ── */
if (typeof document !== 'undefined' && !document.getElementById('cs-scroll-styles')) {
  const s = document.createElement('style');
  s.id = 'cs-scroll-styles';
  s.textContent = `
    .cs-scroll::-webkit-scrollbar { width: 4px; }
    .cs-scroll::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
    .cs-scroll::-webkit-scrollbar-thumb { background: var(--md-sys-color-outline-variant); border-radius: 8px; }
    .cs-scroll::-webkit-scrollbar-thumb:hover { background: var(--md-sys-color-outline); }
    .cs-scroll { scrollbar-width: thin; scrollbar-color: var(--md-sys-color-outline-variant) transparent; }
  `;
  document.head.appendChild(s);
}

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
  name,
  searchable = false,
  disabled = false,
  grouped = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // Support both string and object options
  const getOptionLabel = (option) => (typeof option === 'object' ? option.label : option);
  const getOptionValue = (option) => (typeof option === 'object' ? option.value : option);
  const getOptionSubLabel = (option) => (typeof option === 'object' ? option.subLabel : null);

  // Check if options are grouped
  const isGrouped = grouped || (options.length > 0 && options[0]?.group);

  // Flatten options for finding selected value
  const flattenOptions = (opts) => {
    if (!isGrouped) return opts;
    return opts.flatMap((group) => group.options || []);
  };

  // Filter options based on search query (matches label and subLabel)
  const optionMatchesSearch = (option, q) => {
    const needle = q.toLowerCase();
    const label = (getOptionLabel(option) || '').toLowerCase();
    const sub = (getOptionSubLabel(option) || '').toLowerCase();
    return label.includes(needle) || sub.includes(needle);
  };

  const filterOptions = (opts) => {
    if (!searchQuery) return opts;
    if (isGrouped) {
      return opts
        .map((group) => ({
          ...group,
          options: (group.options || []).filter((option) =>
            optionMatchesSearch(option, searchQuery)
          ),
        }))
        .filter((group) => group.options.length > 0);
    } else {
      return opts.filter((option) => optionMatchesSearch(option, searchQuery));
    }
  };

  const filteredOptions = filterOptions(options);
  const allOptions = flattenOptions(options);

  /* ── position panel using fixed coords so it never clips ── */
  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPanelStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(spaceBelow >= 260
        ? { top: rect.bottom + 4 }
        : { bottom: window.innerHeight - rect.top + 4 }),
    });
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        panelRef.current && !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // auto-focus search
      if (searchable) setTimeout(() => searchRef.current?.focus(), 60);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, searchable]);

  const selectedLabel =
    getOptionLabel(allOptions.find((opt) => getOptionValue(opt) === value)) || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          isOpen ? (setIsOpen(false), setSearchQuery('')) : openPanel();
        }}
        disabled={disabled}
        className={`w-full px-4 h-11 text-left m3-body-medium flex items-center justify-between focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          border: `1px solid ${isOpen ? T.primary : T.outline}`,
          borderRadius: T.cornerExtraSmall,
          backgroundColor: T.surface,
        }}
      >
        <span style={{ color: value ? T.onSurface : T.onSurfaceVariant }}>
          {selectedLabel}
        </span>
        <MdExpandMore
          size={20}
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: T.onSurfaceVariant }}
        />
      </button>

      {/* ── Panel (fixed-positioned so it escapes overflow:hidden parents) ── */}
      {isOpen && !disabled && (
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: T.cornerSmall,
            boxShadow: T.elevation2,
          }}
          className="overflow-hidden"
        >
          {/* Search */}
          {searchable && (
            <div className="px-2.5 pt-2.5 pb-2" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
              <div className="relative">
                <MdSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={18}
                  style={{ color: T.onSurfaceVariant }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 h-10 m3-body-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    borderRadius: T.cornerFull,
                    color: T.onSurface,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options list — no artificial record cap, custom scrollbar */}
          <div
            className="max-h-60 overflow-y-auto overscroll-contain cs-scroll"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredOptions.length > 0 ? (
              isGrouped ? (
                filteredOptions.map((group, groupIndex) => (
                  <div key={group.group || groupIndex}>
                    <div
                      className="px-4 py-2 m3-label-medium sticky top-0 whitespace-nowrap"
                      style={{
                        color: T.onSurfaceVariant,
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      }}
                    >
                      {group.group || group.label}
                    </div>
                    {(group.options || []).map((option) => {
                      const sub = getOptionSubLabel(option);
                      return (
                        <button
                          key={getOptionValue(option)}
                          type="button"
                          onClick={() => {
                            onChange({ target: { name, value: getOptionValue(option) } });
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-6 py-2.5 text-left m3-body-large m3-state-layer"
                          style={{
                            backgroundColor: value === getOptionValue(option) ? T.secondaryContainer : 'transparent',
                            color: value === getOptionValue(option) ? T.onSecondaryContainer : T.onSurface,
                          }}
                        >
                          <div>{getOptionLabel(option)}</div>
                          {sub && (
                            <div className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>{sub}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                filteredOptions.map((option) => {
                  const sub = getOptionSubLabel(option);
                  return (
                    <button
                      key={getOptionValue(option)}
                      type="button"
                      onClick={() => {
                        onChange({ target: { name, value: getOptionValue(option) } });
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-2.5 text-left m3-body-large m3-state-layer"
                      style={{
                        backgroundColor: value === getOptionValue(option) ? T.secondaryContainer : 'transparent',
                        color: value === getOptionValue(option) ? T.onSecondaryContainer : T.onSurface,
                      }}
                    >
                      <div>{getOptionLabel(option)}</div>
                      {sub && (
                        <div className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>{sub}</div>
                      )}
                    </button>
                  );
                })
              )
            ) : (
              <div className="px-4 py-6 m3-body-medium text-center" style={{ color: T.onSurfaceVariant }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;