/**
 * Tests for ClarificationPanel Component (v2 Format)
 * Tests clarification display, approval flow, feedback submission,
 * and auto-trigger functionality with the conversational v2 format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ClarificationPanel from '../ClarificationPanel';
import { useKanbanStore } from '../../../stores/kanbanStore';

// Mock the kanban store
vi.mock('../../../stores/kanbanStore');

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ClarificationPanel Component', () => {
  let mockStore;

  // Mock task without clarification result (in backlog stage)
  const mockTaskPending = {
    id: 1,
    title: 'Test Task',
    description: 'Add a new feature for user authentication',
    stage: 'backlog',
    metadata: {
      adw_id: 'abc12345',
      clarificationStatus: 'pending'
    }
  };

  // Mock task with clarification result (v2 format)
  const mockTaskWithResult = {
    id: 1,
    title: 'Test Task',
    description: 'Add a new feature for user authentication',
    stage: 'backlog',
    metadata: {
      adw_id: 'abc12345',
      clarificationStatus: 'awaiting_approval',
      clarificationResult: {
        understanding: 'Got it! You want me to implement a user authentication system with secure login capabilities. This includes creating a login form, handling JWT tokens for session management, and validating passwords according to security best practices.',
        confidence: 'high',
        questions: [
          'Should we support OAuth providers?',
          'What password complexity rules apply?'
        ]
      }
    }
  };

  // Mock API response for clarification (v2 format)
  const mockClarificationResponse = {
    understanding: 'Got it! You want me to implement a user authentication system with secure login capabilities.',
    confidence: 'high',
    questions: ['Should we support OAuth providers?'],
    status: 'awaiting_approval'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = {
      tasks: [mockTaskPending],
      updateTask: vi.fn().mockResolvedValue(undefined),
      triggerClarification: vi.fn().mockResolvedValue(undefined)
    };

    useKanbanStore.mockReturnValue(mockStore);

    // Mock successful fetch by default
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockClarificationResponse)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders loading state when no clarification result exists', async () => {
      render(
        <ClarificationPanel
          task={mockTaskPending}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should show loading or trigger clarification automatically
      await waitFor(() => {
        expect(screen.getByText(/Understanding Verification/i)).toBeInTheDocument();
      });
    });

    it('renders clarification result when available', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should show the clarification content with v2 format
      expect(screen.getByText(/Is This What You Want\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Got it! You want me to implement a user authentication system/i)).toBeInTheDocument();
    });

    it('displays understanding with confidence badge', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should show the understanding text
      expect(screen.getByText(/Got it! You want me to implement a user authentication system with secure login capabilities/i)).toBeInTheDocument();
      // Should show confidence badge (high = Clear)
      expect(screen.getByText(/Clear/i)).toBeInTheDocument();
    });

    it('displays confidence badge for medium confidence', () => {
      const taskWithMediumConfidence = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'I understand you want to improve performance.',
            confidence: 'medium',
            questions: ['What areas need improvement?']
          }
        }
      };
      mockStore.tasks = [taskWithMediumConfidence];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithMediumConfidence}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should show "Mostly Clear" for medium confidence
      expect(screen.getByText(/Mostly Clear/i)).toBeInTheDocument();
    });

    it('displays all questions from clarification result', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Should we support OAuth providers\?/i)).toBeInTheDocument();
      expect(screen.getByText(/What password complexity rules apply\?/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders approve button when clarification result is available', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Yes, This is Correct!/i)).toBeInTheDocument();
    });

    it('renders feedback button when clarification result is available', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Provide Feedback/i)).toBeInTheDocument();
    });

    it('renders edit button when clarification result is available', () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /Edit Task/i })).toBeInTheDocument();
    });
  });

  describe('Approval Flow', () => {
    it('calls updateTask with stage=plan when approve is clicked', async () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      const onApprove = vi.fn();

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={onApprove}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const approveButton = screen.getByText(/Yes, This is Correct!/i);
      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(mockStore.updateTask).toHaveBeenCalledWith(
          mockTaskWithResult.id,
          expect.objectContaining({
            stage: 'plan',
            metadata: expect.objectContaining({
              clarification_status: 'approved'
            })
          })
        );
      });
    });

    it('calls onApprove callback after successful approval', async () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      const onApprove = vi.fn();

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={onApprove}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const approveButton = screen.getByText(/Yes, This is Correct!/i);
      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalled();
      });
    });
  });

  describe('Feedback Flow', () => {
    it('shows feedback input when Provide Feedback is clicked', async () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const feedbackButton = screen.getByText(/Provide Feedback/i);
      await act(async () => {
        fireEvent.click(feedbackButton);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Help me understand better/i)).toBeInTheDocument();
      });
    });

    it('allows typing in feedback textarea', async () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Click to show feedback input
      const feedbackButton = screen.getByText(/Provide Feedback/i);
      await act(async () => {
        fireEvent.click(feedbackButton);
      });

      const textarea = await screen.findByPlaceholderText(/Help me understand better/i);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'We need OAuth support' } });
      });

      expect(textarea.value).toBe('We need OAuth support');
    });
  });

  describe('Edit Flow', () => {
    it('calls onEdit callback when Edit Task is clicked', async () => {
      mockStore.tasks = [mockTaskWithResult];
      useKanbanStore.mockReturnValue(mockStore);

      const onEdit = vi.fn();

      render(
        <ClarificationPanel
          task={mockTaskWithResult}
          onApprove={vi.fn()}
          onEdit={onEdit}
          onClose={vi.fn()}
        />
      );

      const editButton = screen.getByRole('button', { name: /Edit Task/i });
      await act(async () => {
        fireEvent.click(editButton);
      });

      expect(onEdit).toHaveBeenCalledWith(mockTaskWithResult);
    });
  });

  describe('Auto-trigger Clarification', () => {
    it('auto-triggers clarification when component mounts without result', async () => {
      render(
        <ClarificationPanel
          task={mockTaskPending}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should trigger clarification via store or fetch
      await waitFor(() => {
        expect(
          mockStore.triggerClarification.mock.calls.length > 0 ||
          global.fetch.mock.calls.length > 0
        ).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      mockStore.triggerClarification = null; // Force fallback to fetch

      render(
        <ClarificationPanel
          task={mockTaskPending}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        // Should show error state or retry button
        const errorText = screen.queryByText(/Failed to analyze/i) ||
                         screen.queryByText(/Retry/i);
        // Either error message or retry button should be present
        expect(errorText || screen.getByText(/Analyze Task/i)).toBeInTheDocument();
      });
    });

    it('shows retry button when clarification fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      mockStore.triggerClarification = null;

      render(
        <ClarificationPanel
          task={mockTaskPending}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        // Should show retry option
        const retryButton = screen.queryByText(/Retry/i) || screen.queryByText(/Analyze Task/i);
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Store Subscription', () => {
    it('uses fresh task data from store instead of stale props', () => {
      // Store has updated task with result
      const updatedTask = {
        ...mockTaskPending,
        metadata: {
          ...mockTaskPending.metadata,
          clarificationStatus: 'awaiting_approval',
          clarificationResult: mockClarificationResponse
        }
      };
      mockStore.tasks = [updatedTask];
      useKanbanStore.mockReturnValue(mockStore);

      // Pass stale props (without result)
      render(
        <ClarificationPanel
          task={mockTaskPending}  // Stale props
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should display result from store, not from props (v2 format)
      expect(screen.getByText(/Is This What You Want\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Got it! You want me to implement a user authentication system/i)).toBeInTheDocument();
    });
  });

  describe('Alternative Naming Conventions', () => {
    it('supports snake_case naming for clarification result', () => {
      const taskWithSnakeCase = {
        ...mockTaskPending,
        metadata: {
          adw_id: 'abc12345',
          clarification_status: 'awaiting_approval',
          clarification_result: mockClarificationResponse
        }
      };
      mockStore.tasks = [taskWithSnakeCase];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithSnakeCase}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should show understanding from v2 format
      expect(screen.getByText(/Got it! You want me to implement a user authentication system with secure login capabilities/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles empty questions array gracefully', () => {
      const taskWithEmptyQuestions = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'Got it! You want me to implement user authentication.',
            confidence: 'high',
            questions: []
          }
        }
      };
      mockStore.tasks = [taskWithEmptyQuestions];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithEmptyQuestions}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should not crash and should show the understanding
      expect(screen.getByText(/Got it! You want me to implement user authentication/i)).toBeInTheDocument();
      // Questions section should not be rendered when empty
      expect(screen.queryByText(/Before I Start, I Need to Know/i)).not.toBeInTheDocument();
    });

    it('handles missing questions field', () => {
      const taskWithoutQuestions = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'Got it! You want me to implement user authentication.',
            confidence: 'high'
            // questions field not present
          }
        }
      };
      mockStore.tasks = [taskWithoutQuestions];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithoutQuestions}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Should not crash and should show the understanding
      expect(screen.getByText(/Got it! You want me to implement user authentication/i)).toBeInTheDocument();
    });
  });

  describe('Confidence Levels', () => {
    it('shows "Clear" badge for high confidence', () => {
      const taskWithHighConfidence = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'Got it!',
            confidence: 'high',
            questions: []
          }
        }
      };
      mockStore.tasks = [taskWithHighConfidence];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithHighConfidence}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Clear/i)).toBeInTheDocument();
    });

    it('shows "Mostly Clear" badge for medium confidence', () => {
      const taskWithMediumConfidence = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'I understand you want improvements.',
            confidence: 'medium',
            questions: ['What specifically?']
          }
        }
      };
      mockStore.tasks = [taskWithMediumConfidence];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithMediumConfidence}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Mostly Clear/i)).toBeInTheDocument();
    });

    it('shows "Need More Info" badge for low confidence', () => {
      const taskWithLowConfidence = {
        ...mockTaskWithResult,
        metadata: {
          ...mockTaskWithResult.metadata,
          clarificationResult: {
            understanding: 'I need more details.',
            confidence: 'low',
            questions: ['What do you mean?', 'Can you elaborate?']
          }
        }
      };
      mockStore.tasks = [taskWithLowConfidence];
      useKanbanStore.mockReturnValue(mockStore);

      render(
        <ClarificationPanel
          task={taskWithLowConfidence}
          onApprove={vi.fn()}
          onEdit={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Need More Info/i)).toBeInTheDocument();
    });
  });
});
