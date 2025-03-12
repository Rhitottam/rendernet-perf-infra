import React, { useEffect, useRef, useState } from 'react';

function CustomSelect({ options, value, onChange, placeholder, isMulti = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(isMulti ? value || [] : value ? [value] : []);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option) => {
    if (isMulti) {
      const isSelected = selectedOptions.some(selected => selected.key === option.key);
      const newSelected = isSelected
        ? selectedOptions.filter(selected => selected.key !== option.key)
        : [...selectedOptions, option];
      setSelectedOptions(newSelected);
      onChange(newSelected);
    } else {
      setSelectedOptions([option]);
      onChange(option);
      setIsOpen(false);
    }
  };

  const formatDate = (dateStr, timeStr) => {
    const [day, month, year] = dateStr.split('-');
    const time = timeStr.replaceAll('-', ':');
    return `${day}/${month}/${year} ${time}`;
  };

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm 
                 bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
      >
        <div className="flex flex-wrap gap-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(option => (
              <span
                key={option.key}
                className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-primary-100 text-primary-800 gap-1"
              >
                <span>{option.testName}</span>
                <span>{formatDate(option.date, option.time)}</span>
                {isMulti && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick(option);
                    }}
                    className="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = selectedOptions.some(selected => selected.key === option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleOptionClick(option)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex flex-col
                           ${isSelected ? 'bg-primary-50' : ''}`}
                >
                  <span className="font-medium">
                    {option.testName}
                  </span>
                  <span className="font-medium">
                    {formatDate(option.date, option.time)}
                  </span>
                  <span className="text-sm text-gray-500 truncate">
                    {option.url}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
            No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect; 