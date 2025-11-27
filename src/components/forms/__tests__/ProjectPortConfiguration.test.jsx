/**
 * Tests for ProjectPortConfiguration Component
 * Comprehensive tests for project port configuration and notification settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectPortConfiguration from '../ProjectPortConfiguration';
import projectNotificationService from '../../../services/storage/projectNotificationService';

// Mock the project notification service
vi.mock('../../../services/storage/projectNotificationService', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
    getProjectStatus: vi.fn(() => ({ connected: false })),
    testConnection: vi.fn(),
    connectToProject: vi.fn(),
    disconnectFromProject: vi.fn(),
    commonPorts: [3000, 3001, 5173, 8080, 5000, 4200]
  }
}));

describe('ProjectPortConfiguration Component', () => {
  const mockOnConfigurationChange = vi.fn();
  const mockOnConnectionStatusChange = vi.fn();

  const MOCK_PROJECT = {
    id: 'proj-1',
    name: 'Test Project',
    path: '/path/to/project'
  };

  const DEFAULT_CONFIG = {
    host: 'localhost',
    port: '',
    autoDiscover: true,
    enabled: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render project notification settings section', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Project Notification Settings')).toBeInTheDocument();
    });

    it('should display project name', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should render enable checkbox', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Enable project notifications')).toBeInTheDocument();
    });

    it('should render auto-discover checkbox', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Auto-discover development server port')).toBeInTheDocument();
    });

    it('should show connection status badge', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  describe('Enable/Disable Configuration', () => {
    it('should be enabled by default', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const enableCheckbox = screen.getByRole('checkbox', { name: /enable project notifications/i });
      expect(enableCheckbox).toBeChecked();
    });

    it('should toggle enabled state when checkbox is clicked', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} onConfigurationChange={mockOnConfigurationChange} />);

      const enableCheckbox = screen.getByRole('checkbox', { name: /enable project notifications/i });
      fireEvent.click(enableCheckbox);

      expect(mockOnConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it('should hide configuration options when disabled', () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, enabled: false }}
        />
      );

      expect(screen.queryByText('Auto-discover development server port')).not.toBeInTheDocument();
    });

    it('should show configuration options when enabled', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Auto-discover development server port')).toBeInTheDocument();
    });
  });

  describe('Auto-Discovery', () => {
    it('should enable auto-discover by default', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const autoDiscoverCheckbox = screen.getByRole('checkbox', { name: /auto-discover/i });
      expect(autoDiscoverCheckbox).toBeChecked();
    });

    it('should toggle auto-discover when checkbox is clicked', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} onConfigurationChange={mockOnConfigurationChange} />);

      const autoDiscoverCheckbox = screen.getByRole('checkbox', { name: /auto-discover/i });
      fireEvent.click(autoDiscoverCheckbox);

      expect(mockOnConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({ autoDiscover: false })
      );
    });

    it('should show Discover Ports button when auto-discover is enabled', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByRole('button', { name: /discover ports/i })).toBeInTheDocument();
    });

    it('should call testConnection for each common port when discovering', async () => {
      projectNotificationService.testConnection.mockResolvedValue(false);
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const discoverButton = screen.getByRole('button', { name: /discover ports/i });
      fireEvent.click(discoverButton);

      await waitFor(() => {
        expect(projectNotificationService.testConnection).toHaveBeenCalled();
      });
    });

    it('should display discovered ports', async () => {
      projectNotificationService.testConnection
        .mockResolvedValueOnce(true)  // 3000
        .mockResolvedValue(false);

      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const discoverButton = screen.getByRole('button', { name: /discover ports/i });
      fireEvent.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/found 1 active server/i)).toBeInTheDocument();
      });
    });

    it('should show Discovering... while scanning ports', async () => {
      projectNotificationService.testConnection.mockImplementation(() => new Promise(() => {}));
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const discoverButton = screen.getByRole('button', { name: /discover ports/i });
      fireEvent.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText('Discovering...')).toBeInTheDocument();
      });
    });

    it('should auto-select first discovered port', async () => {
      projectNotificationService.testConnection
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);

      render(<ProjectPortConfiguration project={MOCK_PROJECT} onConfigurationChange={mockOnConfigurationChange} />);

      const discoverButton = screen.getByRole('button', { name: /discover ports/i });
      fireEvent.click(discoverButton);

      await waitFor(() => {
        expect(mockOnConfigurationChange).toHaveBeenCalledWith(
          expect.objectContaining({ port: '3000' })
        );
      });
    });

    it('should display error when no ports are found', async () => {
      projectNotificationService.testConnection.mockResolvedValue(false);
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const discoverButton = screen.getByRole('button', { name: /discover ports/i });
      fireEvent.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/no active development servers found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Manual Configuration', () => {
    it('should render port input field', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByPlaceholderText('3000')).toBeInTheDocument();
    });

    it('should update port when input changes', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} onConfigurationChange={mockOnConfigurationChange} />);

      const portInput = screen.getByPlaceholderText('3000');
      fireEvent.change(portInput, { target: { value: '3001' } });

      expect(mockOnConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({ port: '3001' })
      );
    });

    it('should show host input when showAdvanced is true', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} showAdvanced={true} />);

      expect(screen.getByPlaceholderText('localhost')).toBeInTheDocument();
    });

    it('should not show host input when showAdvanced is false', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} showAdvanced={false} />);

      expect(screen.queryByPlaceholderText('localhost')).not.toBeInTheDocument();
    });

    it('should enforce port constraints', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const portInput = screen.getByPlaceholderText('3000');
      expect(portInput).toHaveAttribute('min', '1');
      expect(portInput).toHaveAttribute('max', '65535');
    });

    it('should display common ports in help text', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText(/common ports:/i)).toBeInTheDocument();
    });
  });

  describe('Connection Controls', () => {
    it('should show Test Connection button', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
    });

    it('should show Connect button when disconnected', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByRole('button', { name: /^connect$/i })).toBeInTheDocument();
    });

    it('should disable Test Connection when port is empty', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} initialConfig={DEFAULT_CONFIG} />);

      const testButton = screen.getByRole('button', { name: /test connection/i });
      expect(testButton).toBeDisabled();
    });

    it('should call testConnection when Test Connection is clicked', async () => {
      projectNotificationService.testConnection.mockResolvedValue(true);
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(projectNotificationService.testConnection).toHaveBeenCalledWith('localhost', 3000, 5000);
      });
    });

    it('should call connectToProject when Connect is clicked', async () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const connectButton = screen.getByRole('button', { name: /^connect$/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(projectNotificationService.connectToProject).toHaveBeenCalledWith(
          'proj-1',
          { host: 'localhost', port: 3000 }
        );
      });
    });

    it('should show Disconnect button when connected', () => {
      projectNotificationService.getProjectStatus.mockReturnValue({ connected: true });
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('should call disconnectFromProject when Disconnect is clicked', () => {
      projectNotificationService.getProjectStatus.mockReturnValue({ connected: true });
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);

      expect(projectNotificationService.disconnectFromProject).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('Connection Status', () => {
    it('should display Connected status when connected', () => {
      projectNotificationService.getProjectStatus.mockReturnValue({ connected: true });
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should call onConnectionStatusChange when status changes', () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          onConnectionStatusChange={mockOnConnectionStatusChange}
        />
      );

      // Get the connect handler that was registered
      const connectHandler = projectNotificationService.on.mock.calls.find(
        call => call[1] === 'connect'
      )?.[2];

      // Simulate connect event
      connectHandler?.();

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('connected');
    });

    it('should handle connection errors', async () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      const errorHandler = projectNotificationService.on.mock.calls.find(
        call => call[1] === 'error'
      )?.[2];

      // Trigger error event
      await waitFor(() => {
        errorHandler?.({ error: 'Connection failed' });
      });

      // The component shows the error in the lastError state which displays in error message div
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });

    it('should show Test Successful temporarily', async () => {
      projectNotificationService.testConnection.mockResolvedValue(true);
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Test Successful')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Configuration', () => {
    it('should show Reset button', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('should reset configuration to defaults when Reset is clicked', () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
          onConfigurationChange={mockOnConfigurationChange}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(mockOnConfigurationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: '',
          autoDiscover: true,
          enabled: true
        })
      );
    });

    it('should clear errors when Reset is clicked', () => {
      projectNotificationService.testConnection.mockRejectedValue(new Error('Test error'));
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Change Detection', () => {
    it('should show unsaved changes indicator when config changes', () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const portInput = screen.getByPlaceholderText('3000');
      fireEvent.change(portInput, { target: { value: '3001' } });

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('should not show unsaved changes when config matches initial', () => {
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });
  });

  describe('Help and Information', () => {
    it('should display how it works section', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText(/how it works:/i)).toBeInTheDocument();
    });

    it('should explain auto-discovery', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText(/auto-discovery scans common development ports/i)).toBeInTheDocument();
    });

    it('should explain WebSocket notifications', () => {
      render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      expect(screen.getByText(/notifications are sent as websocket messages/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle project without id', () => {
      const projectWithoutId = { name: 'Test', path: '/test' };
      render(<ProjectPortConfiguration project={projectWithoutId} />);

      expect(screen.getByText('Project Notification Settings')).toBeInTheDocument();
    });

    it('should handle null project', () => {
      render(<ProjectPortConfiguration project={null} />);

      expect(screen.getByText('Project Notification Settings')).toBeInTheDocument();
    });

    it('should handle connection test failure', async () => {
      projectNotificationService.testConnection.mockResolvedValue(false);
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
      });
    });

    it('should handle connection test error', async () => {
      projectNotificationService.testConnection.mockRejectedValue(new Error('Network error'));
      render(
        <ProjectPortConfiguration
          project={MOCK_PROJECT}
          initialConfig={{ ...DEFAULT_CONFIG, port: '3000' }}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/connection test failed/i)).toBeInTheDocument();
      });
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<ProjectPortConfiguration project={MOCK_PROJECT} />);

      unmount();

      expect(projectNotificationService.off).toHaveBeenCalled();
    });
  });
});
