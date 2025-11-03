/**
 * @fileoverview Task creation form component for creating new work items
 *
 * Provides a comprehensive form interface for creating tasks with support for
 * work item types, stage selection, image attachments with annotations, and
 * clipboard paste functionality. Validates input and integrates with the kanban
 * store for task creation.
 *
 * @module components/forms/TaskInput
 */

import { useState, useEffect, useRef } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { WORK_ITEM_TYPES, QUEUEABLE_STAGES, SDLC_STAGES } from '../../constants/workItems';
import { X, Plus, Image as ImageIcon, Clipboard } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useClipboard } from '../../hooks/useClipboard';

const TaskInput = () => {
  const {
    createTask,
    toggleTaskInput,
    validateTask,
    selectedProject,
    projectNotificationEnabled,
  } = useKanbanStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workItemType, setWorkItemType] = useState(WORK_ITEM_TYPES.FEATURE);
  const [queuedStages, setQueuedStages] = useState(['plan', 'implement']);
  const [customAdwId, setCustomAdwId] = useState('');
  const [adwIdError, setAdwIdError] = useState('');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [annotatingImage, setAnnotatingImage] = useState(null);
  const [imageAnnotations, setImageAnnotations] = useState({});
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [clipboardError, setClipboardError] = useState('');
  const modalRef = useRef(null);

  // Notification preference state
  const [enableNotifications, setEnableNotifications] = useState(true);

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

  // Set notification preference based on global setting
  useEffect(() => {
    setEnableNotifications(projectNotificationEnabled && selectedProject?.id);
  }, [selectedProject, projectNotificationEnabled]);

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


  // Validate ADW ID format
  const validateAdwId = (value) => {
    if (!value || !value.trim()) {
      return ''; // Empty is valid (optional field)
    }

    const trimmed = value.trim();
    const validPattern = /^[a-zA-Z0-9_-]{1,100}$/;

    if (!validPattern.test(trimmed)) {
      return 'ADW ID must contain only alphanumeric characters, hyphens, and underscores (1-100 characters)';
    }

    return '';
  };

  // Handle ADW ID change with validation
  const handleAdwIdChange = (e) => {
    const value = e.target.value;
    setCustomAdwId(value);

    // Validate and set error message
    const errorMessage = validateAdwId(value);
    setAdwIdError(errorMessage);
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check for client-side ADW ID validation errors
    if (adwIdError) {
      setErrors([adwIdError]);
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      workItemType,
      queuedStages,
      customAdwId: customAdwId.trim(),
      images: images.map(img => ({
        ...img,
        annotations: imageAnnotations[img.id] || []
      })),
      notificationPreferences: {
        enabled: enableNotifications && selectedProject?.id && projectNotificationEnabled,
        projectId: selectedProject?.id
      }
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
    setAdwIdError('');
    setImages([]);
    setErrors([]);
    setImageAnnotations({});
    setAnnotatingImage(null);
  };

  const workItemTypeOptions = [
    { value: WORK_ITEM_TYPES.FEATURE, label: 'Feature', color: 'bg-blue-100 text-blue-800' },
    { value: WORK_ITEM_TYPES.CHORE, label: 'Chore', color: 'bg-gray-100 text-gray-800' },
    { value: WORK_ITEM_TYPES.BUG, label: 'Bug', color: 'bg-red-100 text-red-800' },
    { value: WORK_ITEM_TYPES.PATCH, label: 'Patch', color: 'bg-yellow-100 text-yellow-800' },
  ];

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex="-1"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={toggleTaskInput}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Paste Success Message */}
          {pasteSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Clipboard className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-800">
                  Image(s) pasted successfully!
                </span>
              </div>
            </div>
          )}

          {/* Clipboard Error Message */}
          {clipboardError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Clipboard className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-800">
                  Paste error: {clipboardError}
                </span>
              </div>
            </div>
          )}

          {/* Optional Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title (optional)..."
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to auto-generate from description
            </p>
          </div>

          {/* Work Item Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Work Item Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {workItemTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`relative cursor-pointer rounded-lg border p-4 text-center transition-all
                    ${workItemType === option.value
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="workItemType"
                    value={option.value}
                    checked={workItemType === option.value}
                    onChange={(e) => setWorkItemType(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`inline-flex items-center justify-center w-full px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
                    {option.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ADW ID Input Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ADW ID (optional)
            </label>
            <input
              type="text"
              value={customAdwId}
              onChange={handleAdwIdChange}
              placeholder="Leave empty for auto-generated ID"
              className={`input-field ${adwIdError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {adwIdError && (
              <p className="mt-1 text-sm text-red-600">
                {adwIdError}
              </p>
            )}
            {!adwIdError && (
              <p className="mt-1 text-xs text-gray-500">
                Specify a custom ADW ID if required by your workflow. Must contain only alphanumeric characters, hyphens, and underscores.
              </p>
            )}
          </div>

          {/* Stage Queue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Queue Stages *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Select the stages this task should progress through
            </p>

            {/* Full SDLC Quick Selection */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleFullSdlcToggle}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  isFullSdlcSelected
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {isFullSdlcSelected ? '✓ SDLC Selected' : 'SDLC'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Quickly select all SDLC stages: Plan, Implement, Test, Review, Document
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {QUEUEABLE_STAGES.map((stage) => (
                <label
                  key={stage.id}
                  className={`relative cursor-pointer rounded-lg border p-3 transition-all
                    ${queuedStages.includes(stage.id)
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={queuedStages.includes(stage.id)}
                    onChange={() => handleStageToggle(stage.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 bg-${stage.color}-400`}></div>
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            />
            <p className="mt-1 text-xs text-gray-500">
              Plain text description of the task requirements
            </p>
          </div>

          {/* Notification Settings */}
          {selectedProject && projectNotificationEnabled && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  onChange={(e) => setEnableNotifications(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Send notification to {selectedProject.name} when task is created
                </span>
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Configure notification settings in project settings
              </p>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <input {...getInputProps()} />
              <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              {isDragActive ? (
                <p className="text-blue-600">Drop images here...</p>
              ) : (
                <div>
                  <p className="text-gray-600">
                    {clipboardSupported
                      ? "Drag & drop or paste images here, or click to select"
                      : "Drag & drop images here, or click to select"
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports PNG, JPG, GIF, WebP (max 5MB)
                    {clipboardSupported && " • Use Ctrl+V (Cmd+V) to paste"}
                  </p>
                </div>
              )}
            </div>

            {/* Uploaded Images Preview */}
            {images.length > 0 && (
              <div className="mt-4 space-y-4">
                {images.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="relative inline-block">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="max-w-full h-48 object-contain rounded border border-gray-100 cursor-crosshair"
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
                        >
                          <span className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {annotation.note || 'No note'}
                          </span>
                        </div>
                      ))}

                      {/* Remove image button */}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">{image.name}</p>
                      <p className="text-xs text-gray-500">
                        {imageAnnotations[image.id]?.length || 0} annotation(s)
                      </p>
                    </div>

                    {/* Annotations list */}
                    {imageAnnotations[image.id]?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Annotations:</h4>
                        {imageAnnotations[image.id].map((annotation, index) => (
                          <div key={annotation.id} className="flex items-start gap-2 text-sm">
                            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></span>
                            <span className="flex-1 text-gray-600">
                              {annotation.note || `Annotation ${index + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAnnotatingImage({ imageId: image.id, annotationId: annotation.id })}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAnnotation(image.id, annotation.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Click on the image to add annotations
                      {clipboardSupported && " • You can paste more images with Ctrl+V (Cmd+V)"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Annotation Edit Modal */}
          {annotatingImage && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Annotation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        removeAnnotation(annotatingImage.imageId, annotatingImage.annotationId);
                        setAnnotatingImage(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnotatingImage(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnotatingImage(null)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={toggleTaskInput}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={!description.trim() || queuedStages.length === 0}
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskInput;