/**
 * Environment configuration helper class
 */
export class EnvironmentConfig {
  /**
   * Check if we're in development mode
   */
  static get isDev(): boolean {
    // Explicitly log the environment for debugging
    console.log(`NODE_ENV is ${process.env.NODE_ENV}`);
    // Default to development mode if NODE_ENV is not set
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  }

  /**
   * Check if we're in test mode
   */
  static get isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Check if we're in production mode
   */
  static get isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get the base URL of the application
   */
  static get baseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Should we strictly enforce that registration email matches invitation email?
   * In development/test, we might want to be more lenient for testing purposes.
   */
  static get strictInvitationEmailMatching(): boolean {
    // Temporarily disabled - allow any email to be used with invitation tokens
    return false;
  }
} 