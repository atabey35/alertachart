/**
 * Alert Types
 */

export interface PriceAlert {
  id: string;
  exchange: string;
  pair: string;
  price: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggeredAt?: number;
  isTriggered: boolean;
}

export interface AlertNotification {
  id: string;
  alert: PriceAlert;
  message: string;
  timestamp: number;
}


