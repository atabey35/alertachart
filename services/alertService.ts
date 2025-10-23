/**
 * Alert Service
 * Manages price alerts
 */

import { PriceAlert } from '@/types/alert';

class AlertService {
  private alerts: PriceAlert[] = [];
  private listeners: Array<(alerts: PriceAlert[]) => void> = [];
  private storageKey = 'alerta-chart-alerts';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch (e) {
      console.error('[AlertService] Failed to load alerts:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.alerts));
    } catch (e) {
      console.error('[AlertService] Failed to save alerts:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.alerts));
  }

  subscribe(listener: (alerts: PriceAlert[]) => void) {
    this.listeners.push(listener);
    listener(this.alerts); // Initial call
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  addAlert(exchange: string, pair: string, price: number, currentPrice: number): PriceAlert {
    const alert: PriceAlert = {
      id: `${Date.now()}-${Math.random()}`,
      exchange,
      pair,
      price,
      direction: price > currentPrice ? 'above' : 'below',
      createdAt: Date.now(),
      isTriggered: false,
    };

    this.alerts.push(alert);
    this.saveToStorage();
    this.notifyListeners();

    console.log('[AlertService] Alert created:', alert);
    return alert;
  }

  removeAlert(id: string) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[AlertService] Alert removed:', id);
  }

  triggerAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert && !alert.isTriggered) {
      alert.isTriggered = true;
      alert.triggeredAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
      
      // Play sound
      this.playAlertSound();
      
      // Show notification
      this.showNotification(alert);
      
      console.log('[AlertService] Alert triggered:', alert);
    }
  }

  checkPrice(exchange: string, pair: string, currentPrice: number) {
    const relevantAlerts = this.alerts.filter(
      a => !a.isTriggered && 
           a.exchange === exchange && 
           a.pair === pair
    );

    relevantAlerts.forEach(alert => {
      const shouldTrigger = 
        (alert.direction === 'above' && currentPrice >= alert.price) ||
        (alert.direction === 'below' && currentPrice <= alert.price);

      if (shouldTrigger) {
        this.triggerAlert(alert.id);
      }
    });
  }

  getAlerts(exchange?: string, pair?: string): PriceAlert[] {
    if (!exchange || !pair) {
      return this.alerts;
    }
    
    return this.alerts.filter(
      a => a.exchange === exchange && a.pair === pair
    );
  }

  clearTriggered() {
    this.alerts = this.alerts.filter(a => !a.isTriggered);
    this.saveToStorage();
    this.notifyListeners();
  }

  private playAlertSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eeeSwgMUKXh8LdjHAU7k9r0yXkkBS53yO/ekEALFF6z6eepVRQKRp/h8r5sIQYpgM3y2og3Bxloue3ol04IDFCl4fC3YhwGO5HZ88t3JAUvd8jw35BAChResunu6FQUCkif4PG+aiAFKn/N89uIOwgZab3s5p1NDgpPpN/wtWMcBzqP2PPLdSQGMHfJ8N+RQAoUXrHp5+hUFApJneDyvmsgBSpyzvLaiTkHGWi56+aeUBANT6Ld7rZiGQg7jtfzy3UkBjB3yPDfkUAKFF+w6Obm5eXk5OXk5OPl5ebm5ufn5+jo6Ojo6enp6enq6urq6+vr6+zs7Ozs7e3t7e7u7u7u7+/v7+8AAA==');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('[AlertService] Could not play sound:', e));
    } catch (e) {
      console.error('[AlertService] Audio error:', e);
    }
  }

  private showNotification(alert: PriceAlert) {
    const message = `${alert.pair.toUpperCase()} ${alert.direction === 'above' ? '⬆' : '⬇'} $${alert.price.toFixed(2)}`;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Price Alert Triggered!', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const alertService = new AlertService();
export default alertService;


