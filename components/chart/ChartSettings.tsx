/**
 * Chart Settings Modal
 * Allows users to customize chart appearance
 */

'use client';

import { useState, useEffect } from 'react';

export interface ChartSettingsType {
  // Watermark
  showWatermark: boolean;
  
  // Grid
  showGrid: boolean;
  gridVerticalColor: string;
  gridHorizontalColor: string;
  
  // Candlestick colors
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  
  // Volume colors
  volumeUpColor: string;
  volumeDownColor: string;
  
  // Background
  backgroundColor: string;
  textColor: string;
  
  // Crosshair
  showCrosshair: boolean;
  
  // Time scale
  showTimeScale: boolean;
  timeScaleVisible: boolean;
  secondsVisible: boolean;
}

export const DEFAULT_SETTINGS: ChartSettingsType = {
  showWatermark: false,
  showGrid: true,
  gridVerticalColor: '#1a1a1a',
  gridHorizontalColor: '#1a1a1a',
  upColor: '#26a69a',
  downColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  volumeUpColor: '#26a69a80',
  volumeDownColor: '#ef535080',
  backgroundColor: '#0a0a0a',
  textColor: '#d1d4dc',
  showCrosshair: true,
  showTimeScale: true,
  timeScaleVisible: true,
  secondsVisible: false,
};

interface ChartSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettingsType;
  onSave: (settings: ChartSettingsType) => void;
}

export default function ChartSettings({ isOpen, onClose, settings, onSave }: ChartSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ChartSettingsType>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Chart Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* General */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">General</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-300">Show Grid</span>
                <input
                  type="checkbox"
                  checked={localSettings.showGrid}
                  onChange={(e) => setLocalSettings({ ...localSettings, showGrid: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-gray-300">Show Crosshair</span>
                <input
                  type="checkbox"
                  checked={localSettings.showCrosshair}
                  onChange={(e) => setLocalSettings({ ...localSettings, showCrosshair: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-gray-300">Show Time</span>
                <input
                  type="checkbox"
                  checked={localSettings.timeScaleVisible}
                  onChange={(e) => setLocalSettings({ ...localSettings, timeScaleVisible: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-gray-300">Show Seconds</span>
                <input
                  type="checkbox"
                  checked={localSettings.secondsVisible}
                  onChange={(e) => setLocalSettings({ ...localSettings, secondsVisible: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
              </label>
            </div>
          </section>

          {/* Candlestick Colors */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Candlestick Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm text-gray-300">Up Color</span>
                <input
                  type="color"
                  value={localSettings.upColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, upColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Down Color</span>
                <input
                  type="color"
                  value={localSettings.downColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, downColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>
            </div>
          </section>

          {/* Volume Colors */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Volume Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm text-gray-300">Buy Volume</span>
                <input
                  type="color"
                  value={localSettings.volumeUpColor.replace('80', '')}
                  onChange={(e) => setLocalSettings({ ...localSettings, volumeUpColor: e.target.value + '80' })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Sell Volume</span>
                <input
                  type="color"
                  value={localSettings.volumeDownColor.replace('80', '')}
                  onChange={(e) => setLocalSettings({ ...localSettings, volumeDownColor: e.target.value + '80' })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>
            </div>
          </section>

          {/* Background & Grid */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Background & Grid</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm text-gray-300">Background</span>
                <input
                  type="color"
                  value={localSettings.backgroundColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Text Color</span>
                <input
                  type="color"
                  value={localSettings.textColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, textColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Grid Vertical</span>
                <input
                  type="color"
                  value={localSettings.gridVerticalColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, gridVerticalColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Grid Horizontal</span>
                <input
                  type="color"
                  value={localSettings.gridHorizontalColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, gridHorizontalColor: e.target.value })}
                  className="w-full h-10 rounded border border-gray-600 bg-gray-800"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

