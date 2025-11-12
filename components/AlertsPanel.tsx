/**
 * Alerts Panel Component
 * Shows list of active price alerts
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PriceAlert } from '@/types/alert';
import alertService from '@/services/alertService';

interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
}

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
    pairInputRef.current?.focus();
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
    <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex flex-col h-full w-full overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              Alerts
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              <span className="text-blue-400 font-bold">{activeAlerts.length}</span> active
            </span>
            {triggeredAlerts.length > 0 && (
              <span className="text-xs text-gray-400 font-medium">
                <span className="text-green-400 font-bold">{triggeredAlerts.length}</span> triggered
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 font-medium ${
              showAll
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
            }`}
          >
            {showAll ? 'Current pair' : 'All pairs'}
          </button>
          
          <button
            onClick={() => setShowAddAlert(true)}
            className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Alert
          </button>
          
          {triggeredAlerts.length > 0 && (
            <button
              onClick={handleClearTriggered}
              className="text-xs px-3 py-1.5 bg-gray-800/50 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 font-medium ml-auto active:scale-95"
            >
              Clear triggered
            </button>
          )}
        </div>
      </div>

      {/* Add Alert Form */}
      {showAddAlert && (
        <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-white">Add New Alert</h4>
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
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Coin Pair</label>
              <div className="relative">
                <input
                  ref={pairInputRef}
                  type="text"
                  value={newAlertPair}
                  onChange={(e) => {
                    setNewAlertPair(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (filteredSymbols.length > 0) {
                      setShowSuggestions(true);
                    }
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
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-150 ${
                            isSelected
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
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Exchange</label>
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
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Target Price</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">$</span>
                <input
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
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Direction</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setNewAlertDirection('auto')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    newAlertDirection === 'auto'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                  }`}
                >
                  Auto
                </button>
                <button
                  onClick={() => setNewAlertDirection('above')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    newAlertDirection === 'above'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                  }`}
                >
                  ↗ Above
                </button>
                <button
                  onClick={() => setNewAlertDirection('below')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    newAlertDirection === 'below'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                  }`}
                >
                  ↘ Below
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
                Add Alert
              </button>
              <button
                onClick={handleCancelAddAlert}
                className="px-4 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs py-2.5 rounded-lg transition-all duration-200 font-semibold active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-700/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm mb-1 font-medium">No alerts set</div>
            <div className="text-gray-500 text-xs mb-4">Click &quot;Add Alert&quot; button or alarm icon on chart</div>
            <button
              onClick={() => setShowAddAlert(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-95"
            >
              Add Your First Alert
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5 bg-gradient-to-b from-transparent via-gray-900/20 to-transparent">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`group rounded-xl p-3 transition-all duration-200 ${
                alert.isTriggered
                  ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-700/50 shadow-lg shadow-green-500/10'
                  : editingId === alert.id
                  ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/40 border-2 border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 hover:border-gray-600/70 hover:shadow-lg hover:shadow-gray-900/50 cursor-pointer'
              }`}
              onClick={() => !alert.isTriggered && editingId !== alert.id && handleEdit(alert)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`text-lg font-bold ${
                    alert.isTriggered 
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
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-white">
                      {alert.pair.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {alert.exchange.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!alert.isTriggered && editingId !== alert.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(alert);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200 active:scale-95"
                      title="Edit price"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(alert.id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-95"
                    title="Remove alert"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs py-2 rounded-lg transition-all duration-200 font-semibold active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-base font-mono font-bold ${
                        alert.isTriggered 
                          ? 'text-green-300 bg-green-500/20 px-2 py-1 rounded-md' 
                          : 'text-blue-300'
                      }`}>
                        ${formatPrice(alert.price)}
                      </span>
                    </div>
                    {currentPrice && !alert.isTriggered && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        alert.direction === 'above'
                          ? 'text-green-300 bg-green-500/10'
                          : 'text-red-300 bg-red-500/10'
                      }`}>
                        {alert.direction === 'above' 
                          ? `+${((alert.price - currentPrice) / currentPrice * 100).toFixed(1)}%`
                          : `-${((currentPrice - alert.price) / currentPrice * 100).toFixed(1)}%`
                        }
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {alert.isTriggered ? 'Triggered ' : 'Created '}
                      {formatTime(alert.isTriggered && alert.triggeredAt ? alert.triggeredAt : alert.createdAt)}
                    </span>
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

