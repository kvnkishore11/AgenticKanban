/**
 * @fileoverview Task creation form component for creating new work items
 *
 * Provides a comprehensive form interface for creating tasks with support for
 * work item types, stage selection, image attachments with annotations, and
 * clipboard paste functionality. Validates input and integrates with the kanban
 * store for task creation.
 *
 * Brutalist UI design with bold typography and sharp edges.
 *
 * @module components/forms/TaskInput
 */

import { useState, useEffect, useRef } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { WORK_ITEM_TYPES, QUEUEABLE_STAGES, SDLC_STAGES } from '../../constants/workItems';
import { X, Plus, Clipboard, GitMerge, Paperclip } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useClipboard } from '../../hooks/useClipboard';
import RichTextEditor from '../ui/RichTextEditor';
import { htmlToPlainText } from '../../utils/htmlUtils';

const TaskInput = () => {
  const {
    createTask,
    toggleTaskInput,
    validateTask,
  } = useKanbanStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workItemType, setWorkItemType] = useState(WORK_ITEM_TYPES.FEATURE);
  const [queuedStages, setQueuedStages] = useState(['plan', 'implement']);
  const [customAdwId, setCustomAdwId] = useState('');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [annotatingImage, setAnnotatingImage] = useState(null);
  const [imageAnnotations, setImageAnnotations] = useState({});
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [clipboardError, setClipboardError] = useState('');
  const [startImmediately, setStartImmediately] = useState(false);
  const [toast, setToast] = useState(null);
  const modalRef = useRef(null);

  // Clipboard support for image paste
  const {
    isSupported: clipboardSupported,
    setupPasteListener,
  } = useClipboard({
    onImagePaste: (pastedImages) => {
      setImages(prev => [...prev, ...pastedImages]);
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
      setClipboardError('');
    },
    onError: (errors) => {
      setClipboardError(errors.join(', '));
      setTimeout(() => setClipboardError(''), 3000);
    },
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  // Set up paste event listener
  useEffect(() => {
    if (clipboardSupported && modalRef.current) {
      const cleanup = setupPasteListener(modalRef.current);
      return cleanup;
    }
  }, [clipboardSupported, setupPasteListener]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        toggleTaskInput();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (description.trim() && queuedStages.length > 0) {
          handleSubmit(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleTaskInput, description, queuedStages]);

  // Image upload with react-dropzone
  const onDrop = (acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeImage = (imageId) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up object URLs
      const removed = prev.find(img => img.id === imageId);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
    // Remove annotations for this image
    setImageAnnotations(prev => {
      const updated = { ...prev };
      delete updated[imageId];
      return updated;
    });
  };

  const handleImageClick = (imageId, event) => {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;

    const annotation = {
      id: Date.now() + Math.random(),
      x: relativeX,
      y: relativeY,
      note: '',
    };

    setImageAnnotations(prev => ({
      ...prev,
      [imageId]: [...(prev[imageId] || []), annotation]
    }));

    // Open annotation edit mode
    setAnnotatingImage({ imageId, annotationId: annotation.id });
  };

  const updateAnnotation = (imageId, annotationId, note) => {
    setImageAnnotations(prev => ({
      ...prev,
      [imageId]: prev[imageId]?.map(ann =>
        ann.id === annotationId ? { ...ann, note } : ann
      ) || []
    }));
  };

  const removeAnnotation = (imageId, annotationId) => {
    setImageAnnotations(prev => ({
      ...prev,
      [imageId]: prev[imageId]?.filter(ann => ann.id !== annotationId) || []
    }));
  };


  // Check if all SDLC stages are selected
  const isFullSdlcSelected = SDLC_STAGES.every(stage => queuedStages.includes(stage));

  const handleStageToggle = (stageId) => {
    setQueuedStages(prev => {
      if (prev.includes(stageId)) {
        return prev.filter(id => id !== stageId);
      } else {
        return [...prev, stageId];
      }
    });
  };

  const handleFullSdlcToggle = () => {
    if (isFullSdlcSelected) {
      // If already selected, deselect all SDLC stages
      setQueuedStages(prev => prev.filter(stage => !SDLC_STAGES.includes(stage)));
    } else {
      // Select all SDLC stages (preserve any additional non-SDLC stages)
      setQueuedStages(prev => {
        const nonSdlcStages = prev.filter(stage => !SDLC_STAGES.includes(stage));
        return [...SDLC_STAGES, ...nonSdlcStages];
      });
    }
  };

  // Check if merge workflow is selected
  const isMergeSelected = queuedStages.includes('adw_merge_worktree');

  const handleMergeToggle = () => {
    setQueuedStages(prev => {
      if (prev.includes('adw_merge_worktree')) {
        // Remove merge workflow if already selected
        return prev.filter(stage => stage !== 'adw_merge_worktree');
      } else {
        // Add merge workflow
        return [...prev, 'adw_merge_worktree'];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const taskData = {
      title: title.trim(),
      description: htmlToPlainText(description).trim(),
      workItemType,
      queuedStages,
      customAdwId: customAdwId.trim(),
      images: images.map(img => ({
        ...img,
        annotations: imageAnnotations[img.id] || []
      }))
    };

    const validation = validateTask(taskData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    createTask(taskData);

    // Reset form
    setTitle('');
    setDescription('');
    setWorkItemType(WORK_ITEM_TYPES.FEATURE);
    setQueuedStages(['plan', 'implement']);
    setCustomAdwId('');
    setImages([]);
    setErrors([]);
    setImageAnnotations({});
    setAnnotatingImage(null);
  };

  // Toast notification helper
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Work item type options with brutalist styling
  const workItemTypeOptions = [
    {
      value: WORK_ITEM_TYPES.FEATURE,
      label: 'Feature',
      icon: '✨',
      selectedBg: 'bg-blue-500',
      selectedBorder: 'border-blue-600',
      unselectedBg: 'bg-blue-50',
      unselectedBorder: 'border-blue-500',
      unselectedText: 'text-blue-500'
    },
    {
      value: WORK_ITEM_TYPES.CHORE,
      label: 'Chore',
      icon: '🛠',
      selectedBg: 'bg-purple-500',
      selectedBorder: 'border-purple-600',
      unselectedBg: 'bg-purple-50',
      unselectedBorder: 'border-purple-500',
      unselectedText: 'text-purple-500'
    },
    {
      value: WORK_ITEM_TYPES.BUG,
      label: 'Bug',
      icon: '🐛',
      selectedBg: 'bg-red-500',
      selectedBorder: 'border-red-600',
      unselectedBg: 'bg-red-50',
      unselectedBorder: 'border-red-500',
      unselectedText: 'text-red-500'
    },
    {
      value: WORK_ITEM_TYPES.PATCH,
      label: 'Patch',
      icon: '🔧',
      selectedBg: 'bg-amber-400',
      selectedBorder: 'border-amber-500',
      unselectedBg: 'bg-amber-50',
      unselectedBorder: 'border-amber-500',
      unselectedText: 'text-amber-700'
    },
  ];

  // Stage options with icons
  const stageOptions = [
    { id: 'plan', label: 'Plan', icon: '📋' },
    { id: 'implement', label: 'Implement', icon: '🔨' },
    { id: 'test', label: 'Test', icon: '🧪' },
    { id: 'review', label: 'Review', icon: '👀' },
    { id: 'document', label: 'Document', icon: '📄' },
  ];

  return (
    <div className="modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5">
      <div
        ref={modalRef}
        className="bg-white border-[6px] border-black max-w-[1100px] w-full max-h-[95vh] flex flex-col"
        style={{ boxShadow: '12px 12px 0 rgba(0,0,0,0.3)', fontFamily: "'Courier New', monospace" }}
        tabIndex="-1"
      >
        {/* Brutalist Header */}
        <div className="bg-black text-white px-7 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center text-lg font-bold">
              +
            </div>
            <span className="text-base font-bold uppercase tracking-[4px]">New Task</span>
          </div>
          <button
            onClick={toggleTaskInput}
            className="w-9 h-9 flex items-center justify-center border-2 border-gray-500 text-gray-500 text-2xl hover:bg-white hover:text-black hover:border-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-7 overflow-y-auto flex-1">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border-3 border-red-500 p-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Row 1: Title & Type */}
          <div className="grid grid-cols-[1fr_auto] gap-8 mb-6">
            {/* Title */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
                TITLE <span className="text-gray-500 font-normal tracking-[1px]">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-3 border-[3px] border-black bg-white text-[13px] font-medium outline-none h-[50px] transition-all focus:bg-gray-50 focus:shadow-[4px_4px_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5"
                style={{ fontFamily: "'Courier New', monospace" }}
              />
              <div className="text-[9px] text-gray-500 mt-2 uppercase tracking-[0.5px]">
                Leave empty to auto-generate from description
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
                TYPE <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 h-[50px]">
                {workItemTypeOptions.map((option) => {
                  const isSelected = workItemType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setWorkItemType(option.value);
                        showToast(`${option.label.toUpperCase()} selected`);
                      }}
                      className={`w-[105px] px-3 border-[3px] text-[10px] font-bold uppercase tracking-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 h-full
                        ${isSelected
                          ? `${option.selectedBg} ${option.selectedBorder} text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_rgba(0,0,0,0.3)]`
                          : `${option.unselectedBg} ${option.unselectedBorder} ${option.unselectedText} hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)]`
                        }`}
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      <span className="text-[13px]">{option.icon}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Stages */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
              STAGES <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {/* SDLC Preset */}
              <button
                type="button"
                onClick={() => {
                  handleFullSdlcToggle();
                  showToast(isFullSdlcSelected ? 'SDLC deselected' : 'All SDLC stages selected');
                }}
                className={`px-4 py-2.5 border-[3px] border-black text-[9px] font-bold uppercase tracking-[1px] cursor-pointer transition-all flex items-center gap-1.5
                  ${isFullSdlcSelected
                    ? 'bg-black text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#444]'
                    : 'bg-white hover:bg-black hover:text-white'
                  }`}
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <span>⚡</span> SDLC
              </button>

              {/* Individual Stage Buttons */}
              {stageOptions.map((stage) => {
                const isSelected = queuedStages.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageToggle(stage.id)}
                    className={`px-3.5 py-2.5 border-[3px] border-black text-[10px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1.5
                      ${isSelected
                        ? 'bg-black text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#444]'
                        : 'bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000]'
                      }`}
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    {stage.icon} {stage.label}
                  </button>
                );
              })}

              {/* Merge Button */}
              <button
                type="button"
                onClick={() => {
                  handleMergeToggle();
                  showToast(isMergeSelected ? 'Merge deselected' : 'Merge workflow added');
                }}
                className={`px-3.5 py-2.5 border-[3px] text-[10px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1.5
                  ${isMergeSelected
                    ? 'bg-purple-500 border-purple-600 text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#6d28d9]'
                    : 'border-purple-500 text-purple-700 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#6d28d9]'
                  }`}
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <GitMerge size={14} /> Merge
              </button>
            </div>
          </div>

          {/* Main Content Grid: Description + Right Column */}
          <div className="grid grid-cols-[1.5fr_1fr] gap-7">
            {/* Description */}
            <div className="flex flex-col">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
                DESCRIPTION <span className="text-red-500">*</span>
              </label>
              <div className="border-[3px] border-black flex-1 flex flex-col min-h-[420px]">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe what needs to be done..."
                  className="border-none rounded-none flex-1"
                  brutalist={true}
                />
              </div>
            </div>

            {/* Right Column: ADW, Start Option, Attachments */}
            <div className="flex flex-col gap-4">
              {/* ADW Reference */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
                  ADW REFERENCE <span className="text-gray-500 font-normal tracking-[1px]">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAdwId}
                    onChange={(e) => setCustomAdwId(e.target.value)}
                    placeholder="Search or enter ADW ID..."
                    className="w-full px-4 py-3 pr-11 border-[3px] border-black bg-white text-[13px] font-medium outline-none h-[50px] transition-all focus:bg-gray-50 focus:shadow-[4px_4px_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">▼</span>
                </div>
                <div className="text-[9px] text-gray-500 mt-2 uppercase tracking-[0.5px]">
                  8-character ID to reference previous work
                </div>
              </div>

              {/* Start Immediately Option */}
              <button
                type="button"
                onClick={() => {
                  setStartImmediately(!startImmediately);
                  if (!startImmediately) showToast('Will start immediately');
                }}
                className={`w-full px-4 py-3.5 border-[3px] text-[10px] font-bold uppercase cursor-pointer transition-all flex items-center gap-2.5 tracking-[0.5px]
                  ${startImmediately
                    ? 'border-emerald-500 bg-emerald-500 text-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#059669]'
                    : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
                  }`}
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <span className="text-sm">⚡</span>
                Start Immediately
              </button>

              {/* Attachments */}
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-[2px] mb-2.5">
                  ATTACHMENTS
                </label>
                <div
                  {...getRootProps()}
                  className={`border-[3px] border-dashed p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center flex-1 min-h-[180px]
                    ${isDragActive
                      ? 'border-black bg-white -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0_#000]'
                      : 'border-gray-300 bg-gray-50 hover:border-black hover:bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000]'
                    }`}
                >
                  <input {...getInputProps()} />
                  <Paperclip className="h-9 w-9 text-gray-300 mb-3" />
                  <div className="text-[10px] font-bold uppercase tracking-[1px] text-gray-500">
                    {isDragActive ? 'Drop files here...' : 'Drop files or click'}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1.5 uppercase">
                    PNG, JPG, PDF up to 10MB
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Images Preview */}
          {images.length > 0 && (
            <div className="mt-6 space-y-4">
              {images.map((image) => (
                <div key={image.id} className="border-[3px] border-black p-4">
                  <div className="relative inline-block">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="max-w-full h-48 object-contain border border-gray-200 cursor-crosshair"
                      onClick={(e) => handleImageClick(image.id, e)}
                      title="Click to add annotation"
                    />

                    {/* Annotation markers */}
                    {imageAnnotations[image.id]?.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-x-2 -translate-y-2 hover:bg-red-600"
                        style={{
                          left: `${annotation.x}%`,
                          top: `${annotation.y}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnotatingImage({ imageId: image.id, annotationId: annotation.id });
                        }}
                        title={annotation.note || 'Click to edit annotation'}
                      />
                    ))}

                    {/* Remove image button */}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate">{image.name}</span>
                    <span className="text-gray-400 uppercase tracking-wider">
                      {imageAnnotations[image.id]?.length || 0} annotation(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brutalist Footer */}
        <div className="px-7 py-4 bg-gray-100 border-t-[3px] border-black flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => showToast('Draft saved')}
              className="px-5 py-3 border-[3px] border-transparent text-[11px] font-bold uppercase tracking-[1px] cursor-pointer transition-all flex items-center gap-2 text-gray-500 hover:border-black hover:text-black hover:bg-white"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              💾 Draft
            </button>
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase">
              <span className="px-1.5 py-0.5 bg-gray-200 border border-gray-300 text-[9px] font-bold">ESC</span>
              close
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={toggleTaskInput}
              className="px-5 py-3 border-[3px] border-black bg-white text-[11px] font-bold uppercase tracking-[1px] cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000]"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!description.trim() || queuedStages.length === 0}
              className="px-7 py-3.5 border-[3px] border-black bg-black text-white text-[11px] font-bold uppercase tracking-[1px] cursor-pointer transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Create Task →
            </button>
          </div>
        </div>

        {/* Annotation Edit Modal */}
        {annotatingImage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border-[6px] border-black max-w-md w-full mx-4 p-6" style={{ boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}>
              <h3 className="text-base font-bold uppercase tracking-[2px] mb-4" style={{ fontFamily: "'Courier New', monospace" }}>
                Edit Annotation
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ fontFamily: "'Courier New', monospace" }}>
                    Annotation Note
                  </label>
                  <textarea
                    value={
                      imageAnnotations[annotatingImage.imageId]?.find(
                        ann => ann.id === annotatingImage.annotationId
                      )?.note || ''
                    }
                    onChange={(e) => updateAnnotation(
                      annotatingImage.imageId,
                      annotatingImage.annotationId,
                      e.target.value
                    )}
                    placeholder="Describe what you want to highlight..."
                    rows={3}
                    className="w-full px-3 py-2 border-[3px] border-black outline-none focus:shadow-[4px_4px_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      removeAnnotation(annotatingImage.imageId, annotatingImage.annotationId);
                      setAnnotatingImage(null);
                    }}
                    className="px-4 py-2 text-[10px] font-bold uppercase border-[3px] border-red-500 text-red-600 bg-red-50 hover:bg-red-100"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnotatingImage(null)}
                    className="px-4 py-2 text-[10px] font-bold uppercase border-[3px] border-black bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#000] transition-all"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnotatingImage(null)}
                    className="px-4 py-2 text-[10px] font-bold uppercase border-[3px] border-black bg-black text-white hover:bg-gray-800"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        <div
          className={`fixed bottom-8 right-8 bg-black text-white px-5 py-3.5 font-bold z-[3000] text-[10px] uppercase tracking-[1px] transition-transform duration-300 ${
            toast ? 'translate-x-0' : 'translate-x-[400px]'
          }`}
          style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.2)', fontFamily: "'Courier New', monospace" }}
        >
          {toast}
        </div>
      </div>
    </div>
  );
};

export default TaskInput;