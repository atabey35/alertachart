'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TrialPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function TrialPromotionModal({ isOpen, onClose, onUpgrade }: TrialPromotionModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  // Hydration-safe: Only render after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate time remaining until deadline
  useEffect(() => {
    if (!isOpen || !isMounted) return;

    const calculateTimeRemaining = () => {
      // Deadline: 10 Aralık 2024 23:00 Turkey time (UTC+3)
      const deadline = new Date('2024-12-10T23:00:00+03:00');
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

      setTimeRemaining({ days, hours, minutes });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second for real-time countdown
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (isOpen && isMounted) {
      // Immediately show, no delay
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, isMounted]);

  const handleClose = () => {
    // Mark as dismissed in localStorage so it won't show again
    if (typeof window !== 'undefined') {
      localStorage.setItem('trial_promotion_dismissed', 'true');
    }
    onClose();
  };

  // Hydration-safe: Don't render until mounted
  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        // Prevent closing on backdrop click for now
        e.stopPropagation();
      }}
    >
      <div 
        className="relative bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-2xl shadow-2xl border-2 border-blue-500/50 max-w-md w-full mx-4 overflow-hidden"
        style={{
          transform: 'scale(1)',
          opacity: 1, // Always fully visible when rendered
          zIndex: 999999,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          // Prevent event bubbling
          e.stopPropagation();
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-white transition-all backdrop-blur-sm border border-gray-700/50"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image Container */}
        {!imageError && (
          <div className="relative w-full aspect-[4/3] bg-gray-900 flex items-center justify-center">
            <img
              src="/promote.png"
              alt="Trial Promotion"
              className="w-full h-full object-contain"
              onError={() => {
                console.error('[TrialPromotionModal] Image load error');
                setImageError(true);
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-950 to-black">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Deneme Sürümü Hakkınız'a{' '}
              {timeRemaining && timeRemaining.days > 0 ? (
                <span className="text-blue-400">{timeRemaining.days} gün</span>
              ) : timeRemaining && timeRemaining.hours > 0 ? (
                <span className="text-blue-400">{timeRemaining.hours} saat</span>
              ) : timeRemaining && timeRemaining.minutes > 0 ? (
                <span className="text-blue-400">{timeRemaining.minutes} dakika</span>
              ) : (
                <span className="text-red-400">2 gün</span>
              )}{' '}
              Kaldı
            </h2>
            
            {/* Countdown Timer */}
            {timeRemaining ? (
              <div className="mb-3 p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/50 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-sm">
                  {timeRemaining.days > 0 && (
                    <>
                      <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-3xl font-black text-blue-400 tabular-nums">{String(timeRemaining.days).padStart(2, '0')}</span>
                        <span className="text-xs text-gray-300 font-medium mt-1">Gün</span>
                      </div>
                      <span className="text-blue-400 text-xl font-bold">:</span>
                    </>
                  )}
                  {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
                    <>
                      <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-3xl font-black text-blue-400 tabular-nums">{String(timeRemaining.hours).padStart(2, '0')}</span>
                        <span className="text-xs text-gray-300 font-medium mt-1">Saat</span>
                      </div>
                      <span className="text-blue-400 text-xl font-bold">:</span>
                    </>
                  )}
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-3xl font-black text-blue-400 tabular-nums">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                    <span className="text-xs text-gray-300 font-medium mt-1">Dakika</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-center text-gray-400 text-sm">Yükleniyor...</div>
              </div>
            )}
            
            <p className="text-gray-400 text-sm mb-4">
              Premium özelliklerden yararlanmak için abone olun
            </p>
            
            {/* Upgrade Button */}
            {onUpgrade && (
              <button
                onClick={() => {
                  onClose();
                  onUpgrade();
                }}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98]"
              >
                Premium'a Geç
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
