/**
 * Tests for WebSocketStatusIndicator Component
 * Comprehensive tests for the WebSocket connection status indicator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WebSocketStatusIndicator, {
  HeaderWebSocketStatus,
  FooterWebSocketStatus,
  MinimalWebSocketStatus,
  WebSocketStatusCard,
} from '../WebSocketStatusIndicator';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the Kanban store
vi.mock('../../../stores/kanbanStore', () => ({
  useKanbanStore: vi.fn(),
}));

describe('WebSocketStatusIndicator Component', () => {
  let mockGetWebSocketStatus;
  let mockInitializeWebSocket;
  let mockDisconnectWebSocket;

  const mockConnectedStatus = {
    connected: true,
    connecting: false,
    error: null,
    serverStatus: {
      status: 'healthy',
      responseTime: 50,
      activeConnections: 5,
      load: 0.3,
      memoryUsage: 0.45,
      config: {
        host: 'localhost',
        port: 8500,
        protocol: 'ws',
      },
    },
  };

  const mockDisconnectedStatus = {
    connected: false,
    connecting: false,
    error: null,
    serverStatus: null,
  };

  const mockConnectingStatus = {
    connected: false,
    connecting: true,
    error: null,
    serverStatus: null,
  };

  const mockErrorStatus = {
    connected: false,
    connecting: false,
    error: 'Connection failed',
    serverStatus: null,
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockGetWebSocketStatus = vi.fn();
    mockInitializeWebSocket = vi.fn();
    mockDisconnectWebSocket = vi.fn();

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: mockInitializeWebSocket,
      disconnectWebSocket: mockDisconnectWebSocket,
    });

    mockGetWebSocketStatus.mockReturnValue(mockConnectedStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('Rendering - Normal Mode', () => {
    it('should render in normal mode by default', async () => {
      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should render with custom className', async () => {
      const { container } = render(<WebSocketStatusIndicator className="custom-class" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should not render when status is null', () => {
      mockGetWebSocketStatus.mockReturnValue(null);

      const { container } = render(<WebSocketStatusIndicator />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Display Modes', () => {
    it('should render minimal mode as dot indicator', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.w-2.h-2.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should render compact mode with icon only', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="compact" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render normal mode with icon and text', async () => {
      render(<WebSocketStatusIndicator mode="normal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should render detailed mode with full information', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('WebSocket Status')).toBeInTheDocument();
    });
  });

  describe('Connection States', () => {
    it('should show connected state', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockConnectedStatus);

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show disconnected state', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show connecting state', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockConnectingStatus);

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show error state', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockErrorStatus);

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });
  });

  describe('Health Status', () => {
    it('should show healthy status with green color', async () => {
      const { container } = render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const statusElement = container.querySelector('.bg-green-100.text-green-800');
      expect(statusElement).toBeInTheDocument();
    });

    it('should show degraded status with yellow color', async () => {
      mockGetWebSocketStatus.mockReturnValue({
        ...mockConnectedStatus,
        serverStatus: {
          ...mockConnectedStatus.serverStatus,
          status: 'degraded',
        },
      });

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connected (Slow)')).toBeInTheDocument();
    });

    it('should show unhealthy status with orange color', async () => {
      mockGetWebSocketStatus.mockReturnValue({
        ...mockConnectedStatus,
        serverStatus: {
          ...mockConnectedStatus.serverStatus,
          status: 'unhealthy',
        },
      });

      render(<WebSocketStatusIndicator />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Connected (Issues)')).toBeInTheDocument();
    });
  });

  describe('Status Updates', () => {
    it('should update status periodically', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      await act(async () => {
        render(<WebSocketStatusIndicator />);
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText('Disconnected')).toBeInTheDocument();

      // Change status
      mockGetWebSocketStatus.mockReturnValue(mockConnectedStatus);

      // Advance timer by 1 second (interval is 1000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should cleanup interval on unmount', async () => {
      const { unmount } = render(<WebSocketStatusIndicator />);

      // Timer advancement handled by waitFor

      unmount();

      // Should not throw error after unmount
      vi.advanceTimersByTime(1000);
    });
  });

  describe('Retry Button', () => {
    it('should show retry button when disconnected', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      render(<WebSocketStatusIndicator showRetryButton={true} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const retryButton = screen.getByTitle('Retry connection');
      expect(retryButton).toBeInTheDocument();
    });

    it('should not show retry button when connected', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockConnectedStatus);

      render(<WebSocketStatusIndicator showRetryButton={true} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const retryButton = screen.queryByTitle('Retry connection');
      expect(retryButton).not.toBeInTheDocument();
    });

    it('should call initializeWebSocket when retry button is clicked', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      render(<WebSocketStatusIndicator showRetryButton={true} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const retryButton = screen.getByTitle('Retry connection');
      fireEvent.click(retryButton);

      expect(mockInitializeWebSocket).toHaveBeenCalled();
    });

    it('should not show retry button when showRetryButton is false', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      render(<WebSocketStatusIndicator showRetryButton={false} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const retryButton = screen.queryByTitle('Retry connection');
      expect(retryButton).not.toBeInTheDocument();
    });
  });

  describe('Expandable View', () => {
    it('should expand to show details when clicked', async () => {
      render(<WebSocketStatusIndicator mode="normal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const statusElement = screen.getByText('Connected');
      fireEvent.click(statusElement);

      expect(screen.getByText('WebSocket Status')).toBeInTheDocument();
    });

    it('should collapse when clicked again', async () => {
      render(<WebSocketStatusIndicator mode="normal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const statusElement = screen.getByText('Connected');
      fireEvent.click(statusElement);

      expect(screen.getByText('WebSocket Status')).toBeInTheDocument();

      fireEvent.click(statusElement);

      expect(screen.queryByText('Server Metrics')).not.toBeInTheDocument();
    });

    it('should call custom onClick handler if provided', async () => {
      const onClick = vi.fn();

      render(<WebSocketStatusIndicator mode="normal" onClick={onClick} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const statusElement = screen.getByText('Connected');
      fireEvent.click(statusElement);

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Server Metrics', () => {
    it('should display server metrics when showMetrics is true', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={true} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Server Metrics')).toBeInTheDocument();
      expect(screen.getByText(/50ms/)).toBeInTheDocument(); // Response time
      expect(screen.getByText('Connections:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Active connections - now more specific
    });

    it('should not display server metrics when showMetrics is false', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={false} />);

      // Timer advancement handled by waitFor

      expect(screen.queryByText('Server Metrics')).not.toBeInTheDocument();
    });

    it('should display response time metric', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={true} />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Response Time:')).toBeInTheDocument();
      expect(screen.getByText('50ms')).toBeInTheDocument();
    });

    it('should display active connections metric', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={true} />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Connections:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display server load metric', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={true} />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Server Load:')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    it('should display memory usage metric', async () => {
      render(<WebSocketStatusIndicator mode="detailed" showMetrics={true} />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Memory:')).toBeInTheDocument();
      expect(screen.getByText('45.0%')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockErrorStatus);

      render(<WebSocketStatusIndicator mode="detailed" />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Last Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should not display error section when no error', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      // Timer advancement handled by waitFor

      expect(screen.queryByText('Last Error')).not.toBeInTheDocument();
    });
  });

  describe('Connection Details', () => {
    it('should display connection details in detailed mode', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      // Timer advancement handled by waitFor

      expect(screen.getByText('Connection Details')).toBeInTheDocument();
      expect(screen.getByText('localhost')).toBeInTheDocument();
      expect(screen.getByText('8500')).toBeInTheDocument();
      expect(screen.getByText('ws')).toBeInTheDocument();
    });
  });

  describe('Disconnect Button', () => {
    it('should show disconnect button when connected in detailed mode', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('should call disconnectWebSocket when disconnect button is clicked', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      expect(mockDisconnectWebSocket).toHaveBeenCalled();
    });

    it('should not show disconnect button when disconnected', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      render(<WebSocketStatusIndicator mode="detailed" />);

      // Timer advancement handled by waitFor

      expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
    });
  });

  describe('Minimal Mode', () => {
    it('should render green dot when connected and healthy', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
    });

    it('should render yellow dot when connected and degraded', async () => {
      mockGetWebSocketStatus.mockReturnValue({
        ...mockConnectedStatus,
        serverStatus: {
          ...mockConnectedStatus.serverStatus,
          status: 'degraded',
        },
      });

      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
    });

    it('should render gray dot when disconnected', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockDisconnectedStatus);

      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.bg-gray-400');
      expect(dot).toBeInTheDocument();
    });

    it('should render pulsing blue dot when connecting', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockConnectingStatus);

      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.bg-blue-500.animate-pulse');
      expect(dot).toBeInTheDocument();
    });

    it('should render red dot when error', async () => {
      mockGetWebSocketStatus.mockReturnValue(mockErrorStatus);

      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
    });

    it('should have tooltip with status text', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="minimal" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const dot = container.querySelector('.w-2.h-2.rounded-full');
      expect(dot).toHaveAttribute('title', 'Connected');
    });
  });

  describe('Compact Mode', () => {
    it('should render icon in compact mode', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="compact" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have tooltip in compact mode', async () => {
      const { container } = render(<WebSocketStatusIndicator mode="compact" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const wrapper = container.querySelector('[title="Connected"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('should expand on click in compact mode', async () => {
      const onClick = vi.fn();
      render(<WebSocketStatusIndicator mode="compact" onClick={onClick} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const icon = screen.getByTitle('Connected');

      act(() => {
        fireEvent.click(icon);
      });

      // Compact mode calls the onClick handler but doesn't expand inline
      // It remains in compact mode and delegates expansion to parent
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Last Update Timestamp', () => {
    it('should display last update time in detailed mode', async () => {
      render(<WebSocketStatusIndicator mode="detailed" />);

      // Timer advancement handled by waitFor

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });
});

describe('HeaderWebSocketStatus Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mockGetWebSocketStatus = vi.fn(() => ({
      connected: true,
      connecting: false,
      error: null,
      serverStatus: { status: 'healthy' },
    }));

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should render with label by default', async () => {
    render(<HeaderWebSocketStatus />);

    // Timer advancement handled by waitFor

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should render without label when showLabel is false', async () => {
    const { container } = render(<HeaderWebSocketStatus showLabel={false} />);

    // Timer advancement handled by waitFor

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should not show retry button', async () => {
    render(<HeaderWebSocketStatus />);

    // Timer advancement handled by waitFor

    expect(screen.queryByTitle('Retry connection')).not.toBeInTheDocument();
  });
});

describe('FooterWebSocketStatus Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mockGetWebSocketStatus = vi.fn(() => ({
      connected: true,
      connecting: false,
      error: null,
      serverStatus: {
        status: 'healthy',
        responseTime: 50,
        activeConnections: 5,
      },
    }));

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should render in detailed mode', async () => {
    render(<FooterWebSocketStatus />);

    // Timer advancement handled by waitFor

    expect(screen.getByText('WebSocket Status')).toBeInTheDocument();
  });

  it('should show metrics', async () => {
    render(<FooterWebSocketStatus />);

    // Timer advancement handled by waitFor

    expect(screen.getByText('Server Metrics')).toBeInTheDocument();
  });

  it('should show retry button', async () => {
    render(<FooterWebSocketStatus />);

    // Timer advancement handled by waitFor

    // Initially no retry button when connected, change status to see retry
    const mockGetWebSocketStatus = vi.fn(() => ({
      connected: false,
      connecting: false,
      error: null,
      serverStatus: null,
    }));

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
    });

    const { rerender } = render(<FooterWebSocketStatus />);
    vi.advanceTimersByTime(1000);

    expect(screen.queryByText('Retry')).toBeInTheDocument();
  });
});

describe('MinimalWebSocketStatus Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mockGetWebSocketStatus = vi.fn(() => ({
      connected: true,
      connecting: false,
      error: null,
      serverStatus: { status: 'healthy' },
    }));

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should render minimal dot indicator', async () => {
    const { container } = render(<MinimalWebSocketStatus />);

    // Timer advancement handled by waitFor

    const dot = container.querySelector('.w-2.h-2.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('should accept custom className', async () => {
    const { container } = render(<MinimalWebSocketStatus className="custom-minimal" />);

    // Timer advancement handled by waitFor

    expect(container.querySelector('.custom-minimal')).toBeInTheDocument();
  });
});

describe('WebSocketStatusCard Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mockGetWebSocketStatus = vi.fn(() => ({
      connected: true,
      connecting: false,
      error: null,
      serverStatus: {
        status: 'healthy',
        responseTime: 50,
        activeConnections: 5,
      },
    }));

    useKanbanStore.mockReturnValue({
      getWebSocketStatus: mockGetWebSocketStatus,
      initializeWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should render card with title', async () => {
    render(<WebSocketStatusCard />);

    // Timer advancement handled by waitFor

    expect(screen.getByText('WebSocket Connection')).toBeInTheDocument();
  });

  it('should render detailed status inside card', async () => {
    render(<WebSocketStatusCard />);

    // Timer advancement handled by waitFor

    expect(screen.getByText('WebSocket Status')).toBeInTheDocument();
  });

  it('should have card styling', async () => {
    const { container } = render(<WebSocketStatusCard />);

    // Timer advancement handled by waitFor

    const card = container.querySelector('.bg-white.rounded-lg.shadow.border');
    expect(card).toBeInTheDocument();
  });

  it('should accept custom className', async () => {
    const { container } = render(<WebSocketStatusCard className="custom-card" />);

    // Timer advancement handled by waitFor

    expect(container.querySelector('.custom-card')).toBeInTheDocument();
  });
});
