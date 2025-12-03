/**
 * ModelSelector Component
 * Dropdown for selecting Claude model (Opus, Sonnet, Haiku)
 * Follows brutalist design system consistent with TaskInput
 */

import React from 'react';
import { MODEL_OPTIONS, getModelMetadata } from '../../constants/modelDefaults.js';

/**
 * Model selector dropdown component
 * @param {Object} props - Component props
 * @param {string} props.selectedModel - Currently selected model (opus/sonnet/haiku)
 * @param {Function} props.onChange - Callback when model changes (model) => void
 * @param {string} props.stage - Stage name for context-aware defaults
 * @param {boolean} props.disabled - Whether selector is disabled
 * @param {string} props.className - Additional CSS classes
 */
export default function ModelSelector({
  selectedModel,
  onChange,
  stage,
  disabled = false,
  className = ''
}) {
  const metadata = getModelMetadata(selectedModel);

  return (
    <div className={`inline-block ${className}`}>
      <select
        value={selectedModel}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          px-2 py-1.5
          border-[2px] border-black
          text-[9px] font-bold uppercase tracking-[0.5px]
          cursor-pointer
          transition-all
          ${disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000]'
          }
        `}
        style={{ fontFamily: "'Courier New', monospace" }}
        title={metadata.description}
      >
        {MODEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
