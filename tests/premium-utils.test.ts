/**
 * Premium Utility Functions - Unit Tests
 * 
 * Test cases for premium access checks, trial status, and subscription validation
 */

import { isPremium, isTrialActive, hasPremiumAccess, getTrialDaysRemaining, User } from '../utils/premium';

describe('Premium Utility Functions', () => {
  describe('isPremium', () => {
    it('should return false for null user', () => {
      expect(isPremium(null)).toBe(false);
    });

    it('should return false for free user', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
      };
      expect(isPremium(user)).toBe(false);
    });

    it('should return true for premium user without expiry', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
      };
      expect(isPremium(user)).toBe(true);
    });

    it('should return true for premium user with future expiry', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
        expiry_date: futureDate,
      };
      expect(isPremium(user)).toBe(true);
    });

    it('should return false for premium user with past expiry', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
        expiry_date: pastDate,
      };
      expect(isPremium(user)).toBe(false);
    });
  });

  describe('isTrialActive', () => {
    it('should return false for null user', () => {
      expect(isTrialActive(null)).toBe(false);
    });

    it('should return false for user without trial dates', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
      };
      expect(isTrialActive(user)).toBe(false);
    });

    it('should return true for active trial', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 1); // Started 1 day ago
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 2); // Ends in 2 days
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        trial_ended_at: trialEnd,
      };
      expect(isTrialActive(user)).toBe(true);
    });

    it('should return false for expired trial', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 5); // Started 5 days ago
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() - 2); // Ended 2 days ago
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        trial_ended_at: trialEnd,
      };
      expect(isTrialActive(user)).toBe(false);
    });

    it('should calculate trial end if not provided (3 days from start)', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 1); // Started 1 day ago
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        // trial_ended_at not provided
      };
      expect(isTrialActive(user)).toBe(true);
    });
  });

  describe('hasPremiumAccess', () => {
    it('should return false for null user', () => {
      expect(hasPremiumAccess(null)).toBe(false);
    });

    it('should return true for premium user', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
      };
      expect(hasPremiumAccess(user)).toBe(true);
    });

    it('should return true for active trial user', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 1);
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 2);
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        trial_ended_at: trialEnd,
      };
      expect(hasPremiumAccess(user)).toBe(true);
    });

    it('should return false for free user without trial', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
      };
      expect(hasPremiumAccess(user)).toBe(false);
    });
  });

  describe('getTrialDaysRemaining', () => {
    it('should return 0 for null user', () => {
      expect(getTrialDaysRemaining(null)).toBe(0);
    });

    it('should return 0 for user without trial', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
      };
      expect(getTrialDaysRemaining(user)).toBe(0);
    });

    it('should return correct days for active trial', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 1);
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 2);
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        trial_ended_at: trialEnd,
      };
      const days = getTrialDaysRemaining(user);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(3);
    });

    it('should return 0 for expired trial', () => {
      const now = new Date();
      const trialStart = new Date(now);
      trialStart.setDate(trialStart.getDate() - 5);
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() - 2);
      
      const user: User = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        trial_started_at: trialStart,
        trial_ended_at: trialEnd,
      };
      expect(getTrialDaysRemaining(user)).toBe(0);
    });
  });
});

