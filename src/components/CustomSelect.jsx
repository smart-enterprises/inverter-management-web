import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

const CustomSelect = ({ value, onChange, options, placeholder, name, searchable = false, disabled = false, grouped = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState(null);
  const measureRef = useRef(null);

  // Support both string and object options
  const getOptionLabel = (option) => typeof option === 'object' ? option.label : option;
  const getOptionValue = (option) => typeof option === 'object' ? option.value : option;

  // Check if options are grouped
  const isGrouped = grouped || (options.length > 0 && options[0]?.group);

  // Flatten options for finding selected value
  const flattenOptions = (opts) => {
    if (!isGrouped) return opts;
    return opts.flatMap(group => group.options || []);
  };

  // Filter options based on search query
  const filterOptions = (opts) => {
    if (!searchQuery) return opts;

    if (isGrouped) {
      return opts.map(group => ({
        ...group,
        options: (group.options || []).filter(option =>
          getOptionLabel(option).toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(group => group.options.length > 0);
    } else {
      return opts.filter(option =>
        getOptionLabel(option).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  };

  const calculateMaxWidth = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Match your font styles (IMPORTANT ❗)
    context.font = "14px Inter, sans-serif";

    const allOptionsList = flattenOptions(options);

    let maxWidth = 0;

    allOptionsList.forEach((opt) => {
      const text = getOptionLabel(opt);
      const metrics = context.measureText(text);
      maxWidth = Math.max(maxWidth, metrics.width);
    });

    // Add padding + icon space
    const finalWidth = Math.ceil(maxWidth) + 60;

    setDropdownWidth(finalWidth);
  };

  const filteredOptions = filterOptions(options);
  const allOptions = flattenOptions(options);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      calculateMaxWidth();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, options]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-left text-sm flex items-center justify-between transition-all ${disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50'
          : 'hover:border-[#9333EA] focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20'
          }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>{
          getOptionLabel(allOptions.find(opt => getOptionValue(opt) === value)) || placeholder
        }</span>
        <FiChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-fadeIn"
          style={{
            width: dropdownWidth ? `${dropdownWidth}px` : "auto",
          }}
        >

          {searchable && (
            <div className="px-2 pb-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div
            className="max-h-60 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredOptions.length > 0 ? (
              isGrouped ? (
                filteredOptions.map((group, groupIndex) => (
                  <div key={group.group || groupIndex}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 whitespace-nowrap">
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
                        className={`w-full px-6 py-2 text-sm text-left transition-colors ${value === getOptionValue(option)
                          ? 'bg-[#9333EA]/10 text-[#9333EA]'
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
                    className={`w-full px-4 py-2 text-sm text-left transition-colors ${value === getOptionValue(option)
                      ? 'bg-[#9333EA]/10 text-[#9333EA]'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {getOptionLabel(option)}
                  </button>
                ))
              )
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
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