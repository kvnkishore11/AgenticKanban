/**
 * @fileoverview Unit Tests for PatchTabsPanel Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatchTabsPanel from '../PatchTabsPanel';

describe('PatchTabsPanel', () => {
  const mockOnPatchSelect = vi.fn();

  const mockPatches = [
    {
      patch_number: 1,
      status: 'completed',
      patch_reason: 'Fix typo in header',
      timestamp: '2024-01-01T10:00:00Z',
      adw_id: 'patch-adw-1'
    },
    {
      patch_number: 2,
      status: 'in_progress',
      patch_reason: 'Update API endpoint',
      timestamp: '2024-01-02T10:00:00Z',
      adw_id: 'patch-adw-2'
    },
    {
      patch_number: 3,
      status: 'failed',
      patch_reason: 'Add error handling',
      timestamp: '2024-01-03T10:00:00Z',
      adw_id: 'patch-adw-3'
    },
    {
      patch_number: 4,
      status: 'pending',
      patch_reason: 'Refactor component',
      timestamp: '2024-01-04T10:00:00Z'
    }
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when patches array is empty', () => {
    const { container } = render(
      <PatchTabsPanel
        patches={[]}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when patches is null', () => {
    const { container } = render(
      <PatchTabsPanel
        patches={null}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render patch tabs for all patches', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    expect(screen.getByText('PATCH 1')).toBeInTheDocument();
    expect(screen.getByText('PATCH 2')).toBeInTheDocument();
    expect(screen.getByText('PATCH 3')).toBeInTheDocument();
    expect(screen.getByText('PATCH 4')).toBeInTheDocument();
  });

  it('should display correct status indicators for each patch', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');

    // Patch 1 - completed (✓)
    expect(buttons[0]).toHaveTextContent('✓');
    expect(buttons[0]).toHaveClass('patch-tab-completed');

    // Patch 2 - in_progress (⟳)
    expect(buttons[1]).toHaveTextContent('⟳');
    expect(buttons[1]).toHaveClass('patch-tab-active');

    // Patch 3 - failed (✗)
    expect(buttons[2]).toHaveTextContent('✗');
    expect(buttons[2]).toHaveClass('patch-tab-failed');

    // Patch 4 - pending (○)
    expect(buttons[3]).toHaveTextContent('○');
    expect(buttons[3]).toHaveClass('patch-tab-pending');
  });

  it('should highlight the active patch', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={mockPatches[1]}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toHaveClass('selected');
    expect(buttons[0]).not.toHaveClass('selected');
    expect(buttons[2]).not.toHaveClass('selected');
  });

  it('should call onPatchSelect when a patch tab is clicked', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const patchButton = screen.getByText('PATCH 2').closest('button');
    fireEvent.click(patchButton);

    expect(mockOnPatchSelect).toHaveBeenCalledTimes(1);
    expect(mockOnPatchSelect).toHaveBeenCalledWith(mockPatches[1]);
  });

  it('should render separator element', () => {
    const { container } = render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const separator = container.querySelector('.patch-tab-separator');
    expect(separator).toBeInTheDocument();
  });

  it('should display patch icon for each tab', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveTextContent('🔧');
    });
  });

  it('should handle single patch correctly', () => {
    const singlePatch = [mockPatches[0]];
    render(
      <PatchTabsPanel
        patches={singlePatch}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    expect(screen.getByText('PATCH 1')).toBeInTheDocument();
    expect(screen.queryByText('PATCH 2')).not.toBeInTheDocument();
  });

  it('should render with patches having no status (defaults to pending)', () => {
    const patchesWithoutStatus = [
      {
        patch_number: 1,
        patch_reason: 'Test patch'
      }
    ];

    render(
      <PatchTabsPanel
        patches={patchesWithoutStatus}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('○'); // pending indicator
    expect(button).toHaveClass('patch-tab-pending');
  });

  it('should set correct title attribute on patch buttons', () => {
    render(
      <PatchTabsPanel
        patches={mockPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('title', 'Patch 1 - completed');
    expect(buttons[1]).toHaveAttribute('title', 'Patch 2 - in_progress');
    expect(buttons[2]).toHaveAttribute('title', 'Patch 3 - failed');
    expect(buttons[3]).toHaveAttribute('title', 'Patch 4 - pending');
  });

  it('should render multiple patches with various statuses correctly', () => {
    const mixedPatches = [
      { patch_number: 1, status: 'completed', patch_reason: 'Fix 1' },
      { patch_number: 2, status: 'completed', patch_reason: 'Fix 2' },
      { patch_number: 3, status: 'in_progress', patch_reason: 'Fix 3' },
      { patch_number: 4, status: 'pending', patch_reason: 'Fix 4' },
      { patch_number: 5, status: 'failed', patch_reason: 'Fix 5' }
    ];

    render(
      <PatchTabsPanel
        patches={mixedPatches}
        activePatch={null}
        onPatchSelect={mockOnPatchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveClass('patch-tab-completed');
    expect(buttons[1]).toHaveClass('patch-tab-completed');
    expect(buttons[2]).toHaveClass('patch-tab-active');
    expect(buttons[3]).toHaveClass('patch-tab-pending');
    expect(buttons[4]).toHaveClass('patch-tab-failed');
  });
});
