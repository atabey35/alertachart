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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

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

  const handleEdit = (alert: PriceAlert) => {
    if (alert.isTriggered) return; // Can't edit triggered alerts
    setEditingId(alert.id);
    setEditPrice(alert.price.toString());
  };

  const handleSaveEdit = (id: string) => {
    const newPrice = parseFloat(editPrice);
    if (!isNaN(newPrice) && newPrice > 0 && currentPrice) {
      alertService.updateAlert(id, newPrice, currentPrice);
      setEditingId(null);
      setEditPrice('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice('');
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
    <div className="bg-gray-900 flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
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
              className="text-xs text-gray-400 hover:text-red-400 transition-colors ml-auto"
            >
              Clear triggered
            </button>
          )}
        </div>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
          <div>
            <div>No alerts set</div>
            <div className="text-xs mt-1">Click alarm icon on chart</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded p-2 transition-all ${
                alert.isTriggered
                  ? 'bg-green-900/30 border border-green-700/50'
                  : editingId === alert.id
                  ? 'bg-blue-900/30 border border-blue-500'
                  : 'bg-gray-800 border border-gray-700 hover:border-gray-600 cursor-pointer'
              }`}
              onClick={() => !alert.isTriggered && editingId !== alert.id && handleEdit(alert)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm ${
                    alert.isTriggered 
                      ? 'text-green-400' 
                      : alert.direction === 'above' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {alert.isTriggered ? '✓' : (alert.direction === 'above' ? '⬆' : '⬇')}
                  </div>
                  <span className="text-xs font-medium text-white">
                    {alert.pair.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!alert.isTriggered && editingId !== alert.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(alert);
                      }}
                      className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                      title="Edit price"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(alert.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove alert"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {editingId === alert.id ? (
                // Edit Mode
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(alert.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter price"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(alert.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-mono ${
                      alert.isTriggered ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      ${formatPrice(alert.price)}
                    </span>
                    {currentPrice && !alert.isTriggered && (
                      <span className="text-xs text-gray-500">
                        {alert.direction === 'above' 
                          ? `+${((alert.price - currentPrice) / currentPrice * 100).toFixed(1)}%`
                          : `-${((currentPrice - alert.price) / currentPrice * 100).toFixed(1)}%`
                        }
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTime(alert.isTriggered && alert.triggeredAt ? alert.triggeredAt : alert.createdAt)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

