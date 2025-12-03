/**
 * StageButton Component
 * Combined stage button with integrated model selector dropdown
 * Two-row layout: Stage name on top, model selector below
 */

import React from 'react';
import { MODEL_OPTIONS, MODEL_METADATA } from '../../constants/modelDefaults.js';

/**
 * Stage button with integrated model selector in two-row layout
 * @param {Object} props - Component props
 * @param {string} props.stageId - Stage identifier (plan, implement, test, etc.)
 * @param {string} props.label - Display label for the stage
 * @param {string|React.ReactNode} props.icon - Icon for the stage (emoji or component)
 * @param {boolean} props.isSelected - Whether the stage is currently selected
 * @param {string} props.selectedModel - Currently selected model (opus/sonnet/haiku)
 * @param {Function} props.onToggle - Callback when stage is toggled
 * @param {Function} props.onModelChange - Callback when model changes
 * @param {boolean} props.disabled - Whether the entire button is disabled
 * @param {string} props.variant - Style variant ('default' | 'merge')
 */
export default function StageButton({
  stageId,
  label,
  icon,
  isSelected,
  selectedModel,
  onToggle,
  onModelChange,
  disabled = false,
  variant = 'default'
}) {
  const isMerge = variant === 'merge';
  const isConfig = variant === 'config';

  // Handle model change without triggering button toggle
  const handleModelChange = (e) => {
    e.stopPropagation();
    onModelChange(e.target.value);
  };

  // Handle select click to prevent toggling the stage
  const handleSelectClick = (e) => {
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        min-w-[90px] px-3 py-2 border-[3px] text-[10px] font-bold uppercase
        cursor-pointer transition-all flex flex-col items-center justify-center gap-1
        ${isConfig
          ? 'bg-orange-500 border-orange-600 text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#c2410c]'
          : isMerge
            ? isSelected
              ? 'bg-purple-500 border-purple-600 text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#6d28d9]'
              : 'border-purple-500 text-purple-700 bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#6d28d9]'
            : isSelected
              ? 'bg-black text-white border-black -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#444]'
              : 'bg-white border-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000]'
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* Row 1: Icon + Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] flex-shrink-0">{icon}</span>
        <span className="flex-shrink-0 tracking-[0.5px]">{label}</span>
      </div>

      {/* Row 2: Model Dropdown with full text */}
      <select
        value={selectedModel}
        onChange={handleModelChange}
        onClick={handleSelectClick}
        disabled={disabled}
        className={`
          w-full px-1.5 py-0.5
          border-[1px] rounded-sm
          text-[8px] font-bold uppercase tracking-[0.5px]
          cursor-pointer
          transition-all
          text-center
          ${isSelected
            ? isConfig
              ? 'bg-orange-400 border-orange-300 text-white'
              : isMerge
                ? 'bg-purple-400 border-purple-300 text-white'
                : 'bg-gray-700 border-gray-500 text-white'
            : 'bg-gray-100 border-gray-300 text-gray-600'
          }
          ${disabled ? 'cursor-not-allowed' : 'hover:bg-opacity-80'}
        `}
        style={{ fontFamily: "'Courier New', monospace" }}
        title={`Select model for ${label}`}
      >
        {MODEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {MODEL_METADATA[option.value].name}
          </option>
        ))}
      </select>
    </button>
  );
}
