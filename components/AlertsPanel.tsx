/**
 * Alerts Panel Component
 * Shows list of active price alerts
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { PriceAlert } from '@/types/alert';
import alertService from '@/services/alertService';
import { Language, t } from '@/utils/translations';

interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
}

// Free users are limited to 2 alerts
const FREE_ALERT_LIMIT = 2;

interface AlertsPanelProps {
  exchange: string;
  pair: string;
  currentPrice?: number;
  language?: Language;
  isPremium?: boolean;
  onUpgradeRequest?: () => void;
}

export default function AlertsPanel({ exchange, pair, currentPrice, language = 'tr', isPremium = false, onUpgradeRequest }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAll, setShowAll] = useState(true); // Default: All pairs
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlertPair, setNewAlertPair] = useState<string>('');
  const [newAlertPrice, setNewAlertPrice] = useState<string>('');
  const [newAlertExchange, setNewAlertExchange] = useState<string>(exchange);
  const [newAlertDirection, setNewAlertDirection] = useState<'above' | 'below' | 'auto'>('auto');
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const pairInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Update exchange when it changes
  useEffect(() => {
    if (!showAddAlert) {
      setNewAlertExchange(exchange);
    }
  }, [exchange, showAddAlert]);

  // Fetch symbols when add alert form is shown
  useEffect(() => {
    if (!showAddAlert) {
      setSymbols([]);
      return;
    }

    const fetchSymbols = async () => {
      try {
        const isFutures = newAlertExchange === 'BINANCE_FUTURES';
        const baseUrl = isFutures
          ? 'https://fapi.binance.com/fapi/v1/exchangeInfo'
          : 'https://api.binance.com/api/v3/exchangeInfo';

        const response = await fetch(baseUrl);
        const data = await response.json();

        const allPairs = data.symbols
          .filter((s: any) => s.status === 'TRADING')
          .map((s: any) => ({
            symbol: s.symbol.toLowerCase(),
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            displayName: `${s.baseAsset}/${s.quoteAsset}`,
          }))
          .sort((a: SymbolInfo, b: SymbolInfo) => {
            const quotePriority: { [key: string]: number } = {
              'USDT': 0,
              'BTC': 1,
              'ETH': 2,
              'BNB': 3,
              'BUSD': 4,
              'FDUSD': 5,
            };

            const aPriority = quotePriority[a.quoteAsset] ?? 999;
            const bPriority = quotePriority[b.quoteAsset] ?? 999;

            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.baseAsset.localeCompare(b.baseAsset);
          });

        setSymbols(allPairs);
      } catch (error) {
        console.error('[AlertsPanel] Failed to fetch symbols:', error);
      }
    };

    fetchSymbols();
  }, [showAddAlert, newAlertExchange]);

  // Filter symbols based on input
  useEffect(() => {
    if (!newAlertPair.trim()) {
      setFilteredSymbols([]);
      setShowSuggestions(false);
      return;
    }

    const query = newAlertPair.toLowerCase().trim();
    const filtered = symbols
      .filter(s =>
        s.baseAsset.toLowerCase().includes(query) ||
        s.symbol.includes(query) ||
        s.displayName.toLowerCase().includes(query)
      )
      .slice(0, 8); // Limit to 8 suggestions

    setFilteredSymbols(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [newAlertPair, symbols]);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSymbols.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredSymbols.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSymbol(filteredSymbols[selectedSuggestionIndex].symbol);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle symbol selection
  const handleSelectSymbol = (symbol: string) => {
    setNewAlertPair(symbol);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setFilteredSymbols([]); // Clear filtered symbols to prevent list from showing again
    // Focus on price input after selecting coin (especially important on mobile)
    setTimeout(() => {
      priceInputRef.current?.focus();
      // Scroll to price input on mobile
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        priceInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        pairInputRef.current &&
        !pairInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

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

  const handleAddAlert = () => {
    const pairValue = newAlertPair.trim().toLowerCase();
    const priceValue = parseFloat(newAlertPrice);

    if (!pairValue || isNaN(priceValue) || priceValue <= 0) {
      return;
    }

    const direction = newAlertDirection === 'auto'
      ? undefined
      : newAlertDirection;

    alertService.addAlert(newAlertExchange, pairValue, priceValue, currentPrice, direction);

    // Reset form
    setNewAlertPair('');
    setNewAlertPrice('');
    setNewAlertExchange(exchange);
    setNewAlertDirection('auto');
    setShowAddAlert(false);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleCancelAddAlert = () => {
    setNewAlertPair('');
    setNewAlertPrice('');
    setNewAlertExchange(exchange);
    setNewAlertDirection('auto');
    setShowAddAlert(false);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Check if free user can add more alerts
  const handleShowAddAlert = () => {
    // Count active (non-triggered) alerts for limit check
    const activeAlertCount = alerts.filter(a => !a.isTriggered).length;

    // Free users are limited to FREE_ALERT_LIMIT alerts
    if (!isPremium && activeAlertCount >= FREE_ALERT_LIMIT) {
      // Trigger upgrade modal
      if (onUpgradeRequest) {
        onUpgradeRequest();
      }
      return;
    }

    // User can add alert
    setShowAddAlert(true);
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
    <div className="bg-black flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-black px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <h3 className="text-lg font-bold text-white">
              {t('alerts', language)}
            </h3>
            {activeAlerts.length > 0 && (
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {activeAlerts.length} {language === 'en' ? 'active' : 'aktif'}
              </span>
            )}
          </div>
          {triggeredAlerts.length > 0 && (
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
              {triggeredAlerts.length} {language === 'en' ? 'triggered' : 'tetiklendi'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className={`text-xs px-4 py-2 rounded-xl transition-all duration-200 font-semibold ${showAll
              ? 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 border border-blue-500/30'
              } hover:opacity-90 active:scale-[0.98]`}
          >
            {showAll ? (language === 'en' ? 'All pairs' : 'Tüm çiftler') : (language === 'en' ? 'Current pair' : 'Mevcut çift')}
          </button>

          <button
            onClick={handleShowAddAlert}
            className="text-xs px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] flex items-center gap-1.5"
          >
            <span className="text-base">+</span>
            <span>{language === 'en' ? 'Add Alert' : 'Alarm Ekle'}</span>
          </button>

          {triggeredAlerts.length > 0 && (
            <button
              onClick={handleClearTriggered}
              className="text-xs px-3 py-2 bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 font-semibold ml-auto active:scale-[0.98] border border-transparent hover:border-red-500/20"
            >
              {language === 'en' ? 'Clear triggered' : 'Tetiklenenleri temizle'}
            </button>
          )}
        </div>
      </div>

      {/* Add Alert Form */}
      {showAddAlert && (
        <div className="border-b border-slate-800/50 bg-black p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-white">{language === 'en' ? 'Add New Alert' : 'Yeni Alarm Ekle'}</h4>
            <button
              onClick={handleCancelAddAlert}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* Coin Pair */}
            <div className="relative">
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">{language === 'en' ? 'Coin Pair' : 'Coin Çifti'}</label>
              <div className="relative">
                <input
                  ref={pairInputRef}
                  type="text"
                  value={newAlertPair}
                  onChange={(e) => {
                    setNewAlertPair(e.target.value);
                    // Only show suggestions if there's text and it's not a complete match
                    if (e.target.value.trim().length > 0) {
                      setShowSuggestions(true);
                    } else {
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    // Only show suggestions if there's text and filtered results
                    if (newAlertPair.trim().length > 0 && filteredSymbols.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Close suggestions when input loses focus (with small delay to allow click on suggestion)
                    setTimeout(() => {
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. btcusdt, ethusdt"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-mono"
                  autoFocus
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && filteredSymbols.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto scrollbar-thin"
                  >
                    {filteredSymbols.map((symbol, index) => {
                      const logoPath = `/logos/${symbol.baseAsset.toLowerCase()}.png`;
                      const isSelected = index === selectedSuggestionIndex;

                      return (
                        <div
                          key={symbol.symbol}
                          onClick={() => handleSelectSymbol(symbol.symbol)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-150 ${isSelected
                            ? 'bg-blue-600/20 border-l-2 border-l-blue-500'
                            : 'hover:bg-gray-800/70'
                            }`}
                        >
                          {/* Logo */}
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <img
                              src={logoPath}
                              alt={symbol.baseAsset}
                              className="w-8 h-8 rounded-full ring-2 ring-gray-700/50"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hidden items-center justify-center text-white font-bold text-xs"
                            >
                              {symbol.baseAsset.charAt(0)}
                            </div>
                          </div>

                          {/* Symbol Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">{symbol.displayName}</span>
                            </div>
                            <div className="text-xs text-gray-400 truncate font-mono">
                              {symbol.symbol}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Exchange */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">{language === 'en' ? 'Exchange' : 'Borsa'}</label>
              <select
                value={newAlertExchange}
                onChange={(e) => {
                  setNewAlertExchange(e.target.value);
                  setNewAlertPair(''); // Clear pair when exchange changes
                  setShowSuggestions(false);
                }}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              >
                <option value="BINANCE">Binance Spot</option>
                <option value="BINANCE_FUTURES">Binance Futures</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">{language === 'en' ? 'Target Price' : 'Hedef Fiyat'}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">$</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  value={newAlertPrice}
                  onChange={(e) => setNewAlertPrice(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-mono"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAlert();
                    } else if (e.key === 'Escape') {
                      handleCancelAddAlert();
                    }
                  }}
                />
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">{language === 'en' ? 'Direction' : 'Yön'}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setNewAlertDirection('auto')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${newAlertDirection === 'auto'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                    }`}
                >
                  {language === 'en' ? 'Auto' : 'Otomatik'}
                </button>
                <button
                  onClick={() => setNewAlertDirection('above')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${newAlertDirection === 'above'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                    }`}
                >
                  ↗ {language === 'en' ? 'Above' : 'Yukarı'}
                </button>
                <button
                  onClick={() => setNewAlertDirection('below')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${newAlertDirection === 'below'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                    }`}
                >
                  ↘ {language === 'en' ? 'Below' : 'Aşağı'}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddAlert}
                disabled={!newAlertPair.trim() || !newAlertPrice || parseFloat(newAlertPrice) <= 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white text-xs py-2.5 rounded-lg transition-all duration-200 font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
              >
                {language === 'en' ? 'Add Alert' : 'Alarm Ekle'}
              </button>
              <button
                onClick={handleCancelAddAlert}
                className="px-4 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs py-2.5 rounded-lg transition-all duration-200 font-semibold active:scale-95"
              >
                {language === 'en' ? 'Cancel' : 'İptal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      {alerts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex items-center justify-center p-8 text-center relative overflow-hidden"
        >
          {/* Dark background - no gradient */}
          <div className="absolute inset-0 bg-black"></div>

          <div className="relative z-10">
            {/* Clickable animated bell icon */}
            <motion.button
              onClick={handleShowAddAlert}
              className="relative mx-auto mb-6 cursor-pointer group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ y: 0 }}
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              {/* Outer pulse rings - only one ring, no left black ring */}
              <motion.div
                className="absolute inset-0 bg-blue-500/20 rounded-full"
                animate={{
                  scale: [1, 1.5, 1.5],
                  opacity: [0.5, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />

              {/* Middle glow ring */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-blue-600/30 rounded-full blur-xl"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Icon container */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 border-2 border-blue-500/30 group-hover:border-blue-400/50 transition-all">
                <Bell className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={2} />
              </div>

              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>

            <h3 className="text-lg font-bold text-white mb-2">
              {language === 'en' ? 'No alerts yet' : 'Henüz alarm yok'}
            </h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
              {language === 'en'
                ? 'Tap the bell to create your first price alert and never miss important price movements'
                : 'Zil simgesine dokunarak ilk fiyat alarmınızı oluşturun ve önemli fiyat hareketlerini kaçırmayın'}
            </p>
            <motion.button
              onClick={handleShowAddAlert}
              className="mx-auto px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-4 h-4" />
              <span>{language === 'en' ? 'Create Alert' : 'Alarm Oluştur'}</span>
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-black">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`group relative rounded-xl p-4 transition-all duration-200 ${alert.isTriggered
                ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-700/50 shadow-lg shadow-green-500/10'
                : editingId === alert.id
                  ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/40 border-2 border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 border border-slate-800/50 hover:border-blue-500/30 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer'
                }`}
              onClick={() => !alert.isTriggered && editingId !== alert.id && handleEdit(alert)}
            >
              {/* Subtle gradient overlay on hover */}
              {!alert.isTriggered && editingId !== alert.id && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 rounded-xl transition-all pointer-events-none"></div>
              )}
              <div className="relative flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${alert.isTriggered
                    ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30'
                    : alert.direction === 'above'
                      ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30'
                      : 'bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30'
                    }`}>
                    <div className={`text-lg font-bold ${alert.isTriggered
                      ? 'text-green-400'
                      : alert.direction === 'above' ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {alert.isTriggered ? (
                        <div className="relative">
                          <span className="relative z-10">✓</span>
                          <div className="absolute inset-0 bg-green-400 rounded-full blur-sm opacity-50 animate-pulse"></div>
                        </div>
                      ) : (
                        alert.direction === 'above' ? '↗' : '↘'
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-white">
                      {alert.pair.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                      {alert.exchange.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!alert.isTriggered && editingId !== alert.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(alert);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition-all active:scale-95 border border-transparent hover:border-blue-500/20"
                      title={language === 'en' ? 'Edit price' : 'Fiyatı düzenle'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(alert.id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-all active:scale-95 border border-transparent hover:border-red-500/20"
                    title={language === 'en' ? 'Remove alert' : 'Alarmı kaldır'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {editingId === alert.id ? (
                // Edit Mode
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                    <span className="text-sm text-gray-400 font-medium">$</span>
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
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white font-mono font-semibold placeholder-gray-500"
                      placeholder="Enter price"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(alert.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs py-2 rounded-lg transition-all duration-200 font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
                    >
                      {language === 'en' ? 'Save' : 'Kaydet'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs py-2 rounded-lg transition-all duration-200 font-semibold active:scale-95"
                    >
                      {language === 'en' ? 'Cancel' : 'İptal'}
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-mono font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent ${alert.isTriggered
                        ? 'text-green-300'
                        : 'text-white'
                        }`}>
                        ${formatPrice(alert.price)}
                      </span>
                    </div>
                    {currentPrice && !alert.isTriggered && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${alert.direction === 'above'
                        ? 'text-green-400 bg-green-500/10 border-green-500/30'
                        : 'text-red-400 bg-red-500/10 border-red-500/30'
                        }`}>
                        {alert.direction === 'above'
                          ? `+${((alert.price - currentPrice) / currentPrice * 100).toFixed(1)}%`
                          : `-${((currentPrice - alert.price) / currentPrice * 100).toFixed(1)}%`
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {alert.isTriggered
                        ? (language === 'en' ? 'Triggered ' : 'Tetiklendi ')
                        : (language === 'en' ? 'Created ' : 'Oluşturuldu ')}
                      {formatTime(alert.isTriggered && alert.triggeredAt ? alert.triggeredAt : alert.createdAt)}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

