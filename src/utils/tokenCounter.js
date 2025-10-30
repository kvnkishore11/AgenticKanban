/**
 * Token Counter Utility
 * Provides approximate token counting for markdown content
 */

/**
 * Calculates approximate token count for text content
 * Uses a simplified approximation: ~4 characters per token for English text
 * This is similar to OpenAI's GPT models token counting
 */
export function calculateTokenCount(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');

  // Approximate token count: ~4 characters per token
  // This is a reasonable approximation for English text
  const approximateTokens = Math.ceil(normalizedText.length / 4);

  return approximateTokens;
}

/**
 * Calculates token count specifically for markdown content
 * Accounts for markdown syntax overhead
 */
export function calculateMarkdownTokenCount(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') {
    return 0;
  }

  // For markdown, we count the raw text as it includes formatting tokens
  return calculateTokenCount(markdownText);
}

/**
 * Formats token count for display
 */
export function formatTokenCount(tokenCount) {
  if (tokenCount === 0) return '0 tokens';
  if (tokenCount === 1) return '1 token';
  if (tokenCount < 1000) return `${tokenCount} tokens`;
  if (tokenCount < 1000000) return `${(tokenCount / 1000).toFixed(1)}k tokens`;
  return `${(tokenCount / 1000000).toFixed(1)}M tokens`;
}

/**
 * Estimates reading time based on token count
 * Assumes average reading speed of ~250 words per minute
 * And ~1.3 tokens per word for English text
 */
export function estimateReadingTime(tokenCount) {
  const wordsPerMinute = 250;
  const tokensPerWord = 1.3;
  const words = tokenCount / tokensPerWord;
  const minutes = Math.ceil(words / wordsPerMinute);

  if (minutes === 1) return '1 min read';
  if (minutes < 60) return `${minutes} min read`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 1 && remainingMinutes === 0) return '1 hour read';
  if (remainingMinutes === 0) return `${hours} hours read`;

  return `${hours}h ${remainingMinutes}m read`;
}

export default {
  calculateTokenCount,
  calculateMarkdownTokenCount,
  formatTokenCount,
  estimateReadingTime,
};