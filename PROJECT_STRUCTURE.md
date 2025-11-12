# 📂 Project Structure

## Root Directory

```
alertachart/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── push/                 # Push notification endpoints
│   │   │   ├── register/         # POST - Register device
│   │   │   ├── unregister/       # POST - Unregister device
│   │   │   ├── test/            # POST - Send test notification
│   │   │   └── service/         # Start/Stop proximity service
│   │   ├── alerts/              # Alert management endpoints
│   │   │   └── price/           # CRUD for price alerts
│   │   └── alarms/              # Alarm notification endpoints
│   │       └── notify/          # POST - Send alarm notification
│   ├── page.tsx                 # Main app page
│   └── layout.tsx               # Root layout
│
├── lib/                         # Backend libraries
│   └── push/                    # Push notification system
│       ├── db.ts                # Database operations
│       ├── expo-push.ts         # Expo push service
│       └── price-proximity.ts   # Price monitoring service
│
├── mobile/                      # Expo React Native App
│   ├── src/
│   │   ├── components/          # React Native components
│   │   │   └── AppWebView.tsx   # Main WebView component
│   │   ├── services/            # Service layer
│   │   │   ├── api.ts           # Backend API client
│   │   │   └── notifications.ts # Push notification setup
│   │   ├── utils/               # Utilities
│   │   │   ├── bridge.ts        # Native ↔ Web bridge
│   │   │   └── deviceId.ts      # Device ID management
│   │   └── types/               # TypeScript types
│   │       └── index.ts         # Shared types
│   ├── App.tsx                  # Main app component
│   ├── index.js                 # Entry point
│   ├── app.json                 # Expo config
│   ├── eas.json                 # EAS Build config
│   ├── package.json             # Dependencies
│   └── tsconfig.json            # TypeScript config
│
├── components/                  # React components (web)
│   ├── chart/                   # Chart components
│   └── AlertsPanel.tsx          # Alerts UI
│
├── services/                    # Frontend services
│   └── alertService.ts          # Alert management (updated)
│
├── database/                    # Database scripts
│   └── push-schema.sql          # Push notification schema
│
├── .env.example                 # Environment variables template
├── .env.local                   # Local environment (gitignored)
├── package.json                 # Backend dependencies
├── tsconfig.json                # TypeScript config
│
└── Documentation/
    ├── README.md                # Main documentation
    ├── QUICK_START.md           # Quick start guide
    ├── SETUP_GUIDE.md           # Detailed setup
    ├── PUSH_NOTIFICATIONS.md    # Push system docs
    └── PROJECT_STRUCTURE.md     # This file
```

## Key Files by Feature

### 🔔 Push Notifications (Backend)

**Database Layer**
- `lib/push/db.ts` - Database operations (devices, price_alerts, alarm_subscriptions)

**Push Service**
- `lib/push/expo-push.ts` - Expo push notification service
- `lib/push/price-proximity.ts` - Price monitoring and alert checking

**API Routes**
- `app/api/push/register/route.ts` - Register device token
- `app/api/push/unregister/route.ts` - Unregister device
- `app/api/push/test/route.ts` - Send test notification
- `app/api/push/service/start/route.ts` - Start price proximity service
- `app/api/push/service/stop/route.ts` - Stop service
- `app/api/alerts/price/route.ts` - Price alert CRUD operations
- `app/api/alarms/notify/route.ts` - Send alarm notifications

### 📱 Mobile App

**Core**
- `mobile/App.tsx` - Main application logic
- `mobile/src/components/AppWebView.tsx` - WebView with bridge

**Services**
- `mobile/src/services/notifications.ts` - Notification setup & handlers
- `mobile/src/services/api.ts` - Backend API client

**Utils**
- `mobile/src/utils/bridge.ts` - Web ↔ Native communication
- `mobile/src/utils/deviceId.ts` - Unique device ID management

**Config**
- `mobile/app.json` - Expo configuration
- `mobile/eas.json` - Build profiles
- `mobile/package.json` - Dependencies

### 🌐 Web Integration

**Alert Service**
- `services/alertService.ts` - Alert management (now sends push notifications)

## Dependencies

### Backend (package.json)
```json
{
  "@neondatabase/serverless": "^0.9.0",
  "expo-server-sdk": "^3.10.0",
  "next": "^15.0.0",
  "ws": "^8.18.0"
}
```

### Mobile (mobile/package.json)
```json
{
  "expo": "~51.0.0",
  "expo-notifications": "~0.28.0",
  "react-native-webview": "13.8.6",
  "expo-secure-store": "~13.0.0",
  "expo-device": "~6.0.0"
}
```

## Data Flow

### 1. Push Token Registration
```
Mobile App (startup)
  → Get Expo Push Token
  → POST /api/push/register
    → Save to devices table
      → Token stored in database
```

### 2. Price Alert Flow
```
User creates alert
  → POST /api/alerts/price
    → Save to price_alerts table

Price Proximity Service (running)
  → WebSocket: Subscribe to price feeds
  → Every 10s: Check active alerts
    → Match conditions
      → Send push via Expo
        → Update last_notified_at
```

### 3. Alarm Trigger Flow
```
Web: Alert triggered
  → services/alertService.ts
    → POST /api/alarms/notify
      → Find subscribed devices
        → Send push to all devices
          → Update last_notified_at
```

## Environment Variables

### Backend (.env.local)
```bash
DATABASE_URL=postgresql://...     # Neon database
EXPO_ACCESS_TOKEN=...            # Optional, for rate limiting
```

### Mobile (Development)
- Update `API_BASE_URL` in `src/services/api.ts`
- Update `WEBVIEW_URL` in `src/components/AppWebView.tsx`
- Update `projectId` in `app.json` and `src/services/notifications.ts`

## Build & Deploy

### Backend
```bash
npm run dev          # Development
npm run build        # Production build
npm start            # Production server
```

### Mobile
```bash
npm start                                    # Development
eas build --profile development --platform all   # Dev build
eas build --profile production --platform all    # Prod build
eas submit --platform ios                    # iOS submit
eas submit --platform android                # Android submit
```

## Database Migrations

Schema is auto-initialized on first API call. Manual setup:

```bash
# Run SQL script
psql $DATABASE_URL -f database/push-schema.sql
```

## Testing

### Backend
```bash
curl -X POST http://localhost:3000/api/push/test \
  -d '{"deviceId":"test"}'
```

### Mobile
```bash
npm start
# Scan QR with Expo Go
# Check console for device ID
```

## Monitoring

### Logs
- Backend: `npm run dev` console
- Mobile iOS: Xcode Device Console
- Mobile Android: `adb logcat`

### Database Queries
```sql
-- Active devices
SELECT COUNT(*) FROM devices WHERE is_active = true;

-- Active price alerts
SELECT * FROM price_alerts WHERE is_active = true;

-- Recent notifications
SELECT * FROM price_alerts 
WHERE last_notified_at > NOW() - INTERVAL '1 hour'
ORDER BY last_notified_at DESC;
```

## Support

- Main docs: [README.md](README.md)
- Quick start: [QUICK_START.md](QUICK_START.md)
- Setup guide: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Push docs: [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md)
- Mobile docs: [mobile/README.md](mobile/README.md)
