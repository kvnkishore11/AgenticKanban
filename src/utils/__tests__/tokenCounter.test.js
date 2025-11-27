/**
 * Tests for Token Counter Utility
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTokenCount,
  calculateMarkdownTokenCount,
  formatTokenCount,
  estimateReadingTime,
} from '../tokenCounter';

describe('tokenCounter', () => {
  describe('calculateTokenCount', () => {
    it('should calculate token count for simple text', () => {
      const text = 'Hello world';
      const result = calculateTokenCount(text);
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(Math.ceil(text.length / 4));
    });

    it('should calculate token count for longer text', () => {
      const text = 'This is a longer text with multiple words and sentences.';
      const result = calculateTokenCount(text);
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty strings', () => {
      expect(calculateTokenCount('')).toBe(0);
      expect(calculateTokenCount('   ')).toBe(0);
    });

    it('should handle null and undefined', () => {
      expect(calculateTokenCount(null)).toBe(0);
      expect(calculateTokenCount(undefined)).toBe(0);
    });

    it('should handle non-string inputs', () => {
      expect(calculateTokenCount(123)).toBe(0);
      expect(calculateTokenCount({})).toBe(0);
      expect(calculateTokenCount([])).toBe(0);
    });

    it('should normalize whitespace', () => {
      const text1 = 'Hello    world';
      const text2 = 'Hello world';
      expect(calculateTokenCount(text1)).toBe(calculateTokenCount(text2));
    });

    it('should trim leading and trailing whitespace', () => {
      const text1 = '   Hello world   ';
      const text2 = 'Hello world';
      expect(calculateTokenCount(text1)).toBe(calculateTokenCount(text2));
    });

    it('should handle newlines and tabs', () => {
      const text = 'Hello\nworld\t!';
      const result = calculateTokenCount(text);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const text = 'Hello 世界 🌍';
      const result = calculateTokenCount(text);
      expect(result).toBeGreaterThan(0);
    });

    it('should use ceiling for fractional results', () => {
      // A text that results in fractional token count
      const text = 'Hi'; // 2 characters = 0.5 tokens -> should round up to 1
      expect(calculateTokenCount(text)).toBe(1);
    });
  });

  describe('calculateMarkdownTokenCount', () => {
    it('should calculate token count for markdown text', () => {
      const markdown = '# Hello World\n\nThis is **bold** text.';
      const result = calculateMarkdownTokenCount(markdown);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle markdown with code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = calculateMarkdownTokenCount(markdown);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle markdown with links', () => {
      const markdown = '[Link text](https://example.com)';
      const result = calculateMarkdownTokenCount(markdown);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle empty markdown', () => {
      expect(calculateMarkdownTokenCount('')).toBe(0);
      expect(calculateMarkdownTokenCount(null)).toBe(0);
      expect(calculateMarkdownTokenCount(undefined)).toBe(0);
    });

    it('should count markdown syntax as part of tokens', () => {
      const plain = 'Hello World';
      const markdown = '**Hello World**';
      // Markdown version should have more tokens due to syntax
      expect(calculateMarkdownTokenCount(markdown)).toBeGreaterThan(calculateMarkdownTokenCount(plain));
    });

    it('should handle complex markdown documents', () => {
      const markdown = `# Title

## Section 1

Some text with **bold** and *italic*.

- List item 1
- List item 2

\`\`\`code
function test() {
  return true;
}
\`\`\`

[Link](https://example.com)`;
      const result = calculateMarkdownTokenCount(markdown);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatTokenCount', () => {
    it('should format zero tokens', () => {
      expect(formatTokenCount(0)).toBe('0 tokens');
    });

    it('should format singular token', () => {
      expect(formatTokenCount(1)).toBe('1 token');
    });

    it('should format small token counts', () => {
      expect(formatTokenCount(10)).toBe('10 tokens');
      expect(formatTokenCount(999)).toBe('999 tokens');
    });

    it('should format thousands with k suffix', () => {
      expect(formatTokenCount(1000)).toBe('1.0k tokens');
      expect(formatTokenCount(1500)).toBe('1.5k tokens');
      expect(formatTokenCount(10000)).toBe('10.0k tokens');
      expect(formatTokenCount(50000)).toBe('50.0k tokens');
    });

    it('should format millions with M suffix', () => {
      expect(formatTokenCount(1000000)).toBe('1.0M tokens');
      expect(formatTokenCount(1500000)).toBe('1.5M tokens');
      expect(formatTokenCount(10000000)).toBe('10.0M tokens');
    });

    it('should handle decimal precision', () => {
      expect(formatTokenCount(1234)).toBe('1.2k tokens');
      expect(formatTokenCount(1567)).toBe('1.6k tokens');
    });

    it('should handle edge case at 999999', () => {
      expect(formatTokenCount(999999)).toBe('1000.0k tokens');
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time for small token counts', () => {
      // ~325 tokens = 250 words = 1 minute
      expect(estimateReadingTime(325)).toBe('1 min read');
    });

    it('should estimate reading time for medium token counts', () => {
      // ~650 tokens = 500 words = 2 minutes
      expect(estimateReadingTime(650)).toBe('2 min read');

      // ~1625 tokens = 1250 words = 5 minutes
      expect(estimateReadingTime(1625)).toBe('5 min read');
    });

    it('should handle zero tokens', () => {
      expect(estimateReadingTime(0)).toBe('0 min read');
    });

    it('should estimate hours for long content', () => {
      // ~19500 tokens = 15000 words = 60 minutes = 1 hour
      expect(estimateReadingTime(19500)).toBe('1 hour read');
    });

    it('should estimate hours and minutes for long content', () => {
      // ~32500 tokens = 25000 words = 100 minutes = 1h 40m
      const result = estimateReadingTime(32500);
      expect(result).toContain('h');
      expect(result).toContain('m');
    });

    it('should handle multiple hours without minutes', () => {
      // ~39000 tokens = 30000 words = 120 minutes = 2 hours
      expect(estimateReadingTime(39000)).toBe('2 hours read');
    });

    it('should round up to nearest minute', () => {
      // Any fraction of a minute should round up
      expect(estimateReadingTime(1)).toBe('1 min read');
      expect(estimateReadingTime(100)).toBe('1 min read');
    });

    it('should handle large token counts', () => {
      // ~65000 tokens = 50000 words = 200 minutes = 3h 20m
      const result = estimateReadingTime(65000);
      expect(result).toContain('h');
      expect(result).toContain('m');
    });

    it('should format hours correctly', () => {
      // Exactly 1 hour
      expect(estimateReadingTime(19500)).toBe('1 hour read');

      // Multiple hours exactly
      expect(estimateReadingTime(39000)).toBe('2 hours read');
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow for typical text', () => {
      const text = 'This is a sample text for testing the complete token counting workflow.';
      const tokenCount = calculateTokenCount(text);
      const formatted = formatTokenCount(tokenCount);
      const readingTime = estimateReadingTime(tokenCount);

      expect(tokenCount).toBeGreaterThan(0);
      expect(formatted).toContain('tokens');
      expect(readingTime).toContain('read');
    });

    it('should handle complete workflow for markdown', () => {
      const markdown = `# Documentation

This is a sample documentation with **bold** and *italic* text.

## Code Example

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const tokenCount = calculateMarkdownTokenCount(markdown);
      const formatted = formatTokenCount(tokenCount);
      const readingTime = estimateReadingTime(tokenCount);

      expect(tokenCount).toBeGreaterThan(0);
      expect(formatted).toContain('tokens');
      expect(readingTime).toContain('read');
    });

    it('should handle large documents', () => {
      const largeText = 'word '.repeat(5000); // 5000 words
      const tokenCount = calculateTokenCount(largeText);
      const formatted = formatTokenCount(tokenCount);
      const readingTime = estimateReadingTime(tokenCount);

      expect(tokenCount).toBeGreaterThan(1000);
      expect(formatted).toContain('k tokens');
      expect(readingTime).toContain('min read');
    });
  });
});
