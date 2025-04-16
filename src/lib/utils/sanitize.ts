/**
 * Utility functions to sanitize data and prevent circular references
 * that can cause "Maximum depth exceeded" errors when rendering
 */

/**
 * Sanitizes an installation object to prevent circular references
 * @param installation The installation object to sanitize
 * @returns A new installation object with simplified references
 */
export function sanitizeInstallation(installation: any): any {
  if (!installation) return null;
  
  // Create a shallow copy of the installation
  const sanitized = { ...installation };
  
  // Simplify nested objects to prevent circular references
  if (sanitized.distributor && typeof sanitized.distributor === 'object') {
    sanitized.distributor = {
      id: sanitized.distributor.id || sanitized.distributorId,
      name: sanitized.distributor.name || 'Unknown'
    };
  }
  
  if (sanitized.owner && typeof sanitized.owner === 'object') {
    sanitized.owner = {
      id: sanitized.owner.id || sanitized.ownerId,
      name: sanitized.owner.name || null,
      email: sanitized.owner.email || ''
    };
  }
  
  if (sanitized.address && typeof sanitized.address === 'object') {
    sanitized.address = {
      ...sanitized.address,
      // Remove any potential circular references
      installation: undefined,
      distributor: undefined,
      owner: undefined
    };
  }
  
  return sanitized;
}

/**
 * Sanitizes an array of objects to prevent circular references
 * @param array The array of objects to sanitize
 * @param sanitizeFn The function to use for sanitizing each object
 * @returns A new array with sanitized objects
 */
export function sanitizeArray<T>(array: T[], sanitizeFn: (item: T) => any): any[] {
  if (!array || !Array.isArray(array)) return [];
  return array.map(item => sanitizeFn(item));
}

export default {
  sanitizeInstallation,
  sanitizeArray
}; 