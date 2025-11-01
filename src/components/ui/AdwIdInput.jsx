import { useState, useEffect } from 'react';
import { AlertCircle, Info, Hash } from 'lucide-react';
import { validateAdwId, isAdwIdRequired } from '../../utils/adwValidation';

const AdwIdInput = ({
  value = '',
  onChange,
  workflowType = null,
  isRequired = false,
  disabled = false,
  className = '',
  showHelpText = true,
  placeholder = 'Enter 8-character ADW ID...'
}) => {
  const [touched, setTouched] = useState(false);
  const [validationState, setValidationState] = useState(null);

  // Determine if ADW ID is required based on workflow type
  const adwIdRequired = isRequired || (workflowType && isAdwIdRequired(workflowType));

  // Validate ADW ID when value changes
  useEffect(() => {
    if (value || touched) {
      const validation = validateAdwId(value, adwIdRequired);
      setValidationState(validation);
    } else {
      setValidationState(null);
    }
  }, [value, adwIdRequired, touched]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    // Only allow alphanumeric characters and limit to 8 characters
    const sanitized = newValue.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    onChange?.(sanitized);
  };

  const handleBlur = () => {
    setTouched(true);
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

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        ADW ID Reference {adwIdRequired && <span className="text-red-500">*</span>}
        {!adwIdRequired && <span className="text-gray-500 font-normal">(optional)</span>}
      </label>

      {/* Input with icon */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClassName()}
          maxLength={8}
          pattern="[a-zA-Z0-9]{8}"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Status icon */}
        {getStatusIcon() && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {getStatusIcon()}
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