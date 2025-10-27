/**
 * Symbol Search Modal - TradingView-style symbol search
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSymbol: (symbol: string) => void;
  marketType?: 'spot' | 'futures';
}

interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🌐' },
  { id: 'crypto', name: 'Crypto', icon: '₿' },
  { id: 'futures', name: 'Futures', icon: '📈' },
  { id: 'defi', name: 'DeFi', icon: '🔷' },
  { id: 'meme', name: 'Meme', icon: '🐶' },
];

const DEFI_TOKENS = ['UNI', 'AAVE', 'COMP', 'SUSHI', 'CRV', 'SNX', 'MKR', 'YFI'];
const MEME_TOKENS = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'];

export default function SymbolSearchModal({ isOpen, onClose, onAddSymbol, marketType = 'spot' }: SymbolSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch symbols from Binance
  useEffect(() => {
    if (!isOpen) return;

    const fetchSymbols = async () => {
      setIsLoading(true);
      try {
        const baseUrl = marketType === 'futures' 
          ? 'https://fapi.binance.com/fapi/v1/exchangeInfo'
          : 'https://api.binance.com/api/v3/exchangeInfo';
        
        const response = await fetch(baseUrl);
        const data = await response.json();
        
        const usdtPairs = data.symbols
          .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s: any) => ({
            symbol: s.symbol.toLowerCase(),
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            displayName: `${s.baseAsset}/USDT`,
          }))
          .sort((a: SymbolInfo, b: SymbolInfo) => a.baseAsset.localeCompare(b.baseAsset));
        
        setSymbols(usdtPairs);
        console.log(`[Pairs] ✅ Loaded ${usdtPairs.length} ${marketType.toUpperCase()} USDT trading pairs from Binance`);
      } catch (error) {
        console.error('[Pairs] ❌ Failed to fetch symbols:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSymbols();
  }, [isOpen, marketType]);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter symbols based on search query and category
  const filteredSymbols = symbols.filter(symbol => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      symbol.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.symbol.includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'crypto') return true; // All are crypto
    if (selectedCategory === 'futures') return marketType === 'futures';
    if (selectedCategory === 'defi') return DEFI_TOKENS.includes(symbol.baseAsset);
    if (selectedCategory === 'meme') return MEME_TOKENS.includes(symbol.baseAsset);
    
    return true;
  });

  // Handle symbol add
  const handleAddSymbol = (symbol: string) => {
    onAddSymbol(symbol);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#131722] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Symbol Search</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-800">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full bg-[#1E222D] text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 p-4 border-b border-gray-800 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1E222D] text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Symbol List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-400">Loading symbols...</div>
            </div>
          ) : filteredSymbols.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-400">No symbols found</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredSymbols.map(symbol => (
                <div
                  key={symbol.symbol}
                  className="flex items-center justify-between p-3 hover:bg-[#1E222D] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {symbol.baseAsset.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{symbol.displayName}</div>
                      <div className="text-xs text-gray-500">
                        Binance • {marketType === 'futures' ? 'Perpetual' : 'Spot'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddSymbol(symbol.symbol)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5"
                    title="Add to watchlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#1E222D] text-xs text-gray-500">
          {filteredSymbols.length} symbols • {marketType === 'futures' ? 'Futures' : 'Spot'} market
        </div>
      </div>
    </div>
  );
}

