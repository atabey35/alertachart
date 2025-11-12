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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100000] animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-red-950/95 via-red-900/95 to-red-950/95 border-2 border-red-500/50 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl shadow-red-500/20 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-red-500/10 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"></div>
        
        <div className="relative z-10">
          {/* Alert Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              {/* Outer pulse rings */}
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
              
              {/* Middle ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-full animate-pulse opacity-50 blur-sm"></div>
              
              {/* Icon container */}
              <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-5 shadow-2xl shadow-red-500/50 ring-4 ring-red-500/30">
                <svg className="w-14 h-14 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Alert Title */}
          <div className="text-center mb-6">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 mb-2 tracking-tight">
              PRICE ALERT
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto rounded-full"></div>
          </div>

          {/* Alert Details */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 mb-6 border border-red-500/30 shadow-xl">
            <div className="space-y-4">
              {/* Symbol */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-gray-400 text-sm font-medium">Symbol</span>
                </div>
                <span className="text-white font-bold text-xl font-mono tracking-wider">
                  {alert.pair.toUpperCase()}
                </span>
              </div>

              {/* Direction */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-gray-400 text-sm font-medium">Direction</span>
                </div>
                <span className={`font-bold text-lg px-3 py-1.5 rounded-lg ${
                  alert.direction === 'above' 
                    ? 'text-green-300 bg-green-500/20 border border-green-500/30' 
                    : 'text-red-300 bg-red-500/20 border border-red-500/30'
                }`}>
                  {alert.direction === 'above' ? '↗ ABOVE' : '↘ BELOW'}
                </span>
              </div>

              {/* Target Price */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300 text-sm font-medium">Target Price</span>
                </div>
                <span className="text-yellow-300 font-mono font-black text-2xl tracking-tight">
                  ${alert.price.toFixed(alert.price < 1 ? 6 : 2)}
                </span>
              </div>
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="text-center mb-6 p-4 bg-black/30 rounded-xl border border-red-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Alert Duration</p>
            </div>
            <p className="text-white font-mono text-4xl font-black tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              {formatTime(elapsedTime)}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="w-full bg-gradient-to-r from-red-600 via-red-600 to-orange-600 hover:from-red-500 hover:via-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              DISMISS ALERT & STOP SOUND
            </span>
          </button>

          {/* Info Text */}
          <div className="mt-5 text-center">
            <p className="text-gray-400 text-xs font-medium flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Sound will continue until you dismiss this alert
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

