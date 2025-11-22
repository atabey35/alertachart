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
  
  // Indicators
  showRSI: boolean;
  rsiPeriod: number;
  showMACD: boolean;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  
  // Bollinger Bands
  showBB: boolean;
  bbPeriod: number;
  bbStdDev: number;
  
  // Moving Averages (EMA)
  showMA50: boolean;
  showMA100: boolean;
  showMA200: boolean;
  
  // Simple Moving Averages (SMA)
  showSMA50: boolean;
  showSMA100: boolean;
  showSMA200: boolean;
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
  secondsVisible: true,
  showRSI: false,
  rsiPeriod: 14,
  showMACD: false,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  showBB: false,
  bbPeriod: 20,
  bbStdDev: 2,
  showMA50: false,
  showMA100: false,
  showMA200: false,
  showSMA50: false,
  showSMA100: false,
  showSMA200: false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800/50 rounded-none md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30 backdrop-blur-sm">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Chart Settings
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 hidden md:block">Customize your chart appearance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 active:scale-95"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-6 scrollbar-thin">
          {/* General */}
          <section className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
              General
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/30 transition-colors duration-200 cursor-pointer group">
                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Show Grid</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localSettings.showGrid}
                    onChange={(e) => setLocalSettings({ ...localSettings, showGrid: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-all"
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/30 transition-colors duration-200 cursor-pointer group">
                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Show Crosshair</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localSettings.showCrosshair}
                    onChange={(e) => setLocalSettings({ ...localSettings, showCrosshair: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-all"
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/30 transition-colors duration-200 cursor-pointer group">
                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Show Time</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localSettings.timeScaleVisible}
                    onChange={(e) => setLocalSettings({ ...localSettings, timeScaleVisible: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-all"
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/30 transition-colors duration-200 cursor-pointer group">
                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Show Seconds</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localSettings.secondsVisible}
                    onChange={(e) => setLocalSettings({ ...localSettings, secondsVisible: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-all"
                  />
                </div>
              </label>
            </div>
          </section>

          {/* Candlestick Colors */}
          <section className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
              Candlestick Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Up Color</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.upColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, upColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"></div>
                </div>
              </label>

              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Down Color</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.downColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, downColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-red-500/20 transition-all"></div>
                </div>
              </label>
            </div>
          </section>

          {/* Volume Colors */}
          <section className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              Volume Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Buy Volume</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.volumeUpColor.replace('80', '')}
                    onChange={(e) => setLocalSettings({ ...localSettings, volumeUpColor: e.target.value + '80' })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-green-500/20 transition-all"></div>
                </div>
              </label>

              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Sell Volume</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.volumeDownColor.replace('80', '')}
                    onChange={(e) => setLocalSettings({ ...localSettings, volumeDownColor: e.target.value + '80' })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-red-500/20 transition-all"></div>
                </div>
              </label>
            </div>
          </section>

          {/* Background & Grid */}
          <section className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
              Background & Grid
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Background</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.backgroundColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"></div>
                </div>
              </label>

              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Text Color</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.textColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, textColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"></div>
                </div>
              </label>

              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Grid Vertical</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.gridVerticalColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, gridVerticalColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"></div>
                </div>
              </label>

              <label className="space-y-2 group">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Grid Horizontal</span>
                <div className="relative">
                  <input
                    type="color"
                    value={localSettings.gridHorizontalColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, gridHorizontalColor: e.target.value })}
                    className="w-full h-12 rounded-lg border-2 border-gray-700/50 bg-gray-800/50 cursor-pointer hover:border-gray-600 transition-all duration-200 shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"></div>
                </div>
              </label>
            </div>
          </section>

          {/* Technical Indicators */}
          <section className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-3 border border-gray-800/50">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
              Technical Indicators
            </h3>
            <div className="space-y-2">
              {/* RSI */}
              <div className="space-y-1.5 p-2 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-gray-300 font-semibold group-hover:text-white transition-colors">RSI</span>
                  <input
                    type="checkbox"
                    checked={localSettings.showRSI}
                    onChange={(e) => setLocalSettings({ ...localSettings, showRSI: e.target.checked })}
                    className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                  />
                </label>
                {localSettings.showRSI && (
                  <label className="flex items-center justify-between p-1 bg-gray-900/30 rounded">
                    <span className="text-xs text-gray-400 font-medium">Period</span>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={localSettings.rsiPeriod}
                      onChange={(e) => setLocalSettings({ ...localSettings, rsiPeriod: parseInt(e.target.value) || 14 })}
                      className="w-12 px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </label>
                )}
              </div>

              {/* MACD */}
              <div className="space-y-1.5 p-2 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-gray-300 font-semibold group-hover:text-white transition-colors">MACD</span>
                  <input
                    type="checkbox"
                    checked={localSettings.showMACD}
                    onChange={(e) => setLocalSettings({ ...localSettings, showMACD: e.target.checked })}
                    className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                  />
                </label>
                {localSettings.showMACD && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Fast</span>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={localSettings.macdFast}
                        onChange={(e) => setLocalSettings({ ...localSettings, macdFast: parseInt(e.target.value) || 12 })}
                        className="w-full px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Slow</span>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={localSettings.macdSlow}
                        onChange={(e) => setLocalSettings({ ...localSettings, macdSlow: parseInt(e.target.value) || 26 })}
                        className="w-full px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Signal</span>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={localSettings.macdSignal}
                        onChange={(e) => setLocalSettings({ ...localSettings, macdSignal: parseInt(e.target.value) || 9 })}
                        className="w-full px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Bollinger Bands */}
              <div className="space-y-1.5 p-2 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-gray-300 font-semibold group-hover:text-white transition-colors">Bollinger</span>
                  <input
                    type="checkbox"
                    checked={localSettings.showBB}
                    onChange={(e) => setLocalSettings({ ...localSettings, showBB: e.target.checked })}
                    className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                  />
                </label>
                {localSettings.showBB && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Period</span>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={localSettings.bbPeriod}
                        onChange={(e) => setLocalSettings({ ...localSettings, bbPeriod: parseInt(e.target.value) || 20 })}
                        className="w-full px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Std Dev</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={localSettings.bbStdDev}
                        onChange={(e) => setLocalSettings({ ...localSettings, bbStdDev: parseFloat(e.target.value) || 2 })}
                        className="w-full px-1.5 py-0.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Moving Averages (EMA) */}
              <div className="space-y-2 p-2 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                <div className="text-gray-300 font-semibold mb-1.5 text-sm">EMA</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showMA50}
                      onChange={(e) => setLocalSettings({ ...localSettings, showMA50: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">50</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showMA100}
                      onChange={(e) => setLocalSettings({ ...localSettings, showMA100: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">100</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showMA200}
                      onChange={(e) => setLocalSettings({ ...localSettings, showMA200: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">200</span>
                  </label>
                </div>
              </div>

              {/* Simple Moving Averages (SMA) */}
              <div className="space-y-2 p-2 bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                <div className="text-gray-300 font-semibold mb-1.5 text-sm">SMA</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showSMA50}
                      onChange={(e) => setLocalSettings({ ...localSettings, showSMA50: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-1 focus:ring-green-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">50</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showSMA100}
                      onChange={(e) => setLocalSettings({ ...localSettings, showSMA100: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-1 focus:ring-green-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">100</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.showSMA200}
                      onChange={(e) => setLocalSettings({ ...localSettings, showSMA200: e.target.checked })}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-1 focus:ring-green-500/50 cursor-pointer transition-all"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">200</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}

