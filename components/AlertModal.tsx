'use client';

import { PriceAlert } from '@/types/alert';
import { useEffect, useState } from 'react';

interface AlertModalProps {
  alert: PriceAlert | null;
  onDismiss: () => void;
}

export default function AlertModal({ alert, onDismiss }: AlertModalProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (!alert) {
      setElapsedTime(0);
      return;
    }

    // Update elapsed time every second
    const interval = setInterval(() => {
      const now = Date.now();
      const triggeredAt = alert.triggeredAt || now;
      const elapsed = Math.floor((now - triggeredAt) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [alert]);

  if (!alert) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-red-900/95 to-red-800/95 border-2 border-red-500 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in duration-300">
        {/* Alert Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-red-600 rounded-full p-4">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Alert Title */}
        <h2 className="text-3xl font-bold text-white text-center mb-2">
          🚨 PRICE ALERT!
        </h2>

        {/* Alert Details */}
        <div className="bg-black/30 rounded-lg p-4 mb-4 border border-red-400/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Symbol:</span>
            <span className="text-white font-bold text-lg">{alert.pair.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Direction:</span>
            <span className={`font-bold text-lg ${alert.direction === 'above' ? 'text-green-400' : 'text-red-400'}`}>
              {alert.direction === 'above' ? '⬆ ABOVE' : '⬇ BELOW'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Target Price:</span>
            <span className="text-yellow-400 font-bold text-xl">
              ${alert.price.toFixed(alert.price < 1 ? 6 : 2)}
            </span>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="text-center mb-6">
          <p className="text-gray-300 text-sm mb-1">Alert Duration</p>
          <p className="text-white font-mono text-2xl font-bold">{formatTime(elapsedTime)}</p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          DISMISS ALERT & STOP SOUND
        </button>

        {/* Info Text */}
        <p className="text-center text-gray-300 text-xs mt-4">
          Sound will continue until you dismiss this alert
        </p>
      </div>
    </div>
  );
}

