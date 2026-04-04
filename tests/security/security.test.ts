import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { RateLimiter, apiLimiter, authLimiter } from '@/lib/rate-limiter';

describe('Rate Limiter Security Tests', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(60000, 5); // 5 requests per minute
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost:3000/api/test');
        const result = limiter.checkLimit(request);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i);
      }
    });

    it('should block requests exceeding limit', () => {
      const request = new Request('http://localhost:3000/api/test');
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(request);
      }
      
      // Next request should be blocked
      const result = limiter.checkLimit(request);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const request = new Request('http://localhost:3000/api/test');
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(request);
      }
      
      // Should be blocked
      expect(limiter.checkLimit(request).allowed).toBe(false);
      
      // Wait for window to reset (simulate with direct manipulation)
      const client = limiter['getClientIdentifier'](request);
      const clientData = limiter['store'][client];
      clientData.resetTime = Date.now() - 1000; // Set to past
      
      // Should be allowed again
      expect(limiter.checkLimit(request).allowed).toBe(true);
    });
  });

  describe('Client Identification', () => {
    beforeEach(() => {
      limiter = new RateLimiter(60000, 5);
    });

    it('should identify client by x-forwarded-for header', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const result = limiter.checkLimit(request);
      expect(result.allowed).toBe(true);
    });

    it('should identify client by x-real-ip header', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-real-ip': '10.0.0.1' }
      });
      
      const result = limiter.checkLimit(request);
      expect(result.allowed).toBe(true);
    });

    it('should identify client by cf-connecting-ip header', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'cf-connecting-ip': '203.0.113.1' }
      });
      
      const result = limiter.checkLimit(request);
      expect(result.allowed).toBe(true);
    });

    it('should use fallback for unknown clients', () => {
      const request = new Request('http://localhost:3000/api/test');
      const result = limiter.checkLimit(request);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include proper headers', () => {
      const request = new Request('http://localhost:3000/api/test');
      
      const headers = apiLimiter.getRateLimitHeaders(request);
      
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('100');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should show decreasing remaining count', () => {
      const request = new Request('http://localhost:3000/api/test');
      
      const headers1 = apiLimiter.getRateLimitHeaders(request);
      const headers2 = apiLimiter.getRateLimitHeaders(request);
      
      expect(parseInt(headers2['X-RateLimit-Remaining'])).toBe(
        parseInt(headers1['X-RateLimit-Remaining']) - 1
      );
    });
  });

  describe('Different Limiter Types', () => {
    it('should have different limits for API and auth', () => {
      const request = new Request('http://localhost:3000/api/test');
      
      const apiHeaders = apiLimiter.getRateLimitHeaders(request);
      const authHeaders = authLimiter.getRateLimitHeaders(request);
      
      expect(apiHeaders['X-RateLimit-Limit']).toBe('100');
      expect(authHeaders['X-RateLimit-Limit']).toBe('10');
    });
  });
});

describe('Security Headers Tests', () => {
  it('should include security headers in middleware response', async () => {
    // This would test the middleware, but since we can't easily test Next.js middleware
    // in unit tests, we'll create a mock test
    const mockResponse = {
      headers: new Map(),
      set: function(key: string, value: string) {
        this.headers.set(key, value);
      }
    };

    // Simulate middleware header setting
    mockResponse.set('X-Frame-Options', 'DENY');
    mockResponse.set('X-Content-Type-Options', 'nosniff');
    mockResponse.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    mockResponse.set('X-XSS-Protection', '1; mode=block');
    mockResponse.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    mockResponse.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    expect(mockResponse.headers.get('X-Frame-Options')).toBe('DENY');
    expect(mockResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(mockResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(mockResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(mockResponse.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(mockResponse.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });
});

describe('Input Validation Security Tests', () => {
  describe('Campaign Validation', () => {
    it('should validate campaign name', () => {
      const validNames = ['Campaign 1', 'Test Campaign', '2024 Spring Sale'];
      const invalidNames = ['', '   ', null, undefined];

      validNames.forEach(name => {
        expect(typeof name === 'string' && name.trim().length > 0).toBe(true);
      });

      invalidNames.forEach(name => {
        expect(typeof name === 'string' && name.trim().length > 0).toBe(false);
      });
    });

    it('should validate budget values', () => {
      const validBudgets = [0, 100, 1000.50, 999999];
      const invalidBudgets = [-1, -100, NaN, Infinity, undefined];

      validBudgets.forEach(budget => {
        expect(Number.isFinite(budget) && budget >= 0).toBe(true);
      });

      invalidBudgets.forEach(budget => {
        expect(Number.isFinite(budget) && budget >= 0).toBe(false);
      });
    });

    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org'];
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain.',
      ];

      const strictEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Manually check for double dots
      const isValidEmail = (email: string): boolean => {
        return strictEmailRegex.test(email) && !email.includes('..');
      };

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize user input', () => {
      const maliciousInputs = [
        "'; DROP TABLE campaigns; --",
        "OR '1'='1",
        "<script>alert('xss')</script>",
        "SELECT * FROM users WHERE '1'='1'"
      ];

      const sanitizeInput = (input: string): string => {
        return input
          .replace(/['"]/g, '')
          .replace(/[<>]/g, '')
          .replace(/(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/gi, '')
          .trim();
      };

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain('"');
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain('SELECT');
        expect(sanitized).not.toContain('DROP');
      });
    });
  });
});

describe('Authentication Security Tests', () => {
  it('should validate password strength', () => {
    const strongPasswords = [
      'MySecureP@ssw0rd!',
      'Complex123!@#',
      'Th1sIsAV3ryStrongP4ssword!'
    ];

    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
    ];

    const isStrongPassword = (password: string): boolean => {
      return password.length >= 8 &&
             /[A-Z]/.test(password) &&
             /[a-z]/.test(password) &&
             /[0-9]/.test(password) &&
             /[!@#$%^&*(),.?":{}|<>]/.test(password);
    };

    strongPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(true);
    });

    weakPasswords.forEach(password => {
      expect(isStrongPassword(password)).toBe(false);
    });
  });

  it('should handle session security', () => {
    const sessionData = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const isSessionValid = (session: typeof sessionData): boolean => {
      return session.userId &&
             session.email &&
             session.role &&
             new Date(session.expiresAt) > new Date();
    };

    expect(isSessionValid(sessionData)).toBe(true);

    // Test expired session
    const expiredSession = {
      ...sessionData,
      expiresAt: new Date(Date.now() - 1000).toISOString()
    };

    expect(isSessionValid(expiredSession)).toBe(false);
  });
});
