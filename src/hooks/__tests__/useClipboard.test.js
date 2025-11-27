import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClipboard } from '../useClipboard';

describe('useClipboard', () => {
  let mockFile;
  let mockBlob;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock blob
    mockBlob = new Blob(['test image data'], { type: 'image/png' });

    // Create mock file
    mockFile = new File([mockBlob], 'test-image.png', {
      type: 'image/png',
      lastModified: Date.now(),
    });

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        read: vi.fn(),
        readText: vi.fn(),
        write: vi.fn(),
        writeText: vi.fn(),
      },
    });

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      writable: true,
      configurable: true,
      value: {
        query: vi.fn(),
      },
    });

    // Mock ClipboardEvent
    global.ClipboardEvent = class ClipboardEvent extends Event {
      constructor(type, eventInitDict = {}) {
        super(type, eventInitDict);
        this.clipboardData = eventInitDict.clipboardData;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useClipboard());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.lastPasteEvent).toBeNull();
    });

    it('should detect clipboard API support', () => {
      const { result } = renderHook(() => useClipboard());

      expect(result.current.isSupported).toBe(true);
    });

    it('should detect lack of clipboard support', () => {
      const originalClipboard = navigator.clipboard;
      delete navigator.clipboard;
      delete window.ClipboardEvent;

      const { result } = renderHook(() => useClipboard());

      expect(result.current.isSupported).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        configurable: true,
        value: originalClipboard,
      });
      global.ClipboardEvent = class ClipboardEvent extends Event {};
    });

    it('should accept custom configuration options', () => {
      const onImagePaste = vi.fn();
      const onTextPaste = vi.fn();
      const onError = vi.fn();
      const maxFileSize = 10 * 1024 * 1024;
      const supportedTypes = ['image/png'];

      const { result } = renderHook(() =>
        useClipboard({
          onImagePaste,
          onTextPaste,
          onError,
          maxFileSize,
          supportedTypes,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('readClipboard', () => {
    it('should read clipboard and return image files', async () => {
      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboard());

      let imageFiles;
      await act(async () => {
        imageFiles = await result.current.readClipboard();
      });

      expect(navigator.clipboard.read).toHaveBeenCalled();
      expect(imageFiles).toHaveLength(1);
      expect(imageFiles[0]).toMatchObject({
        source: 'clipboard',
        type: 'image/png',
      });
      expect(imageFiles[0].file).toBeDefined();
      expect(imageFiles[0].url).toContain('blob:mock-');
    });

    it('should throw error when clipboard API not supported', async () => {
      delete navigator.clipboard.read;

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.readClipboard();
        });
      }).rejects.toThrow('Clipboard API not supported');
    });

    it('should handle clipboard access denied error', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      navigator.clipboard.read.mockRejectedValue(error);

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.readClipboard();
        });
      }).rejects.toThrow('Clipboard access denied');
    });

    it('should handle generic clipboard read errors', async () => {
      navigator.clipboard.read.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.readClipboard();
        });
      }).rejects.toThrow('Failed to read clipboard');
    });

    it('should filter out files larger than maxFileSize', async () => {
      const onError = vi.fn();
      const largeBlob = new Blob(['x'.repeat(6 * 1024 * 1024)], { type: 'image/png' });

      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(largeBlob),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() =>
        useClipboard({
          maxFileSize: 5 * 1024 * 1024,
          onError,
        })
      );

      let imageFiles;
      await act(async () => {
        imageFiles = await result.current.readClipboard();
      });

      expect(imageFiles).toHaveLength(0);
      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('File too large')])
      );
    });

    it('should filter unsupported file types', async () => {
      const mockClipboardItem = {
        types: ['image/bmp'],
        getType: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/bmp' })),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() =>
        useClipboard({
          supportedTypes: ['image/png', 'image/jpeg'],
        })
      );

      let imageFiles;
      await act(async () => {
        imageFiles = await result.current.readClipboard();
      });

      expect(imageFiles).toHaveLength(0);
    });

    it('should call onImagePaste callback when images are found', async () => {
      const onImagePaste = vi.fn();
      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboard({ onImagePaste }));

      await act(async () => {
        await result.current.readClipboard();
      });

      expect(onImagePaste).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'clipboard',
            type: 'image/png',
          }),
        ])
      );
    });
  });

  describe('writeText', () => {
    it('should write text to clipboard', async () => {
      navigator.clipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      let success;
      await act(async () => {
        success = await result.current.writeText('test text');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
      expect(success).toBe(true);
    });

    it('should throw error when writeText not supported', async () => {
      delete navigator.clipboard.writeText;

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.writeText('test');
        });
      }).rejects.toThrow('Clipboard write not supported');
    });

    it('should handle writeText errors', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Write failed'));

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.writeText('test');
        });
      }).rejects.toThrow('Failed to write to clipboard');
    });
  });

  describe('hasImages', () => {
    it('should return true when clipboard contains images', async () => {
      const mockClipboardItem = {
        types: ['image/png', 'text/plain'],
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboard());

      let hasImgs;
      await act(async () => {
        hasImgs = await result.current.hasImages();
      });

      expect(hasImgs).toBe(true);
    });

    it('should return false when clipboard does not contain images', async () => {
      const mockClipboardItem = {
        types: ['text/plain'],
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboard());

      let hasImgs;
      await act(async () => {
        hasImgs = await result.current.hasImages();
      });

      expect(hasImgs).toBe(false);
    });

    it('should return false when clipboard API not available', async () => {
      delete navigator.clipboard.read;

      const { result } = renderHook(() => useClipboard());

      let hasImgs;
      await act(async () => {
        hasImgs = await result.current.hasImages();
      });

      expect(hasImgs).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      navigator.clipboard.read.mockRejectedValue(new Error('Read error'));

      const { result } = renderHook(() => useClipboard());

      let hasImgs;
      await act(async () => {
        hasImgs = await result.current.hasImages();
      });

      expect(hasImgs).toBe(false);
    });
  });

  describe('handlePasteEvent', () => {
    it('should handle image paste events', async () => {
      const onImagePaste = vi.fn();
      const mockDataTransferItem = {
        type: 'image/png',
        getAsFile: vi.fn().mockReturnValue(mockFile),
      };

      const mockClipboardData = {
        items: [mockDataTransferItem],
      };

      const { result } = renderHook(() => useClipboard({ onImagePaste }));

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onImagePaste).toHaveBeenCalled();
      expect(result.current.lastPasteEvent).toMatchObject({
        type: 'image',
        itemCount: 1,
      });
    });

    it('should handle text paste events', async () => {
      const onTextPaste = vi.fn();
      const mockDataTransferItem = {
        type: 'text/plain',
        getAsString: vi.fn((callback) => callback('pasted text')),
      };

      const mockClipboardData = {
        items: [mockDataTransferItem],
      };

      const { result } = renderHook(() => useClipboard({ onTextPaste }));

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      await waitFor(() => {
        expect(onTextPaste).toHaveBeenCalledWith('pasted text');
      });
    });

    it('should prioritize images over text', async () => {
      const onImagePaste = vi.fn();
      const onTextPaste = vi.fn();

      const mockImageItem = {
        type: 'image/png',
        getAsFile: vi.fn().mockReturnValue(mockFile),
      };

      const mockTextItem = {
        type: 'text/plain',
        getAsString: vi.fn((callback) => callback('text')),
      };

      const mockClipboardData = {
        items: [mockImageItem, mockTextItem],
      };

      const { result } = renderHook(() =>
        useClipboard({ onImagePaste, onTextPaste })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(onImagePaste).toHaveBeenCalled();
      expect(onTextPaste).not.toHaveBeenCalled();
    });

    it('should handle paste event without clipboardData', async () => {
      const { result } = renderHook(() => useClipboard());

      const mockEvent = {
        preventDefault: vi.fn(),
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should reject files exceeding maxFileSize', async () => {
      const onError = vi.fn();
      const largeFile = new File(
        [new Blob(['x'.repeat(6 * 1024 * 1024)])],
        'large.png',
        { type: 'image/png' }
      );

      const mockDataTransferItem = {
        type: 'image/png',
        getAsFile: vi.fn().mockReturnValue(largeFile),
      };

      const mockClipboardData = {
        items: [mockDataTransferItem],
      };

      const { result } = renderHook(() =>
        useClipboard({
          maxFileSize: 5 * 1024 * 1024,
          onError,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('File too large')])
      );
    });

    it('should handle errors in processing pasted images', async () => {
      const onError = vi.fn();
      const mockDataTransferItem = {
        type: 'image/png',
        getAsFile: vi.fn().mockImplementation(() => {
          throw new Error('File access error');
        }),
      };

      const mockClipboardData = {
        items: [mockDataTransferItem],
      };

      const { result } = renderHook(() => useClipboard({ onError }));

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('Failed to process pasted image'),
        ])
      );
    });
  });

  describe('setupPasteListener', () => {
    it('should setup paste event listener on document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result } = renderHook(() => useClipboard());

      let cleanup;
      act(() => {
        cleanup = result.current.setupPasteListener();
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'paste',
        expect.any(Function)
      );

      act(() => {
        cleanup();
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'paste',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should setup paste event listener on custom element', () => {
      const customElement = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(customElement, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(customElement, 'removeEventListener');

      const { result } = renderHook(() => useClipboard());

      let cleanup;
      act(() => {
        cleanup = result.current.setupPasteListener(customElement);
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'paste',
        expect.any(Function)
      );

      act(() => {
        cleanup();
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'paste',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('requestPermissions', () => {
    it('should request clipboard permissions', async () => {
      navigator.permissions.query.mockResolvedValue({ state: 'granted' });

      const { result } = renderHook(() => useClipboard());

      let permissionState;
      await act(async () => {
        permissionState = await result.current.requestPermissions();
      });

      expect(navigator.permissions.query).toHaveBeenCalledWith({
        name: 'clipboard-read',
      });
      expect(permissionState).toBe('granted');
    });

    it('should throw error when permissions API not supported', async () => {
      delete navigator.permissions;

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.requestPermissions();
        });
      }).rejects.toThrow('Permissions API not supported');
    });

    it('should handle permission query errors', async () => {
      navigator.permissions.query.mockRejectedValue(new Error('Permission error'));

      const { result } = renderHook(() => useClipboard());

      await expect(async () => {
        await act(async () => {
          await result.current.requestPermissions();
        });
      }).rejects.toThrow('Failed to check clipboard permissions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple image files in one paste', async () => {
      const onImagePaste = vi.fn();
      const file1 = new File([mockBlob], 'image1.png', { type: 'image/png' });
      const file2 = new File([mockBlob], 'image2.jpg', { type: 'image/jpeg' });

      const mockItem1 = {
        type: 'image/png',
        getAsFile: vi.fn().mockReturnValue(file1),
      };

      const mockItem2 = {
        type: 'image/jpeg',
        getAsFile: vi.fn().mockReturnValue(file2),
      };

      const mockClipboardData = {
        items: [mockItem1, mockItem2],
      };

      const { result } = renderHook(() => useClipboard({ onImagePaste }));

      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: mockClipboardData,
      };

      await act(async () => {
        await result.current.handlePasteEvent(mockEvent);
      });

      expect(onImagePaste).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ type: 'image/png' }),
        expect.objectContaining({ type: 'image/jpeg' }),
      ]));
    });

    it('should generate unique IDs for pasted images', async () => {
      const onImagePaste = vi.fn();
      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem, mockClipboardItem]);

      const { result } = renderHook(() => useClipboard({ onImagePaste }));

      await act(async () => {
        await result.current.readClipboard();
      });

      const images = onImagePaste.mock.calls[0][0];
      expect(images[0].id).not.toBe(images[1].id);
    });

    it('should include timestamp in pasted image metadata', async () => {
      const onImagePaste = vi.fn();
      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      };

      navigator.clipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboard({ onImagePaste }));

      const beforeTime = new Date().toISOString();
      await act(async () => {
        await result.current.readClipboard();
      });
      const afterTime = new Date().toISOString();

      const images = onImagePaste.mock.calls[0][0];
      expect(images[0].pastedAt).toBeDefined();
      expect(images[0].pastedAt >= beforeTime).toBe(true);
      expect(images[0].pastedAt <= afterTime).toBe(true);
    });
  });
});
