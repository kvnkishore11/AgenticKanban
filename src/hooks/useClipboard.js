/**
 * Custom hook for handling clipboard operations
 * Supports detecting and handling pasted images from clipboard
 */

import { useState, useCallback, useEffect } from 'react';

export const useClipboard = ({
  onImagePaste = null,
  onTextPaste = null,
  onError = null,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
} = {}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [lastPasteEvent, setLastPasteEvent] = useState(null);

  // Check clipboard API support
  useEffect(() => {
    const checkSupport = () => {
      const hasNavigatorClipboard = !!navigator.clipboard;
      const hasClipboardEvents = 'ClipboardEvent' in window;

      setIsSupported(hasNavigatorClipboard || hasClipboardEvents);
    };

    checkSupport();
  }, []);

  /**
   * Convert clipboard item to file object
   */
  const clipboardItemToFile = useCallback((item, type) => {
    return new Promise((resolve) => {
      const blob = item.getType(type);
      blob.then((blobData) => {
        const timestamp = Date.now();
        const extension = type.split('/')[1] || 'png';
        const file = new File([blobData], `pasted-image-${timestamp}.${extension}`, {
          type: type,
          lastModified: timestamp,
        });
        resolve(file);
      }).catch(() => resolve(null));
    });
  }, []);

  /**
   * Process pasted files from clipboard
   */
  const processPastedFiles = useCallback(async (clipboardItems) => {
    const imageFiles = [];
    const errors = [];

    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (supportedTypes.includes(type)) {
          try {
            const file = await clipboardItemToFile(item, type);
            if (file) {
              // Check file size
              if (file.size > maxFileSize) {
                errors.push(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
                continue;
              }

              // Create image object with URL for preview
              const imageObject = {
                id: Date.now() + Math.random(),
                file,
                url: URL.createObjectURL(file),
                name: file.name,
                size: file.size,
                type: file.type,
                source: 'clipboard',
                pastedAt: new Date().toISOString(),
              };

              imageFiles.push(imageObject);
            }
          } catch (error) {
            errors.push(`Failed to process pasted file: ${error.message}`);
          }
        }
      }
    }

    if (errors.length > 0 && onError) {
      onError(errors);
    }

    if (imageFiles.length > 0 && onImagePaste) {
      onImagePaste(imageFiles);
    }

    return imageFiles;
  }, [clipboardItemToFile, supportedTypes, maxFileSize, onImagePaste, onError]);

  /**
   * Handle paste event from clipboard events
   */
  const handlePasteEvent = useCallback(async (event) => {
    if (!event.clipboardData) return;

    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    const textItems = items.filter(item => item.type.startsWith('text/'));

    // Process images
    if (imageItems.length > 0) {
      event.preventDefault();

      const imageFiles = [];
      const errors = [];

      for (const item of imageItems) {
        if (supportedTypes.includes(item.type)) {
          try {
            const file = item.getAsFile();
            if (file) {
              // Check file size
              if (file.size > maxFileSize) {
                errors.push(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
                continue;
              }

              // Create image object
              const imageObject = {
                id: Date.now() + Math.random(),
                file,
                url: URL.createObjectURL(file),
                name: file.name || `pasted-image-${Date.now()}.${item.type.split('/')[1]}`,
                size: file.size,
                type: file.type,
                source: 'clipboard',
                pastedAt: new Date().toISOString(),
              };

              imageFiles.push(imageObject);
            }
          } catch (error) {
            errors.push(`Failed to process pasted image: ${error.message}`);
          }
        }
      }

      if (errors.length > 0 && onError) {
        onError(errors);
      }

      if (imageFiles.length > 0 && onImagePaste) {
        onImagePaste(imageFiles);
      }

      setLastPasteEvent({
        type: 'image',
        itemCount: imageFiles.length,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // Process text if no images
    if (textItems.length > 0 && onTextPaste) {
      for (const item of textItems) {
        item.getAsString((text) => {
          onTextPaste(text);
          setLastPasteEvent({
            type: 'text',
            content: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString(),
          });
        });
      }
    }
  }, [supportedTypes, maxFileSize, onImagePaste, onTextPaste, onError]);

  /**
   * Read clipboard using Clipboard API
   */
  const readClipboard = useCallback(async () => {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      throw new Error('Clipboard API not supported');
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      return await processPastedFiles(clipboardItems);
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Clipboard access denied. Please allow clipboard permissions.');
      }
      throw new Error(`Failed to read clipboard: ${error.message}`);
    }
  }, [processPastedFiles]);

  /**
   * Write text to clipboard
   */
  const writeText = useCallback(async (text) => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard write not supported');
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      throw new Error(`Failed to write to clipboard: ${error.message}`);
    }
  }, []);

  /**
   * Check if clipboard contains images
   */
  const hasImages = useCallback(async () => {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      return false;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      return clipboardItems.some(item =>
        item.types.some(type => supportedTypes.includes(type))
      );
    } catch {
      return false;
    }
  }, [supportedTypes]);

  /**
   * Setup paste event listener
   */
  const setupPasteListener = useCallback((element = document) => {
    element.addEventListener('paste', handlePasteEvent);

    return () => {
      element.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePasteEvent]);

  /**
   * Request clipboard permissions
   */
  const requestPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      throw new Error('Permissions API not supported');
    }

    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' });
      return permission.state;
    } catch (error) {
      throw new Error(`Failed to check clipboard permissions: ${error.message}`);
    }
  }, []);

  return {
    // State
    isSupported,
    lastPasteEvent,

    // Methods
    readClipboard,
    writeText,
    hasImages,
    setupPasteListener,
    requestPermissions,
    handlePasteEvent,

    // Utils
    processPastedFiles,
  };
};

export default useClipboard;