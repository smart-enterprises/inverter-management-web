import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

export default function PortalDropdown({ anchorRef, open, onClose, children }) {
  const [style, setStyle] = useState({});
  const dropdownRef = useRef();

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownHeight = 140; // Adjust as needed
      const dropdownWidth = 180; // Adjust as needed
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight;
      setStyle({
        position: 'absolute',
        left: rect.right - dropdownWidth,
        top: openUp ? rect.top - dropdownHeight : rect.bottom,
        zIndex: 9999,
        width: dropdownWidth,
      });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return ReactDOM.createPortal(
    <div ref={dropdownRef} style={style} className="rounded-lg bg-white shadow-lg border border-gray-100 py-1">
      {children}
    </div>,
    document.body
  );
} 