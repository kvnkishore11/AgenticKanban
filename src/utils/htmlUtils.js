/**
 * Converts HTML content to plain text
 * Removes all HTML tags and decodes HTML entities
 *
 * @param {string} html - HTML content
 * @returns {string} Plain text content
 */
export const htmlToPlainText = (html) => {
  if (!html) return '';

  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Get text content which automatically strips HTML tags
  return temp.textContent || temp.innerText || '';
};
