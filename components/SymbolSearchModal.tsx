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
  { id: 'major', name: 'Major', icon: '⭐' },
  { id: 'defi', name: 'DeFi', icon: '🔷' },
  { id: 'meme', name: 'Meme', icon: '🐶' },
  { id: 'layer1', name: 'Layer 1', icon: '🏗️' },
  { id: 'ai', name: 'AI', icon: '🤖' },
];

const MAJOR_TOKENS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];
const DEFI_TOKENS = ['UNI', 'AAVE', 'COMP', 'SUSHI', 'CRV', 'SNX', 'MKR', 'YFI', 'CAKE', 'LDO', 'GMX'];
const MEME_TOKENS = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'DEGEN', 'MEME'];
const LAYER1_TOKENS = ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'FTM', 'ATOM', 'ALGO', 'EOS'];
const AI_TOKENS = ['FET', 'AGIX', 'OCEAN', 'RNDR', 'AI', 'TAO', 'ARKM'];

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
        
        // Get all trading pairs (USDT, BTC, ETH, BNB, BUSD, FDUSD, etc.)
        const allPairs = data.symbols
          .filter((s: any) => s.status === 'TRADING')
          .map((s: any) => ({
            symbol: s.symbol.toLowerCase(),
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            displayName: `${s.baseAsset}/${s.quoteAsset}`,
          }))
          .sort((a: SymbolInfo, b: SymbolInfo) => {
            // Sort by quote asset priority: USDT > BTC > ETH > BNB > others
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
            
            // Within same quote asset, sort major tokens first
            const aIsMajor = MAJOR_TOKENS.includes(a.baseAsset);
            const bIsMajor = MAJOR_TOKENS.includes(b.baseAsset);
            if (aIsMajor && !bIsMajor) return -1;
            if (!aIsMajor && bIsMajor) return 1;
            
            return a.baseAsset.localeCompare(b.baseAsset);
          });
        
        setSymbols(allPairs);
        console.log(`[Pairs] ✅ Loaded ${allPairs.length} ${marketType.toUpperCase()} trading pairs from Binance`);
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
      symbol.symbol.includes(searchQuery.toLowerCase()) ||
      symbol.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'major') return MAJOR_TOKENS.includes(symbol.baseAsset);
    if (selectedCategory === 'defi') return DEFI_TOKENS.includes(symbol.baseAsset);
    if (selectedCategory === 'meme') return MEME_TOKENS.includes(symbol.baseAsset);
    if (selectedCategory === 'layer1') return LAYER1_TOKENS.includes(symbol.baseAsset);
    if (selectedCategory === 'ai') return AI_TOKENS.includes(symbol.baseAsset);
    
    return true;
  });

  // Handle symbol add
  const handleAddSymbol = (symbol: string) => {
    onAddSymbol(symbol);
    setSearchQuery(''); // Clear search
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#131722] rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white">Symbol Search</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {marketType === 'futures' ? 'Binance Futures' : 'Binance Spot'} • All Trading Pairs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or symbol (e.g. BTC, Bitcoin)..."
              className="w-full bg-[#1E222D] text-white pl-10 pr-4 py-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2.5 px-4 py-4 border-b border-gray-800 bg-[#1E222D]/50">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#2A2E39] text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Symbol List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-gray-400">Loading symbols...</div>
            </div>
          ) : filteredSymbols.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-gray-400 text-center">
                <p className="font-medium">No symbols found</p>
                <p className="text-sm text-gray-600 mt-1">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredSymbols.slice(0, 150).map(symbol => {
                const isMajor = MAJOR_TOKENS.includes(symbol.baseAsset);
                const logoPath = `/logos/${symbol.baseAsset.toLowerCase()}.png`;
                
                return (
                  <div
                    key={symbol.symbol}
                    className="flex items-center justify-between p-3 hover:bg-[#1E222D] transition-colors group cursor-pointer"
                    onClick={() => handleAddSymbol(symbol.symbol)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Logo - using local logos from /public/logos */}
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <img 
                          src={logoPath}
                          alt={symbol.baseAsset}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to gradient if logo not found
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hidden items-center justify-center text-white font-bold text-sm"
                        >
                          {symbol.baseAsset.charAt(0)}
                        </div>
                      </div>
                      
                      {/* Symbol Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{symbol.displayName}</span>
                          {isMajor && (
                            <span className="text-yellow-500 text-xs">⭐</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {symbol.baseAsset} • Binance {marketType === 'futures' ? 'Perpetual' : 'Spot'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Add Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSymbol(symbol.symbol);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 shadow-lg"
                      title="Add to watchlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#1E222D] flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {filteredSymbols.length > 150 ? (
              <span>Showing 150 of <strong className="text-gray-400">{filteredSymbols.length}</strong> symbols</span>
            ) : (
              <span><strong className="text-gray-400">{filteredSymbols.length}</strong> symbols • {marketType === 'futures' ? 'Futures' : 'Spot'} market</span>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Press <kbd className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-400">ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
