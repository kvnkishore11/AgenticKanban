import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Info, Hash, ChevronDown, Search, X } from 'lucide-react';
import { validateAdwId, isAdwIdRequired } from '../../utils/adwValidation';
import adwDiscoveryService from '../../services/api/adwDiscoveryService';

const AdwIdInput = ({
  value = '',
  onChange,
  workflowType = null,
  isRequired = false,
  disabled = false,
  className = '',
  showHelpText = true,
  placeholder = 'Search or enter ADW ID...'
}) => {
  const [touched, setTouched] = useState(false);
  const [validationState, setValidationState] = useState(null);
  const [availableAdws, setAvailableAdws] = useState([]);
  const [filteredAdws, setFilteredAdws] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Determine if ADW ID is required based on workflow type
  const adwIdRequired = isRequired || (workflowType && isAdwIdRequired(workflowType));

  // Fetch available ADW IDs on mount
  useEffect(() => {
    const fetchAdws = async () => {
      setIsLoading(true);
      try {
        const adws = await adwDiscoveryService.listAdws();
        setAvailableAdws(adws);
        setFilteredAdws(adws);
      } catch (error) {
        console.error('Failed to fetch ADW list:', error);
        // Silently fail - user can still manually enter ADW ID
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdws();
  }, []);

  // Validate ADW ID when value changes
  useEffect(() => {
    if (value || touched) {
      const validation = validateAdwId(value, adwIdRequired);
      setValidationState(validation);
    } else {
      setValidationState(null);
    }
  }, [value, adwIdRequired, touched]);

  // Filter ADWs based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAdws(availableAdws);
    } else {
      const filtered = adwDiscoveryService.filterAdws(availableAdws, searchQuery);
      setFilteredAdws(filtered);
    }
    setSelectedIndex(-1);
  }, [searchQuery, availableAdws]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);

    // If input looks like ADW ID (alphanumeric, up to 8 chars), update value
    if (/^[a-zA-Z0-9]{0,8}$/.test(newValue)) {
      onChange?.(newValue);
    }
  };

  const handleSelectAdw = (adw) => {
    onChange?.(adw.adw_id);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setTouched(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handleClearSelection = () => {
    onChange?.('');
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredAdws.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredAdws.length) {
          handleSelectAdw(filteredAdws[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getInputClassName = () => {
    let baseClass = `
      w-full px-3 py-2 border rounded-md
      focus:outline-none focus:ring-2
      transition-colors duration-200
      ${className}
    `;

    if (disabled) {
      baseClass += ' bg-gray-50 text-gray-500 cursor-not-allowed';
    } else if (validationState?.isValid === false) {
      baseClass += ' border-red-300 focus:ring-red-500 focus:border-red-500';
    } else if (validationState?.isValid === true) {
      baseClass += ' border-green-300 focus:ring-green-500 focus:border-green-500';
    } else {
      baseClass += ' border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    }

    return baseClass.trim();
  };

  const getHelpText = () => {
    if (!showHelpText) return null;

    if (workflowType) {
      if (adwIdRequired) {
        return `ADW ID is required for ${workflowType} workflows. Reference an existing workflow.`;
      } else {
        return `ADW ID is optional for ${workflowType} workflows. Leave empty to generate a new one.`;
      }
    }

    return 'Enter an existing 8-character ADW ID to reference previous work, or leave empty to generate a new one.';
  };

  const getStatusIcon = () => {
    if (!validationState) return null;

    if (validationState.isValid === false) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (validationState.isValid === true) {
      return <Hash className="h-5 w-5 text-green-500" />;
    }

    return null;
  };

  const getIssueClassBadge = (issueClass) => {
    const badgeStyles = {
      feature: 'bg-green-100 text-green-800 border-green-200',
      bug: 'bg-red-100 text-red-800 border-red-200',
      chore: 'bg-blue-100 text-blue-800 border-blue-200',
    };

    const style = badgeStyles[issueClass] || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
        /{issueClass || 'unknown'}
      </span>
    );
  };

  const renderAdwItem = (adw, index) => {
    const isSelected = index === selectedIndex;
    const isCurrentValue = adw.adw_id === value;

    return (
      <div
        key={adw.adw_id}
        onClick={() => handleSelectAdw(adw)}
        className={`
          px-3 py-2 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'}
          ${isCurrentValue ? 'bg-green-50' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono font-semibold text-gray-900">
              {adw.adw_id}
            </code>
            {adw.issue_class && getIssueClassBadge(adw.issue_class)}
            {adw.issue_number && (
              <span className="text-xs text-gray-500">
                #{adw.issue_number}
              </span>
            )}
          </div>
        </div>
        {adw.issue_title && (
          <div className="text-xs text-gray-600 truncate">
            {adw.issue_title}
          </div>
        )}
        {adw.branch_name && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {adw.branch_name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        ADW ID Reference {adwIdRequired && <span className="text-red-500">*</span>}
        {!adwIdRequired && <span className="text-gray-500 font-normal">(optional)</span>}
      </label>

      {/* Input with dropdown */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery || value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={getInputClassName()}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Icons */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {getStatusIcon() && (
              <div className="pointer-events-none">
                {getStatusIcon()}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
                  <span>Loading ADW IDs...</span>
                </div>
              </div>
            ) : filteredAdws.length > 0 ? (
              <div className="overflow-y-auto max-h-80">
                <div className="py-1">
                  {filteredAdws.map((adw, index) => renderAdwItem(adw, index))}
                </div>
              </div>
            ) : availableAdws.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No ADW IDs available. Enter manually to create a new one.
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No matching ADW IDs found. You can enter manually.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Character counter */}
      {value && (
        <div className="text-xs text-gray-500 text-right">
          {value.length}/8 characters
        </div>
      )}

      {/* Help text */}
      {showHelpText && (
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            {getHelpText()}
          </p>
        </div>
      )}

      {/* Validation message */}
      {validationState && !validationState.isValid && (
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">
            {validationState.error}
          </p>
        </div>
      )}

      {/* Success message for valid ADW ID */}
      {validationState?.isValid === true && value && (
        <div className="flex items-start space-x-2">
          <Hash className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-600">
            Valid ADW ID format. This will reference existing workflow "{value}".
          </p>
        </div>
      )}
    </div>
  );
};

export default AdwIdInput;