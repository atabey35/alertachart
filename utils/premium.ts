/**
 * Premium & Trial Utility Functions
 * Handles premium access checks, trial status, and subscription validation
 */

export interface User {
  id: number;
  email: string;
  name?: string;
  plan: 'free' | 'premium';
  expiry_date?: Date | string | null;
  trial_started_at?: Date | string | null;
  trial_ended_at?: Date | string | null;
  subscription_started_at?: Date | string | null;
  subscription_platform?: 'ios' | 'android' | 'web' | null;
  subscription_id?: string | null;
}

/**
 * Check if user has active premium subscription
 */
export function isPremium(user: User | null): boolean {
  if (!user) return false;
  
  if (user.plan === 'premium') {
    // Expiry date kontrolü
    if (user.expiry_date) {
      const expiry = new Date(user.expiry_date);
      const now = new Date();
      return expiry > now;
    }
    // Expiry date yoksa premium sayılır (yeni premium kullanıcı veya lifetime)
    return true;
  }
  
  return false;
}

/**
 * Check if user has active trial
 * Trial: Ödeme yapıldıktan sonra 3 günlük deneme süresi
 */
export function isTrialActive(user: User | null): boolean {
  if (!user || !user.trial_started_at) return false;
  
  const trialStart = new Date(user.trial_started_at);
  const trialEnd = user.trial_ended_at ? new Date(user.trial_ended_at) : null;
  
  // Eğer trial_ended_at yoksa, trial_started_at'ten 3 gün sonrasını hesapla
  if (!trialEnd) {
    const calculatedEnd = new Date(trialStart);
    calculatedEnd.setDate(calculatedEnd.getDate() + 3);
    const now = new Date();
    return now >= trialStart && now < calculatedEnd;
  }
  
  // Trial bitiş tarihi varsa, kontrol et
  const now = new Date();
  return now >= trialStart && now < trialEnd;
}

/**
 * Check if user has premium access (premium subscription OR active trial)
 */
export function hasPremiumAccess(user: User | null): boolean {
  return isPremium(user) || isTrialActive(user);
}

/**
 * Get trial days remaining
 * Returns: number of days remaining in trial, or 0 if no trial
 */
export function getTrialDaysRemaining(user: User | null): number {
  if (!user || !user.trial_started_at) return 0;
  
  const trialStart = new Date(user.trial_started_at);
  const trialEnd = user.trial_ended_at ? new Date(user.trial_ended_at) : null;
  
  if (!trialEnd) {
    const calculatedEnd = new Date(trialStart);
    calculatedEnd.setDate(calculatedEnd.getDate() + 3);
    const now = new Date();
    const diff = calculatedEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  
  const now = new Date();
  const diff = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get premium expiry date (if premium)
 * Returns: expiry date or null
 */
export function getPremiumExpiryDate(user: User | null): Date | null {
  if (!user || !isPremium(user)) return null;
  
  if (user.expiry_date) {
    return new Date(user.expiry_date);
  }
  
  return null; // Lifetime premium
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(user: User | null): boolean {
  if (!user || user.plan !== 'premium') return false;
  
  if (!user.expiry_date) return false; // Lifetime premium
  
  const expiry = new Date(user.expiry_date);
  const now = new Date();
  return expiry <= now;
}

