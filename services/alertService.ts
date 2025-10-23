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
      // Create Web Audio API context for better sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a more attention-grabbing alert sound (trading platform style)
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + duration);
        
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + duration);
      };
      
      // Longer alert sequence - 3 cycles (like urgent trading alerts)
      // First cycle
      playTone(800, 0.2, 0);        // First beep
      playTone(1000, 0.2, 0.25);    // Second beep (higher)
      playTone(1200, 0.3, 0.5);     // Third beep (highest, longer)
      
      // Second cycle (repeat after short pause)
      playTone(800, 0.2, 0.9);      // First beep
      playTone(1000, 0.2, 1.15);    // Second beep (higher)
      playTone(1200, 0.3, 1.4);     // Third beep (highest, longer)
      
      // Third cycle (final, slightly longer)
      playTone(800, 0.2, 1.8);      // First beep
      playTone(1000, 0.2, 2.05);    // Second beep (higher)
      playTone(1200, 0.4, 2.3);     // Third beep (highest, longest)
      
      console.log('[AlertService] Alert sound played (extended)');
    } catch (e) {
      console.error('[AlertService] Audio error:', e);
      // Fallback to simple beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eeeSwgMUKXh8LdjHAU7k9r0yXkkBS53yO/ekEALFF6z6eepVRQKRp/h8r5sIQYpgM3y2og3Bxloue3ol04IDFCl4fC3YhwGO5HZ88t3JAUvd8jw35BAChResunu6FQUCkif4PG+aiAFKn/N89uIOwgZab3s5p1NDgpPpN/wtWMcBzqP2PPLdSQGMHfJ8N+RQAoUXrHp5+hUFApJneDyvmsgBSpyzvLaiTkHGWi56+aeUBANT6Ld7rZiGQg7jtfzy3UkBjB3yPDfkUAKFF+w6Obm5eXk5OXk5OPl5ebm5ufn5+jo6Ojo6enp6enq6urq6+vr6+zs7Ozs7e3t7e7u7u7u7+/v7+8AAA==');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('[AlertService] Fallback sound failed:', err));
      } catch (fallbackError) {
        console.error('[AlertService] Fallback audio error:', fallbackError);
      }
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


