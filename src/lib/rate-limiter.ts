interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  private getClientIdentifier(request: Request): string {
    // Try to get client IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    // Fallback to a generic identifier
    return 'unknown-client';
  }

  checkLimit(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const clientId = this.getClientIdentifier(request);
    const now = Date.now();
    
    // Get or create client record
    let client = this.store[clientId];
    if (!client || client.resetTime <= now) {
      client = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.store[clientId] = client;
    }
    
    // Check if limit exceeded
    const allowed = client.count < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - client.count);
    
    // Increment count if allowed
    if (allowed) {
      client.count++;
    }
    
    return {
      allowed,
      remaining,
      resetTime: client.resetTime
    };
  }

  getRateLimitHeaders(request: Request): Record<string, string> {
    const result = this.checkLimit(request);
    return {
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
    };
  }

  isAllowed(request: Request): boolean {
    return this.checkLimit(request).allowed;
  }
}

// Create different limiters for different endpoints
export const apiLimiter = new RateLimiter(60000, 100); // 100 requests per minute
export const authLimiter = new RateLimiter(60000, 10);  // 10 requests per minute for auth
export const uploadLimiter = new RateLimiter(60000, 5);  // 5 requests per minute for uploads

// Export the class for testing
export { RateLimiter };
export default RateLimiter;
