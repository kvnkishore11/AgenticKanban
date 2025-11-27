/**
 * Tests for SettingsModal Component
 * Comprehensive tests for application settings modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from '../SettingsModal';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock dependencies
vi.mock('../../../stores/kanbanStore');

describe('SettingsModal Component', () => {
  let mockStore;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockStore = {
      getCurrentProject: vi.fn(() => ({
        id: 'proj-1',
        name: 'Test Project',
        path: '/path/to/project',
        description: 'Test project description'
      })),
      getWebSocketStatus: vi.fn(() => ({
        connected: false,
        error: null
      })),
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn()
    };
    useKanbanStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<SettingsModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
    });

    it('should render done button', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });
  });

  describe('Current Project Section', () => {
    it('should display current project information', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('/path/to/project')).toBeInTheDocument();
      expect(screen.getByText('Test project description')).toBeInTheDocument();
    });

    it('should show Active badge for current project', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show "No project" message when no project is selected', () => {
      mockStore.getCurrentProject.mockReturnValue(null);
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('No project currently selected')).toBeInTheDocument();
    });

    it('should handle project without description', () => {
      mockStore.getCurrentProject.mockReturnValue({
        id: 'proj-1',
        name: 'Test Project',
        path: '/path/to/project'
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.queryByText('Test project description')).not.toBeInTheDocument();
    });
  });

  describe('WebSocket Connection Section', () => {
    it('should display WebSocket Server section', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('WebSocket Server')).toBeInTheDocument();
    });

    it('should display Disconnected status when not connected', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should display Connected status when connected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: true,
        error: null
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display Connection Error status on error', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: false,
        error: 'Connection refused'
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      // Check for the status badge showing "Connection Error"
      const connectionErrorElements = screen.getAllByText('Connection Error');
      expect(connectionErrorElements.length).toBeGreaterThan(0);
    });

    it('should render server port input field', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const portInput = screen.getByPlaceholderText('3001');
      expect(portInput).toBeInTheDocument();
      expect(portInput).toHaveValue(3001);
    });

    it('should update port when input changes', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const portInput = screen.getByPlaceholderText('3001');
      fireEvent.change(portInput, { target: { value: '3002' } });

      expect(portInput).toHaveValue(3002);
    });

    it('should enforce port number constraints', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const portInput = screen.getByPlaceholderText('3001');
      expect(portInput).toHaveAttribute('min', '1');
      expect(portInput).toHaveAttribute('max', '65535');
    });
  });

  describe('WebSocket Connection Controls', () => {
    it('should show Connect button when disconnected', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });

    it('should show Disconnect button when connected', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: true,
        error: null
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('should call initializeWebSocket when Connect is clicked', async () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockStore.initializeWebSocket).toHaveBeenCalled();
      });
    });

    it('should call disconnectWebSocket when Disconnect is clicked', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: true,
        error: null
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);

      expect(mockStore.disconnectWebSocket).toHaveBeenCalled();
    });

    it('should disable Connect button when port is empty', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const portInput = screen.getByPlaceholderText('3001');
      fireEvent.change(portInput, { target: { value: '' } });

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeDisabled();
    });

    it('should show Connecting... when connection is in progress', async () => {
      mockStore.initializeWebSocket.mockImplementation(() => new Promise(() => {}));
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        // Check both the status badge and the button text
        const connectingElements = screen.getAllByText('Connecting...');
        expect(connectingElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle connection errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStore.initializeWebSocket.mockRejectedValue(new Error('Connection failed'));

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('WebSocket Error Display', () => {
    it('should display error message when connection error exists', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: false,
        error: 'Connection refused'
      });
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });

    it('should not display error message when no error exists', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
    });
  });

  describe('Help Text and Information', () => {
    it('should display WebSocket connection help text', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/connect to the websocket server/i)).toBeInTheDocument();
    });

    it('should display port information', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/port where the websocket server is running/i)).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Done button is clicked', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const doneButton = screen.getByRole('button', { name: /done/i });
      fireEvent.click(doneButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle ESC key press', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Status Icons and Styling', () => {
    it('should show appropriate icon for disconnected state', () => {
      const { container } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(container.querySelector('.text-gray-600')).toBeInTheDocument();
    });

    it('should show appropriate icon for connected state', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: true,
        error: null
      });
      const { container } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('should show appropriate icon for error state', () => {
      mockStore.getWebSocketStatus.mockReturnValue({
        connected: false,
        error: 'Connection error'
      });
      const { container } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null project gracefully', () => {
      mockStore.getCurrentProject.mockReturnValue(null);
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('No project currently selected')).toBeInTheDocument();
    });

    it('should handle missing WebSocket status', () => {
      mockStore.getWebSocketStatus.mockReturnValue(null);
      const { container } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(container).toBeInTheDocument();
    });

    it('should update WebSocket status when modal reopens', () => {
      const { rerender } = render(<SettingsModal isOpen={false} onClose={mockOnClose} />);

      mockStore.getWebSocketStatus.mockReturnValue({
        connected: true,
        error: null
      });

      rerender(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should focus modal on open', () => {
      const { container } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const modal = container.querySelector('[tabindex="-1"]');
      expect(modal).toBeInTheDocument();
    });
  });
});
