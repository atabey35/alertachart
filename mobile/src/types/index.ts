export interface WebToNativeMessage {
  type: 'REQUEST_PUSH_TOKEN' | 'NAVIGATION' | 'SHARE' | 'AUTH_TOKEN' | 'ALERT_TRIGGERED' | 'CUSTOM';
  payload?: any;
  token?: string; // For AUTH_TOKEN type
  alert?: any; // For ALERT_TRIGGERED type
  notification?: any; // For ALERT_TRIGGERED type
}

export interface NativeToWebMessage {
  type: 'PUSH_TOKEN' | 'DEVICE_ID' | 'DEVICE_INFO' | 'NOTIFICATION_TAPPED' | 'READY' | 'AUTH_TOKEN' | 'SAFE_AREA_INSETS' | 'CUSTOM';
  token?: string;
  deviceId?: string;
  payload?: any;
  insets?: {
    bottom?: number;
    top?: number;
    left?: number;
    right?: number;
  };
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: {
    type?: 'price_alert' | 'alarm' | 'general';
    symbol?: string;
    price?: string;
    url?: string;
  };
}

export interface DeviceRegistration {
  deviceId: string;
  expoPushToken: string;
  platform: 'ios' | 'android';
  appVersion: string;
}

export interface PriceAlert {
  id?: string;
  deviceId: string;
  symbol: string;
  targetPrice: number;
  proximityDelta: number;
  direction: 'up' | 'down';
  lastNotifiedAt?: string;
}

export interface AlarmSubscription {
  id?: string;
  deviceId: string;
  alarmKey: string;
  lastNotifiedAt?: string;
}


