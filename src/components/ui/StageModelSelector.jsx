import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Zap, Scale, Crown, ChevronDown, Info } from 'lucide-react';
import {
  MODEL_INFO,
  getCostColor,
  getPerformanceColor,
  getDefaultModelForStage
} from '../../utils/modelDefaults';

/**
 * StageModelSelector Component
 *
 * A brutalist-styled model selector dropdown for ADW workflow stages.
 * Displays model options with visual indicators for cost and performance tiers.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.stageName - The name of the workflow stage (e.g., "plan", "build", "test")
 * @param {string} props.selectedModel - The currently selected model ("sonnet", "haiku", or "opus")
 * @param {Function} props.onChange - Callback fired when model selection changes, receives new model value
 * @param {boolean} [props.disabled=false] - Whether the selector is disabled
 * @returns {JSX.Element} The StageModelSelector component
 *
 * @example
 * <StageModelSelector
 *   stageName="plan"
 *   selectedModel="opus"
 *   onChange={(model) => console.log('Selected:', model)}
 *   disabled={false}
 * />
 */
const StageModelSelector = ({
  stageName,
  selectedModel,
  onChange,
  disabled = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tooltipModel, setTooltipModel] = useState(null);

  // Get default model for this stage
  const defaultModel = getDefaultModelForStage(stageName);

  // Model icons mapping
  const modelIcons = {
    haiku: Zap,
    sonnet: Scale,
    opus: Crown
  };

  // Available models in order
  const models = ['haiku', 'sonnet', 'opus'];

  /**
   * Handle model selection change
   * @param {string} model - The newly selected model
   */
  const handleModelChange = (model) => {
    if (!disabled && onChange) {
      onChange(model);
      setIsDropdownOpen(false);
    }
  };

  /**
   * Toggle dropdown open/closed state
   */
  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  /**
   * Render model icon
   * @param {string} model - Model name
   * @returns {JSX.Element} Icon component
   */
  const renderModelIcon = (model) => {
    const IconComponent = modelIcons[model];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  /**
   * Render cost tier badge
   * @param {string} cost - Cost tier
   * @returns {JSX.Element} Cost badge
   */
  const renderCostBadge = (cost) => {
    const colorClass = getCostColor(cost);
    return (
      <span className={`px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${colorClass}`}>
        {cost.toUpperCase()}
      </span>
    );
  };

  /**
   * Render performance tier badge
   * @param {string} tier - Performance tier
   * @returns {JSX.Element} Performance badge
   */
  const renderPerformanceBadge = (tier) => {
    const colorClass = getPerformanceColor(tier);
    return (
      <span className={`px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${colorClass}`}>
        {tier.toUpperCase()}
      </span>
    );
  };

  /**
   * Render model option
   * @param {string} model - Model name
   * @returns {JSX.Element} Model option
   */
  const renderModelOption = (model) => {
    const modelInfo = MODEL_INFO[model];
    const isSelected = selectedModel === model;
    const isDefault = defaultModel === model;

    return (
      <div
        key={model}
        onClick={() => handleModelChange(model)}
        onMouseEnter={() => setTooltipModel(model)}
        onMouseLeave={() => setTooltipModel(null)}
        className={`
          relative px-3 py-3 cursor-pointer border-b-2 border-black
          transition-colors duration-100
          ${isSelected ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <div className="flex items-center justify-between space-x-3">
          {/* Model name and icon */}
          <div className="flex items-center space-x-2">
            <div className={isSelected ? 'text-white' : 'text-black'}>
              {renderModelIcon(model)}
            </div>
            <span className="font-mono font-bold uppercase text-sm">
              {modelInfo.label}
            </span>
            {isDefault && (
              <span className="text-xs font-mono opacity-70">
                (Default)
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center space-x-2">
            {renderCostBadge(modelInfo.cost)}
            {renderPerformanceBadge(modelInfo.tier)}
          </div>
        </div>

        {/* Tooltip */}
        {tooltipModel === model && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 px-3 py-2 bg-black text-white text-xs font-mono border-2 border-black shadow-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{modelInfo.description}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-mono font-bold uppercase tracking-wider">
        {stageName} Stage Model
      </label>

      {/* Selector */}
      <div className="relative">
        {/* Selected value display */}
        <button
          type="button"
          onClick={handleToggleDropdown}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border-3 border-black bg-white
            font-mono font-bold uppercase text-sm text-left
            flex items-center justify-between
            transition-all duration-100
            ${disabled
              ? 'opacity-50 cursor-not-allowed bg-gray-100'
              : 'cursor-pointer hover:bg-gray-50'
            }
            ${isDropdownOpen ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : ''}
          `}
          style={{ border: '3px solid black' }}
        >
          <div className="flex items-center space-x-2">
            {renderModelIcon(selectedModel)}
            <span>{MODEL_INFO[selectedModel]?.label || 'Select Model'}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && !disabled && (
          <div
            className="absolute z-40 w-full mt-2 bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            style={{ border: '3px solid black' }}
          >
            {models.map(model => renderModelOption(model))}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="flex items-start space-x-2">
        <Info className="h-3 w-3 text-gray-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 font-mono">
          Default for {stageName}: {MODEL_INFO[defaultModel]?.label}
        </p>
      </div>
    </div>
  );
};

StageModelSelector.propTypes = {
  stageName: PropTypes.string.isRequired,
  selectedModel: PropTypes.oneOf(['sonnet', 'haiku', 'opus']).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default StageModelSelector;
