/**
 * @fileoverview Patch Request Modal Component
 *
 * Modal for entering a patch request for an existing task.
 * When submitted, triggers the patch workflow (adw_patch_iso)
 * which moves the card through: Implement -> Test -> Ready to Merge
 *
 * @module components/kanban/PatchRequestModal
 */

import { useState, useEffect, useRef } from 'react';
import { X, Wrench, AlertCircle } from 'lucide-react';

const PatchRequestModal = ({ task, isOpen, onClose, onSubmit, isSubmitting = false }) => {
  const [patchRequest, setPatchRequest] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isSubmitting]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPatchRequest('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedRequest = patchRequest.trim();

    if (!trimmedRequest) {
      setError('Please describe what you want to patch');
      return;
    }

    if (trimmedRequest.length < 10) {
      setError('Please provide a more detailed patch description (at least 10 characters)');
      return;
    }

    setError('');
    onSubmit(trimmedRequest);
  };

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const adwId = task.metadata?.adw_id;

  return (
    <div
      className="brutalist-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="bg-white border-[6px] border-black max-w-[600px] w-full max-h-[90vh] flex flex-col"
        style={{ boxShadow: '12px 12px 0 rgba(0,0,0,0.3)', fontFamily: "'Courier New', monospace" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-amber-400 text-black px-6 py-4 flex justify-between items-center border-b-[4px] border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-amber-400 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[3px]">Apply Patch</div>
              <div className="text-[10px] uppercase tracking-[1px] opacity-70">
                ADW: {adwId || 'Unknown'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 flex items-center justify-center border-2 border-black text-black hover:bg-black hover:text-amber-400 transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Patch Running Indicator */}
          {isSubmitting && (
            <div className="bg-amber-100 border-[4px] border-amber-500 p-5 mb-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 animate-pulse"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 border-[3px] border-black flex items-center justify-center animate-spin">
                  <Wrench size={24} className="text-black" />
                </div>
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[2px] text-amber-900">
                    Patch Running
                  </div>
                  <div className="text-[10px] text-amber-700 mt-1 uppercase tracking-[1px]">
                    Applying your changes... Please wait
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task Info */}
          <div className="bg-gray-100 border-[3px] border-black p-4 mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-gray-500 mb-2">
              Patching Task
            </div>
            <div className="text-sm font-bold uppercase">
              #{task.id} - {task.title || task.metadata?.summary || 'Untitled'}
            </div>
            <div className="text-[10px] text-gray-600 mt-1 uppercase">
              Current Stage: {task.stage}
            </div>
          </div>

          {/* Patch Flow Info */}
          <div className="bg-blue-50 border-[3px] border-blue-400 p-4 mb-5">
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-blue-700 mb-2">
              Patch Flow
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 bg-blue-200 border border-blue-400">IMPLEMENT</span>
              <span className="text-blue-400">→</span>
              <span className="px-2 py-1 bg-blue-200 border border-blue-400">TEST</span>
              <span className="text-blue-400">→</span>
              <span className="px-2 py-1 bg-green-200 border border-green-400">READY TO MERGE</span>
            </div>
            <div className="text-[9px] text-blue-600 mt-2 uppercase">
              Patch will be applied in isolated worktree, tested, then await your review
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-[3px] border-red-500 p-3 mb-5 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span className="text-[11px] font-bold uppercase text-red-700">{error}</span>
            </div>
          )}

          {/* Patch Request Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] mb-2">
              What do you want to patch? <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={patchRequest}
              onChange={(e) => {
                setPatchRequest(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe the changes you want to make...&#10;&#10;Examples:&#10;- Fix the typo in the header component&#10;- Update the API endpoint to use v2&#10;- Add error handling to the submit function"
              rows={8}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border-[3px] border-black text-[13px] outline-none resize-none transition-all focus:bg-gray-50 focus:shadow-[4px_4px_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Courier New', monospace" }}
            />
            <div className="flex justify-between mt-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-[0.5px]">
                Be specific about what to change
              </div>
              <div className="text-[9px] text-gray-400 uppercase">
                {patchRequest.length} chars
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t-[3px] border-black flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase">
            <span className="px-1.5 py-0.5 bg-gray-200 border border-gray-300 text-[9px] font-bold">
              CTRL+ENTER
            </span>
            submit
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 border-[3px] border-black bg-white text-[11px] font-bold uppercase tracking-[1px] cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !patchRequest.trim()}
              className="px-6 py-3 border-[3px] border-black bg-amber-400 text-black text-[11px] font-bold uppercase tracking-[1px] cursor-pointer transition-all hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Wrench size={14} />
                  <span>Apply Patch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatchRequestModal;
