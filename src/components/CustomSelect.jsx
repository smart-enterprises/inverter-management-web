// customSelect.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

/* ── inject scrollbar styles once ── */
if (typeof document !== 'undefined' && !document.getElementById('cs-scroll-styles')) {
  const s = document.createElement('style');
  s.id = 'cs-scroll-styles';
  s.textContent = `
    .cs-scroll::-webkit-scrollbar { width: 4px; }
    .cs-scroll::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
    .cs-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 8px; }
    .cs-scroll::-webkit-scrollbar-thumb:hover { background: #9333ea; }
    .cs-scroll { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
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

  // Check if options are grouped
  const isGrouped = grouped || (options.length > 0 && options[0]?.group);

  // Flatten options for finding selected value
  const flattenOptions = (opts) => {
    if (!isGrouped) return opts;
    return opts.flatMap((group) => group.options || []);
  };

  // Filter options based on search query
  const filterOptions = (opts) => {
    if (!searchQuery) return opts;
    if (isGrouped) {
      return opts
        .map((group) => ({
          ...group,
          options: (group.options || []).filter((option) =>
            getOptionLabel(option).toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((group) => group.options.length > 0);
    } else {
      return opts.filter((option) =>
        getOptionLabel(option).toLowerCase().includes(searchQuery.toLowerCase())
      );
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
        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-left text-sm flex items-center justify-between transition-all ${disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
          : isOpen
            ? 'border-[#9333EA] ring-2 ring-[#9333EA]/20 outline-none'
            : 'border-gray-200 hover:border-[#9333EA] focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20'
          }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400 text-sm'}>
          {selectedLabel}
        </span>
        <FiChevronDown
          size={14}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* ── Panel (fixed-positioned so it escapes overflow:hidden parents) ── */}
      {isOpen && !disabled && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.14)] overflow-hidden"
        >
          {/* Search */}
          {searchable && (
            <div className="px-2.5 pt-2.5 pb-2 border-b border-gray-100">
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={13}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9333EA]/40 focus:border-[#9333EA] placeholder-gray-300"
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
                    <div className="px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] bg-gray-50 sticky top-0 whitespace-nowrap border-b border-gray-100">
                      {group.group || group.label}
                    </div>
                    {(group.options || []).map((option) => (
                      <button
                        key={getOptionValue(option)}
                        type="button"
                        onClick={() => {
                          onChange({ target: { name, value: getOptionValue(option) } });
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full px-6 py-2.5 text-sm text-left transition-colors border-b border-gray-50 last:border-0 ${value === getOptionValue(option)
                          ? 'bg-[#9333EA]/8 text-[#9333EA] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {getOptionLabel(option)}
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={getOptionValue(option)}
                    type="button"
                    onClick={() => {
                      onChange({ target: { name, value: getOptionValue(option) } });
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors border-b border-gray-50 last:border-0 ${value === getOptionValue(option)
                      ? 'bg-[#9333EA]/10 text-[#9333EA] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {getOptionLabel(option)}
                  </button>
                ))
              )
            ) : (
              <div className="px-4 py-6 text-sm text-gray-400 text-center font-medium">
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