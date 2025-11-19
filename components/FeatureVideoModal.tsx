'use client';

import { useState, useEffect } from 'react';
import { X, Play, Loader2 } from 'lucide-react';

interface FeatureVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: {
    title: string;
    videoUrl?: string;
    videoUrls?: Array<{ label: string; url: string }>;
    description: string;
  };
}

export default function FeatureVideoModal({ isOpen, onClose, feature }: FeatureVideoModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  // Multiple videos support
  const hasMultipleVideos = feature.videoUrls && feature.videoUrls.length > 0;
  const currentVideoUrl = hasMultipleVideos 
    ? feature.videoUrls[selectedVideoIndex]?.url 
    : feature.videoUrl;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      setSelectedVideoIndex(0);
    }
  }, [isOpen, currentVideoUrl]);

  if (!isOpen) return null;

  // Video URL yoksa placeholder göster
  const hasVideo = (hasMultipleVideos && feature.videoUrls && feature.videoUrls.length > 0) || 
                   (feature.videoUrl && feature.videoUrl.trim() !== '');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 safe-area-inset">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden" style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
          <p className="text-gray-400 text-sm">{feature.description}</p>
          
          {/* Video Selector (if multiple videos) */}
          {hasMultipleVideos && feature.videoUrls && feature.videoUrls.length > 1 && (
            <div className="flex gap-2 mt-4">
              {feature.videoUrls.map((video, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedVideoIndex(index);
                    setIsLoading(true);
                    setHasError(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedVideoIndex === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {video.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Video Container */}
        <div className="relative w-full aspect-video bg-gray-900/50">
          {hasVideo ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 p-6">
                  <Play className="w-16 h-16 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-sm text-center">
                    Video yüklenemedi. Lütfen daha sonra tekrar deneyin.
                  </p>
                </div>
              )}
              <video
                key={currentVideoUrl}
                src={currentVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                onLoadedData={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Play className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-gray-400 text-sm text-center max-w-sm">
                {feature.title} özelliği için tanıtım videosu yakında eklenecek.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/30 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all active:scale-[0.98] touch-manipulation"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

