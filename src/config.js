// Configuration for API keys and endpoints
// In production, these should be set as environment variables in your hosting platform (like Vercel)

export const OPENROUTER_API_KEY = "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";
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Headers for OpenRouter API following their documentation exactly
export const getApiHeaders = () => {
  // For deployment on Vercel, use this pattern to get the correct site URL
  const siteUrl = typeof window !== 'undefined' ? 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 
      window.location.origin : 
      'https://magic-tools-2zv1.vercel.app') : 
    'https://magic-tools-2zv1.vercel.app';
    
  return {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': siteUrl,  // Site URL for rankings on openrouter.ai
    'X-Title': 'Magic Tools App'  // Site title for rankings on openrouter.ai
  };
}; 