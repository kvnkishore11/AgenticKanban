/**
 * Tests for HTML Utils
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { htmlToPlainText } from '../htmlUtils';

describe('htmlUtils', () => {
  describe('htmlToPlainText', () => {
    it('should convert simple HTML to plain text', () => {
      const html = '<p>Hello World</p>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Hello World');
    });

    it('should remove all HTML tags', () => {
      const html = '<div><p>Hello</p><span>World</span></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('HelloWorld');
    });

    it('should handle nested HTML tags', () => {
      const html = '<div><p><strong>Bold</strong> and <em>italic</em></p></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Bold and italic');
    });

    it('should preserve text spacing', () => {
      const html = '<p>Hello</p> <p>World</p>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should handle line breaks', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const result = htmlToPlainText(html);

      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should decode HTML entities', () => {
      const html = '&lt;div&gt;Hello&amp;World&lt;/div&gt;';
      const result = htmlToPlainText(html);

      expect(result).toBe('<div>Hello&World</div>');
    });

    it('should handle special HTML entities', () => {
      const html = 'Price: &euro;100 &copy;2024';
      const result = htmlToPlainText(html);

      expect(result).toContain('100');
      expect(result).toContain('2024');
    });

    it('should handle empty HTML', () => {
      const html = '<div></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = htmlToPlainText('');

      expect(result).toBe('');
    });

    it('should handle null', () => {
      const result = htmlToPlainText(null);

      expect(result).toBe('');
    });

    it('should handle undefined', () => {
      const result = htmlToPlainText(undefined);

      expect(result).toBe('');
    });

    it('should handle text without HTML tags', () => {
      const text = 'Just plain text';
      const result = htmlToPlainText(text);

      expect(result).toBe('Just plain text');
    });

    it('should handle self-closing tags', () => {
      const html = '<img src="test.jpg" /><input type="text" />';
      const result = htmlToPlainText(html);

      expect(result).toBe('');
    });

    it('should handle script tags', () => {
      const html = '<div>Text<script>alert("XSS")</script>More text</div>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More text');
      // Script content should be removed
    });

    it('should handle style tags', () => {
      const html = '<div>Text<style>.class { color: red; }</style>More text</div>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More text');
    });

    it('should handle HTML comments', () => {
      const html = '<div>Text<!-- Comment -->More text</div>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More text');
    });

    it('should handle list elements', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should handle table elements', () => {
      const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Cell 1');
      expect(result).toContain('Cell 2');
    });

    it('should handle heading tags', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><p>Content</p>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Title');
      expect(result).toContain('Subtitle');
      expect(result).toContain('Content');
    });

    it('should handle link tags', () => {
      const html = '<a href="https://example.com">Click here</a>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Click here');
    });

    it('should handle image alt text', () => {
      const html = '<img src="test.jpg" alt="Test Image">';
      const result = htmlToPlainText(html);

      // Note: alt text is not extracted by textContent/innerText
      expect(result).toBe('');
    });

    it('should handle form elements', () => {
      const html = '<form><label>Name:</label><input type="text" value="John"></form>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Name:');
    });

    it('should handle multiple paragraphs', () => {
      const html = `
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
        <p>Third paragraph.</p>
      `;
      const result = htmlToPlainText(html);

      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
      expect(result).toContain('Third paragraph.');
    });

    it('should handle complex nested structure', () => {
      const html = `
        <div class="container">
          <header>
            <h1>Main Title</h1>
            <nav><a href="#">Link 1</a><a href="#">Link 2</a></nav>
          </header>
          <main>
            <article>
              <h2>Article Title</h2>
              <p>Article content with <strong>bold</strong> and <em>italic</em> text.</p>
            </article>
          </main>
          <footer>
            <p>&copy; 2024 Company</p>
          </footer>
        </div>
      `;
      const result = htmlToPlainText(html);

      expect(result).toContain('Main Title');
      expect(result).toContain('Link 1');
      expect(result).toContain('Link 2');
      expect(result).toContain('Article Title');
      expect(result).toContain('Article content');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('2024 Company');
    });

    it('should handle markdown-like HTML', () => {
      const html = '<p><strong>Bold text</strong></p><p><em>Italic text</em></p><p><code>Code block</code></p>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Bold text');
      expect(result).toContain('Italic text');
      expect(result).toContain('Code block');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<div><p>Unclosed paragraph<div>Nested unclosed';
      const result = htmlToPlainText(html);

      expect(result).toContain('Unclosed paragraph');
      expect(result).toContain('Nested unclosed');
    });

    it('should handle very long HTML strings', () => {
      const html = '<p>' + 'a'.repeat(10000) + '</p>';
      const result = htmlToPlainText(html);

      expect(result.length).toBe(10000);
      expect(result).toBe('a'.repeat(10000));
    });

    it('should handle HTML with inline styles', () => {
      const html = '<p style="color: red; font-size: 16px;">Styled text</p>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Styled text');
    });

    it('should handle HTML with classes and IDs', () => {
      const html = '<div class="container" id="main"><p class="text">Content</p></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Content');
    });

    it('should handle HTML with data attributes', () => {
      const html = '<div data-id="123" data-name="test">Content</div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Content');
    });

    it('should handle HTML with newlines and whitespace', () => {
      const html = `
        <div>
          <p>
            Text with
            newlines
          </p>
        </div>
      `;
      const result = htmlToPlainText(html);

      expect(result).toContain('Text with');
      expect(result).toContain('newlines');
    });

    it('should handle HTML with unicode characters', () => {
      const html = '<p>Hello 世界 🌍</p>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Hello 世界 🌍');
    });

    it('should handle HTML with numeric entities', () => {
      const html = '&#72;&#101;&#108;&#108;&#111;';
      const result = htmlToPlainText(html);

      expect(result).toBe('Hello');
    });

    it('should handle HTML with hex entities', () => {
      const html = '&#x48;&#x65;&#x6C;&#x6C;&#x6F;';
      const result = htmlToPlainText(html);

      expect(result).toBe('Hello');
    });

    it('should handle mixed content', () => {
      const html = 'Plain text <p>with HTML</p> and <strong>more</strong> plain text';
      const result = htmlToPlainText(html);

      expect(result).toContain('Plain text');
      expect(result).toContain('with HTML');
      expect(result).toContain('more');
      expect(result).toContain('plain text');
    });

    it('should handle consecutive tags', () => {
      const html = '<span>First</span><span>Second</span><span>Third</span>';
      const result = htmlToPlainText(html);

      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should handle void elements', () => {
      const html = 'Text<hr>More text<br>Even more';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More text');
      expect(result).toContain('Even more');
    });
  });

  describe('Edge cases', () => {
    it('should handle only whitespace HTML', () => {
      const html = '<div>   </div>';
      const result = htmlToPlainText(html);

      expect(result.trim()).toBe('');
    });

    it('should handle only tags, no text', () => {
      const html = '<div><span></span><p></p></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('');
    });

    it('should handle deeply nested empty elements', () => {
      const html = '<div><div><div><div></div></div></div></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('');
    });

    it('should handle single character', () => {
      const html = '<p>a</p>';
      const result = htmlToPlainText(html);

      expect(result).toBe('a');
    });

    it('should handle empty attributes', () => {
      const html = '<div class="" id=""><p>Text</p></div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Text');
    });
  });

  describe('Security considerations', () => {
    it('should safely handle script injection attempts', () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Click me');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('XSS');
    });

    it('should safely handle iframe tags', () => {
      const html = '<div>Text<iframe src="evil.com"></iframe>More</div>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More');
      expect(result).not.toContain('iframe');
    });

    it('should safely handle object and embed tags', () => {
      const html = '<div>Text<object data="evil.swf"></object>More</div>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Text');
      expect(result).toContain('More');
    });
  });

  describe('Performance', () => {
    it('should handle large HTML documents efficiently', () => {
      const largeParagraph = '<p>' + 'word '.repeat(1000) + '</p>';
      const largeHtml = largeParagraph.repeat(100);

      const result = htmlToPlainText(largeHtml);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('word');
    });

    it('should handle deeply nested structures', () => {
      let html = 'Text';
      for (let i = 0; i < 100; i++) {
        html = `<div>${html}</div>`;
      }

      const result = htmlToPlainText(html);

      expect(result).toBe('Text');
    });
  });
});
