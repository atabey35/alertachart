/**
 * Alerts Panel Component
 * Shows list of active price alerts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PriceAlert } from '@/types/alert';
import alertService from '@/services/alertService';

interface AlertsPanelProps {
  exchange: string;
  pair: string;
  currentPrice?: number;
}

export default function AlertsPanel({ exchange, pair, currentPrice }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((allAlerts) => {
      if (showAll) {
        setAlerts(allAlerts);
      } else {
        setAlerts(allAlerts.filter(a => a.exchange === exchange && a.pair === pair));
      }
    });

    return unsubscribe;
  }, [exchange, pair, showAll]);

  const handleRemove = (id: string) => {
    alertService.removeAlert(id);
  };

  const handleClearTriggered = () => {
    alertService.clearTriggered();
  };

  const activeAlerts = alerts.filter(a => !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);

  const formatPrice = (price: number) => {
    return price.toFixed(price < 1 ? 4 : 2);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-bold text-white">Alerts</h3>
          </div>
          <span className="text-xs text-gray-500">
            {activeAlerts.length} active
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showAll ? 'Current pair' : 'All pairs'}
          </button>
          
          {triggeredAlerts.length > 0 && (
            <button
              onClick={handleClearTriggered}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear triggered
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <div>No alerts set</div>
          <div className="text-xs mt-1">Right-click on chart to set price alert</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-2 rounded ${
                alert.isTriggered
                  ? 'bg-green-900/30 border border-green-700/50'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {alert.isTriggered ? (
                  <div className="text-green-400 text-xs">✓</div>
                ) : (
                  <div className={`text-xs ${
                    alert.direction === 'above' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {alert.direction === 'above' ? '⬆' : '⬇'}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">
                      {alert.exchange}
                    </span>
                    <span className="text-xs text-gray-400">
                      {alert.pair.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-sm font-mono ${
                      alert.isTriggered ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      ${formatPrice(alert.price)}
                    </span>
                    {currentPrice && !alert.isTriggered && (
                      <span className="text-xs text-gray-500">
                        {alert.direction === 'above' 
                          ? `+${((alert.price - currentPrice) / currentPrice * 100).toFixed(2)}%`
                          : `-${((currentPrice - alert.price) / currentPrice * 100).toFixed(2)}%`
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {formatTime(alert.isTriggered && alert.triggeredAt ? alert.triggeredAt : alert.createdAt)}
                </div>
              </div>

              <button
                onClick={() => handleRemove(alert.id)}
                className="ml-2 p-1 text-gray-500 hover:text-red-400 transition-colors"
                title="Remove alert"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

