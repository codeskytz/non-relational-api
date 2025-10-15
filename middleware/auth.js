/**
 * Authentication middleware for CodeSkyTZ API
 * Validates the codeskytz-api-key header
 */

// Expected API key from environment variables or fallback for testing
const API_KEY = process.env.CODESKYTZ_API_KEY || 'codeskytz-B7hbs5wsc09h';

// Debug: Check API key loading
console.log('🔐 Auth Debug:');
console.log(`API_KEY loaded: ${API_KEY ? '✅' : '❌'}`);
console.log(`API_KEY value: ${API_KEY || 'undefined'}`);

/**
 * Middleware function to authenticate requests using codeskytz-api-key header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateApiKey = (req, res, next) => {
   // Get API key from header
   const providedApiKey = req.header('codeskytz-api-key');

   // Check if API key is provided
   if (!providedApiKey) {
     return res.status(401).json({
       error: 'Authentication required',
       message: 'codeskytz-api-key header is required',
       code: 'MISSING_API_KEY'
     });
   }

   // Trim whitespace from provided API key
   const trimmedApiKey = providedApiKey.trim();

   // Check if API key matches expected value (case-sensitive)
   if (trimmedApiKey !== API_KEY) {
     console.log(`❌ API Key mismatch:`);
     console.log(`Expected: ${API_KEY}`);
     console.log(`Provided: ${trimmedApiKey}`);
     console.log(`Match: ${trimmedApiKey === API_KEY}`);

     return res.status(403).json({
       error: 'Invalid API key',
       message: 'The provided codeskytz-api-key is not valid',
       code: 'INVALID_API_KEY'
     });
   }

   // API key is valid, proceed to next middleware/route handler
   next();
 };

/**
 * Optional authentication middleware for endpoints that can work with or without auth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = (req, res, next) => {
  const providedApiKey = req.header('codeskytz-api-key');

  // If no API key provided, continue without authentication
  if (!providedApiKey) {
    return next();
  }

  // If API key provided, validate it
  if (providedApiKey === API_KEY) {
    return next();
  }

  // Invalid API key
  return res.status(403).json({
    error: 'Invalid API key',
    message: 'The provided codeskytz-api-key is not valid',
    code: 'INVALID_API_KEY'
  });
};

export default authenticateApiKey;