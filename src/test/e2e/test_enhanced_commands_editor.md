# E2E Test: Enhanced Commands Palette with Advanced Editor

## Objective
Test the complete workflow of the enhanced Commands Palette including slash notation display, token counting, command content editing, and git integration functionality.

## Prerequisites
- AgenticKanban application must be running (npm run dev)
- Browser should be open to the application URL
- Should have access to .claude/commands directory with command files
- Git repository should be initialized and configured

## Test Scenarios

### Scenario 1: Basic Commands Palette Enhancement
**Test the enhanced display format and token counting**

1. **Open Commands Palette**
   - Navigate to the main Kanban board
   - Look for and click the Commands Palette trigger (typically a button or keyboard shortcut)
   - Verify the Commands Palette modal opens

2. **Verify Enhanced Command Display**
   - Confirm all commands show slash notation format (e.g., "/patch", "/feature", "/test")
   - Check that each command displays its descriptive name alongside the slash notation
   - Verify token count is visible for each command (format: "XXX tokens")
   - Confirm complexity badges are shown (simple/moderate/complex/very complex)
   - Verify command status indicators are working (available/unavailable)

3. **Test Command Search and Filtering**
   - Use the search box to search for specific commands (e.g., "patch")
   - Verify search works with both slash notation and descriptive names
   - Test category filtering to ensure it still works with enhanced display
   - Confirm filtered results maintain enhanced formatting

### Scenario 2: Command Editor Integration
**Test opening and using the command editor**

1. **Open Command Editor**
   - Select any available command from the Commands Palette
   - Click the "Edit" button next to the command
   - Verify the Command Editor modal opens
   - Confirm the editor displays the command's slash notation name in the header

2. **Verify Editor Interface**
   - Check that the editor shows current token count in real-time
   - Verify complexity badge is displayed and updates as content changes
   - Confirm the editor loads actual command content (not mock data)
   - Test fullscreen toggle functionality
   - Verify editor toolbar buttons are present (Preview, Copy, Save, Commit)

3. **Test Content Editing**
   - Make changes to the command content
   - Verify the editor detects changes (shows "Unsaved changes" indicator)
   - Test the character count and line count in the footer
   - Verify token count updates as content is modified
   - Test the discard changes functionality

### Scenario 3: Preview and Content Validation
**Test the preview mode and content validation**

1. **Test Preview Mode**
   - Switch to preview mode using the Preview button
   - Verify markdown content is rendered appropriately
   - Switch back to edit mode and confirm changes are preserved
   - Test preview with various markdown elements (headers, lists, code blocks)

2. **Test Content Validation**
   - Try saving invalid content (if validation exists)
   - Verify appropriate error messages are shown
   - Test with very large content to check performance
   - Confirm reading time estimates are accurate

### Scenario 4: Save and Git Integration
**Test saving changes and git operations**

1. **Test Save Functionality**
   - Make changes to a command's content
   - Click the Save button
   - Verify success message appears
   - Confirm token count and complexity badge update
   - Check that the original content is updated in the cache

2. **Test Git Commit Integration**
   - After making changes, click the Commit button
   - Verify the commit dialog opens
   - Test with custom commit message
   - Test with auto-generated commit message (leave empty)
   - Confirm the commit operation completes successfully
   - Verify success/error messages are appropriate

3. **Test File Operations**
   - Verify changes are actually written to the file system
   - Check that git operations create proper commits
   - Test backup functionality (if implemented)
   - Verify file permissions are maintained

### Scenario 5: Performance and Edge Cases
**Test system performance and edge case handling**

1. **Performance Testing**
   - Test with commands that have very large content (high token count)
   - Verify editor performance with rapid typing
   - Test opening multiple commands in sequence
   - Check memory usage doesn't grow excessively

2. **Edge Case Testing**
   - Test with commands that have missing or corrupted files
   - Try editing commands with special characters
   - Test concurrent editing scenarios (if applicable)
   - Verify error handling for network failures
   - Test with commands that have permission issues

### Scenario 6: Integration with Existing Features
**Ensure new features don't break existing functionality**

1. **Commands Palette Integration**
   - Verify command execution still works from the palette
   - Test task-specific command recommendations
   - Confirm category filtering and search functionality
   - Check that relevant command highlighting still works

2. **Kanban Board Integration**
   - Test commands palette from different task contexts
   - Verify task-specific information is passed correctly
   - Confirm project context is maintained
   - Test with different project selections

## Expected Results

### Commands Palette Enhancement
- All commands display in slash notation format ("/command_name")
- Descriptive names are shown alongside slash notation
- Token counts are accurate and formatted properly
- Complexity badges reflect actual content complexity
- Search and filtering work with enhanced display

### Command Editor Functionality
- Editor opens with correct command content
- Real-time token counting works accurately
- Content editing is smooth and responsive
- Preview mode renders markdown correctly
- Fullscreen mode works properly

### Save and Git Operations
- Content changes are saved to actual files
- Git commits are created with proper messages
- Success/error feedback is clear and helpful
- File system operations are reliable

### Performance and Reliability
- System handles large content efficiently
- Error conditions are handled gracefully
- Memory usage remains reasonable
- User experience is smooth and responsive

## Pass/Fail Criteria

### Must Pass (Critical)
- [ ] Commands display in correct slash notation format
- [ ] Token counting is accurate for all commands
- [ ] Command editor opens and loads actual content
- [ ] Content can be edited and saved successfully
- [ ] Git commit functionality works properly
- [ ] No regression in existing Commands Palette features

### Should Pass (Important)
- [ ] Real-time token count updates work smoothly
- [ ] Preview mode renders markdown correctly
- [ ] Error handling provides helpful feedback
- [ ] Performance is acceptable with large content
- [ ] Complexity badges are accurate

### Could Pass (Nice to Have)
- [ ] Fullscreen mode enhances editing experience
- [ ] Reading time estimates are reasonable
- [ ] Backup functionality works if implemented
- [ ] Advanced search includes content searching

## Test Data Requirements
- At least 5 different command files with varying content sizes
- Commands with different complexity levels (simple to very complex)
- Valid markdown content with various elements
- Commands in different categories for filtering tests

## Notes
- Test should be performed on a clean git repository state
- Backup important command files before testing destructive operations
- Monitor browser console for any JavaScript errors
- Document any performance issues or unexpected behaviors
- Test on different screen sizes to verify responsive design

## Validation Commands
After completing all test scenarios, run these commands to validate the system:

```bash
# Check application builds without errors
npm run build

# Run linting to ensure code quality
npm run lint

# Run unit tests if available
npm run test

# Verify git repository state
git status
git log --oneline -n 5

# Check command files are intact
ls -la .claude/commands/
```

## Success Criteria
The test passes if:
1. All critical criteria are met
2. At least 80% of important criteria are met
3. No critical bugs or regressions are found
4. System performance remains acceptable
5. User experience is intuitive and responsive