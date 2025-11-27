/**
 * Tests for AdwIdInput Component
 * Comprehensive tests for the ADW ID input field with validation and autocomplete
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdwIdInput from '../AdwIdInput';
import adwDiscoveryService from '../../../services/api/adwDiscoveryService';
import * as adwValidation from '../../../utils/adwValidation';

// Mock the services
vi.mock('../../../services/api/adwDiscoveryService', () => ({
  default: {
    listAdws: vi.fn(),
    filterAdws: vi.fn(),
  }
}));

vi.mock('../../../utils/adwValidation', async () => {
  const actual = await vi.importActual('../../../utils/adwValidation');
  return {
    ...actual,
    validateAdwId: vi.fn(),
    isAdwIdRequired: vi.fn(),
  };
});

describe('AdwIdInput Component', () => {
  const mockAdws = [
    {
      adw_id: 'abc12345',
      issue_class: 'feature',
      issue_number: 123,
      issue_title: 'Add new feature',
      branch_name: 'feature/abc12345-new-feature'
    },
    {
      adw_id: 'def67890',
      issue_class: 'bug',
      issue_number: 456,
      issue_title: 'Fix critical bug',
      branch_name: 'bug/def67890-critical-fix'
    },
    {
      adw_id: 'ghi11111',
      issue_class: 'chore',
      issue_number: 789,
      issue_title: 'Update dependencies',
      branch_name: 'chore/ghi11111-deps'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adwDiscoveryService.listAdws.mockResolvedValue(mockAdws);
    adwDiscoveryService.filterAdws.mockImplementation((adws, query) => {
      if (!query) return adws;
      return adws.filter(adw => adw.adw_id.toLowerCase().includes(query.toLowerCase()));
    });
    adwValidation.validateAdwId.mockReturnValue({ isValid: true, error: null });
    adwValidation.isAdwIdRequired.mockReturnValue(false);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render with default props', async () => {
      render(<AdwIdInput onChange={vi.fn()} />);

      expect(screen.getByText('ADW ID Reference')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search or enter ADW ID...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<AdwIdInput onChange={vi.fn()} placeholder="Enter ID here" />);

      expect(screen.getByPlaceholderText('Enter ID here')).toBeInTheDocument();
    });

    it('should display optional indicator when not required', () => {
      render(<AdwIdInput onChange={vi.fn()} isRequired={false} />);

      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('should display required indicator when required', () => {
      render(<AdwIdInput onChange={vi.fn()} isRequired={true} />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render disabled input when disabled prop is true', () => {
      render(<AdwIdInput onChange={vi.fn()} disabled={true} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      expect(input).toBeDisabled();
    });

    it('should render with initial value', () => {
      render(<AdwIdInput value="abc12345" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      expect(input).toHaveValue('abc12345');
    });

    it('should render with custom className', () => {
      const { container } = render(<AdwIdInput onChange={vi.fn()} className="custom-class" />);

      const input = container.querySelector('.custom-class');
      expect(input).toBeInTheDocument();
    });
  });

  describe('ADW Discovery Integration', () => {
    it('should fetch ADW list on mount', async () => {
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });
    });

    it('should display loading state while fetching ADWs', async () => {
      adwDiscoveryService.listAdws.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockAdws), 100))
      );

      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      expect(screen.getByText('Loading ADW IDs...')).toBeInTheDocument();
    });

    it('should display ADW list in dropdown when input is focused', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
        expect(screen.getByText('def67890')).toBeInTheDocument();
        expect(screen.getByText('ghi11111')).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      adwDiscoveryService.listAdws.mockRejectedValue(new Error('Network error'));

      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      // Should not crash, user can still manually enter ADW ID
      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when input is focused', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <AdwIdInput onChange={vi.fn()} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      const outside = screen.getByTestId('outside');
      await user.click(outside);

      await waitFor(() => {
        expect(screen.queryByText('abc12345')).not.toBeInTheDocument();
      });
    });

    it('should toggle dropdown when chevron button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      // Find chevron button (second button in the input icons area)
      const buttons = container.querySelectorAll('button');
      const chevronButton = Array.from(buttons).find(btn =>
        btn.querySelector('.rotate-180, svg')
      );

      await user.click(chevronButton);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.click(chevronButton);

      await waitFor(() => {
        expect(screen.queryByText('abc12345')).not.toBeInTheDocument();
      });
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} disabled={true} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      expect(screen.queryByText('abc12345')).not.toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should filter ADWs based on search query', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);
      await user.type(input, 'abc');

      await waitFor(() => {
        expect(adwDiscoveryService.filterAdws).toHaveBeenCalledWith(mockAdws, 'abc');
      });
    });

    it('should show all ADWs when search is empty', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
        expect(screen.getByText('def67890')).toBeInTheDocument();
        expect(screen.getByText('ghi11111')).toBeInTheDocument();
      });
    });

    it('should show no results message when no ADWs match', async () => {
      const user = userEvent.setup();
      adwDiscoveryService.filterAdws.mockReturnValue([]);

      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);
      await user.type(input, 'xyz');

      await waitFor(() => {
        expect(screen.getByText(/No matching ADW IDs found/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Input and Selection', () => {
    it('should call onChange when typing valid ADW ID', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<AdwIdInput onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.type(input, 'abc12345');

      expect(onChange).toHaveBeenCalledWith('abc12345');
    });

    it('should call onChange when selecting from dropdown', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<AdwIdInput onChange={onChange} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.click(screen.getByText('abc12345'));

      expect(onChange).toHaveBeenCalledWith('abc12345');
    });

    it('should only accept alphanumeric characters up to 8 characters', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<AdwIdInput onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.type(input, 'abc-123-xyz');

      // Should filter out hyphens and only accept alphanumeric
      expect(onChange).not.toHaveBeenCalledWith('abc-123-xyz');
    });

    it('should clear selection when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<AdwIdInput value="abc12345" onChange={onChange} />);

      // Find clear button (X icon)
      const clearButton = container.querySelector('button[type="button"]');
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should close dropdown after selection', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.click(screen.getByText('abc12345'));

      await waitFor(() => {
        expect(screen.queryByText('def67890')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown on ArrowDown key', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);
      await user.keyboard('{Escape}'); // Close first

      await waitFor(() => {
        expect(screen.queryByText('abc12345')).not.toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });
    });

    it('should navigate down in list with ArrowDown', async () => {
      const user = userEvent.setup();
      const { container } = render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      // First item should be selected (has bg-blue-50 class)
      const selectedItem = container.querySelector('.bg-blue-50.border-l-2.border-blue-500');
      expect(selectedItem).toBeInTheDocument();
    });

    it('should navigate up in list with ArrowUp', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      // Should navigate back up
    });

    it('should select item with Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<AdwIdInput onChange={onChange} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('abc12345');
    });

    it('should close dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('abc12345')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should validate on value change', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.type(input, 'abc12345');

      await waitFor(() => {
        expect(adwValidation.validateAdwId).toHaveBeenCalled();
      });
    });

    it('should show error state when validation fails', async () => {
      const user = userEvent.setup();
      adwValidation.validateAdwId.mockReturnValue({
        isValid: false,
        error: 'Invalid ADW ID format'
      });

      render(<AdwIdInput onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.type(input, 'invalid');

      await waitFor(() => {
        expect(screen.getByText('Invalid ADW ID format')).toBeInTheDocument();
      });
    });

    it('should show success state when validation passes', async () => {
      adwValidation.validateAdwId.mockReturnValue({
        isValid: true,
        error: null
      });

      render(<AdwIdInput value="abc12345" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Valid ADW ID format/i)).toBeInTheDocument();
      });
    });

    it('should mark field as touched on blur', async () => {
      const user = userEvent.setup();
      adwValidation.validateAdwId.mockReturnValue({
        isValid: false,
        error: 'ADW ID is required'
      });
      adwValidation.isAdwIdRequired.mockReturnValue(true);

      render(<AdwIdInput onChange={vi.fn()} isRequired={true} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);
      await user.tab(); // Blur

      await waitFor(() => {
        expect(screen.getByText('ADW ID is required')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Type Integration', () => {
    it('should show required message for dependent workflow types', () => {
      adwValidation.isAdwIdRequired.mockReturnValue(true);

      render(<AdwIdInput onChange={vi.fn()} workflowType="adw_build_iso" />);

      expect(screen.getByText(/ADW ID is required/i)).toBeInTheDocument();
    });

    it('should show optional message for entry point workflow types', () => {
      adwValidation.isAdwIdRequired.mockReturnValue(false);

      render(<AdwIdInput onChange={vi.fn()} workflowType="adw_plan_iso" />);

      expect(screen.getByText(/ADW ID is optional/i)).toBeInTheDocument();
    });

    it('should validate as required for dependent workflows', async () => {
      adwValidation.isAdwIdRequired.mockReturnValue(true);

      render(<AdwIdInput onChange={vi.fn()} workflowType="adw_build_iso" />);

      await waitFor(() => {
        expect(adwValidation.validateAdwId).toHaveBeenCalledWith('', true);
      });
    });
  });

  describe('Help Text', () => {
    it('should show help text by default', () => {
      render(<AdwIdInput onChange={vi.fn()} />);

      expect(screen.getByText(/Enter an existing 8-character ADW ID/i)).toBeInTheDocument();
    });

    it('should hide help text when showHelpText is false', () => {
      render(<AdwIdInput onChange={vi.fn()} showHelpText={false} />);

      expect(screen.queryByText(/Enter an existing 8-character ADW ID/i)).not.toBeInTheDocument();
    });

    it('should show workflow-specific help text', () => {
      adwValidation.isAdwIdRequired.mockReturnValue(true);

      render(<AdwIdInput onChange={vi.fn()} workflowType="adw_build_iso" />);

      expect(screen.getByText(/ADW ID is required for adw_build_iso workflows/i)).toBeInTheDocument();
    });
  });

  describe('Character Counter', () => {
    it('should show character counter when value is present', () => {
      render(<AdwIdInput value="abc12345" onChange={vi.fn()} />);

      expect(screen.getByText('8/8 characters')).toBeInTheDocument();
    });

    it('should not show character counter when value is empty', () => {
      render(<AdwIdInput value="" onChange={vi.fn()} />);

      expect(screen.queryByText(/characters$/)).not.toBeInTheDocument();
    });

    it('should update character counter as user types', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AdwIdInput value="" onChange={vi.fn()} />);

      rerender(<AdwIdInput value="abc" onChange={vi.fn()} />);

      expect(screen.getByText('3/8 characters')).toBeInTheDocument();
    });
  });

  describe('ADW Item Display', () => {
    it('should display ADW with issue class badge', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('/feature')).toBeInTheDocument();
        expect(screen.getByText('/bug')).toBeInTheDocument();
        expect(screen.getByText('/chore')).toBeInTheDocument();
      });
    });

    it('should display issue number when available', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('#123')).toBeInTheDocument();
        expect(screen.getByText('#456')).toBeInTheDocument();
      });
    });

    it('should display issue title when available', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Add new feature')).toBeInTheDocument();
        expect(screen.getByText('Fix critical bug')).toBeInTheDocument();
      });
    });

    it('should display branch name when available', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('feature/abc12345-new-feature')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onChange callback gracefully', () => {
      render(<AdwIdInput />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      expect(input).toBeInTheDocument();
    });

    it('should handle empty ADW list', async () => {
      const user = userEvent.setup();
      adwDiscoveryService.listAdws.mockResolvedValue([]);

      render(<AdwIdInput onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText(/No ADW IDs available/i)).toBeInTheDocument();
      });
    });

    it('should handle special characters in search query', async () => {
      const user = userEvent.setup();
      render(<AdwIdInput onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.type(input, '!@#$%');

      // Should not crash
      expect(input).toBeInTheDocument();
    });

    it('should highlight current value in dropdown', async () => {
      const user = userEvent.setup();
      const { container } = render(<AdwIdInput value="abc12345" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(adwDiscoveryService.listAdws).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      await user.click(input);

      await waitFor(() => {
        const highlightedItem = container.querySelector('.bg-green-50');
        expect(highlightedItem).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label', () => {
      render(<AdwIdInput onChange={vi.fn()} />);

      expect(screen.getByText('ADW ID Reference')).toBeInTheDocument();
    });

    it('should disable autocomplete and spellcheck', () => {
      render(<AdwIdInput onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search or enter ADW ID...');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('spellcheck', 'false');
    });

    it('should have proper button types', () => {
      const { container } = render(<AdwIdInput value="abc12345" onChange={vi.fn()} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
