/**
 * Drawing Toolbar Component - TradingView Style
 * Vertical left toolbar with popup sub-menus
 */

'use client';

import React, { useState } from 'react';

export type DrawingTool = 
  | 'none' 
  | 'horizontal' 
  | 'vertical'
  | 'trend' 
  | 'ray'
  | 'extended'
  | 'arrow'
  | 'brush'
  | 'rectangle' 
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'channel'
  | 'fib-retracement'
  | 'text'
  | 'price-label'
  | 'measure'
  | 'gann-fan'
  | 'speed-lines'
  | 'pitchfork'
  | 'wedge'
  | 'callout'
  | 'trend-fib-extension';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
}

interface ToolItem {
  id: DrawingTool;
  icon: React.ReactElement;
  label: string;
}

interface ToolCategory {
  id: string;
  name: string;
  icon: React.ReactElement;
  defaultTool: DrawingTool; // Default tool when clicking category icon
  tools: ToolItem[];
}

export default function DrawingToolbar({ activeTool, onToolChange, onClearAll }: DrawingToolbarProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };

    if (openCategory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openCategory]);

  // TradingView-style categories with main icons
  const toolCategories: ToolCategory[] = [
    {
      id: 'lines',
      name: 'Lines',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.5"/></svg>,
      defaultTool: 'trend', // Default: Trend Line
      tools: [
        { 
          id: 'trend', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/></svg>,
          label: 'Trend Line' 
        },
        { 
          id: 'horizontal', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" strokeWidth="2"/></svg>,
          label: 'Horizontal Line' 
        },
        { 
          id: 'vertical', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="4" x2="12" y2="20" strokeWidth="2"/></svg>,
          label: 'Vertical Line' 
        },
        { 
          id: 'ray', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><circle cx="4" cy="20" r="1.5" fill="currentColor"/></svg>,
          label: 'Ray' 
        },
        { 
          id: 'extended', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="2" y1="18" x2="22" y2="6" strokeWidth="2" strokeDasharray="2 2"/></svg>,
          label: 'Extended Line' 
        },
        { 
          id: 'arrow', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><polyline points="15,4 20,4 20,9" strokeWidth="2"/></svg>,
          label: 'Arrow' 
        },
        { 
          id: 'channel', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="18" x2="20" y2="6" strokeWidth="1.5"/><line x1="4" y1="14" x2="20" y2="2" strokeWidth="1.5"/></svg>,
          label: 'Parallel Channel' 
        },
        { 
          id: 'brush', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
          label: 'Brush (Freehand)' 
        },
      ]
    },
    {
      id: 'shapes',
      name: 'Shapes',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" strokeWidth="2.5" rx="2"/></svg>,
      defaultTool: 'rectangle', // Default: Rectangle
      tools: [
        { 
          id: 'rectangle', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" strokeWidth="2" rx="1"/></svg>,
          label: 'Rectangle' 
        },
        { 
          id: 'circle', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" strokeWidth="2"/></svg>,
          label: 'Circle' 
        },
        { 
          id: 'ellipse', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" strokeWidth="2"/></svg>,
          label: 'Ellipse' 
        },
        { 
          id: 'triangle', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4 L20 20 L4 20 Z" strokeWidth="2"/></svg>,
          label: 'Triangle' 
        },
      ]
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.5"/><line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.5" opacity="0.5"/><line x1="4" y1="16" x2="20" y2="16" strokeWidth="1.5" opacity="0.5"/><line x1="4" y1="12" x2="20" y2="12" strokeWidth="1.5" opacity="0.5"/></svg>,
      defaultTool: 'fib-retracement', // Default: Fib Retracement
      tools: [
        { 
          id: 'fib-retracement', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="20" strokeWidth="1" opacity="0.5"/><line x1="4" y1="16" x2="20" y2="16" strokeWidth="1" opacity="0.5"/><line x1="4" y1="12" x2="20" y2="12" strokeWidth="1" opacity="0.5"/></svg>,
          label: 'Fibonacci Retracement' 
        },
        { 
          id: 'trend-fib-extension', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="20" strokeWidth="1" opacity="0.5"/><line x1="4" y1="16" x2="20" y2="16" strokeWidth="1" opacity="0.5"/></svg>,
          label: 'Trend-based Fibonacci Extension' 
        },
      ]
    },
    {
      id: 'advanced',
      name: 'Advanced',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      defaultTool: 'gann-fan',
      tools: [
        { 
          id: 'gann-fan', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" strokeWidth="1.5" opacity="0.3"/><line x1="12" y1="4" x2="12" y2="20" strokeWidth="2"/><line x1="4" y1="12" x2="20" y2="12" strokeWidth="2"/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="1.5" opacity="0.5"/><line x1="18" y1="6" x2="6" y2="18" strokeWidth="1.5" opacity="0.5"/></svg>,
          label: 'Gann Fan' 
        },
        { 
          id: 'speed-lines', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="20" x2="12" y2="8" strokeWidth="1.5" opacity="0.6"/><line x1="4" y1="20" x2="16" y2="8" strokeWidth="1.5" opacity="0.6"/></svg>,
          label: 'Speed Lines' 
        },
        { 
          id: 'pitchfork', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="4" x2="12" y2="20" strokeWidth="2"/><line x1="4" y1="12" x2="12" y2="4" strokeWidth="1.5" opacity="0.7"/><line x1="20" y1="12" x2="12" y2="4" strokeWidth="1.5" opacity="0.7"/><line x1="4" y1="12" x2="12" y2="20" strokeWidth="1.5" opacity="0.7"/><line x1="20" y1="12" x2="12" y2="20" strokeWidth="1.5" opacity="0.7"/></svg>,
          label: 'Pitchfork (Andrew\'s)' 
        },
        { 
          id: 'wedge', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="12" y2="4" strokeWidth="2"/><line x1="20" y1="20" x2="12" y2="4" strokeWidth="2"/></svg>,
          label: 'Wedge' 
        },
        { 
          id: 'callout', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="12" height="8" strokeWidth="1.5" rx="1"/><text x="10" y="10" fontSize="8" fill="currentColor">!</text><line x1="10" y1="12" x2="6" y2="18" strokeWidth="1.5"/><polygon points="6,18 4,20 8,20" fill="currentColor"/></svg>,
          label: 'Callout' 
        },
      ]
    },
    {
      id: 'annotations',
      name: 'Text',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><text x="6" y="18" fontSize="16" fill="currentColor" fontWeight="bold">T</text></svg>,
      defaultTool: 'text', // Default: Text
      tools: [
        { 
          id: 'text', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><text x="6" y="16" fontSize="12" fill="currentColor">T</text></svg>,
          label: 'Text' 
        },
        { 
          id: 'price-label', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="4" strokeWidth="2" rx="1"/><text x="8" y="13.5" fontSize="6" fill="currentColor">$</text></svg>,
          label: 'Price Label' 
        },
        { 
          id: 'measure', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="17" x2="4" y2="20" strokeWidth="1.5"/><line x1="20" y1="4" x2="20" y2="7" strokeWidth="1.5"/></svg>,
          label: 'Measure' 
        },
      ]
    },
  ];

  // Check if any tool in a category is active
  const isCategoryActive = (category: ToolCategory) => {
    return category.tools.some(tool => tool.id === activeTool);
  };

  const handleCategoryClick = (categoryId: string, defaultTool: DrawingTool) => {
    if (openCategory === categoryId) {
      // If already open, activate default tool and close
      onToolChange(defaultTool);
      setOpenCategory(null);
    } else {
      // Open this category
      setOpenCategory(categoryId);
    }
  };

  const handleCategoryMouseEnter = (categoryId: string) => {
    // Only open on hover if nothing is open yet
    if (!openCategory) {
      setOpenCategory(categoryId);
    }
  };

  return (
    <>
      {/* MOBILE: Modern bottom toolbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-gradient-to-t from-gray-950 via-gray-900 to-gray-900 backdrop-blur-xl border-t border-gray-700/50 shadow-2xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 56px))', pointerEvents: 'auto' }}>
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="absolute -top-14 right-4 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-all border-2 border-blue-500/50"
        >
          <svg 
            className={`w-6 h-6 transition-transform duration-300 ${isMobileExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Tools Grid - Horizontal scrollable with all tools */}
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isMobileExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="px-4 pt-4 pb-2">
            {/* Horizontal scrollable container */}
            <div 
              className="overflow-x-auto overflow-y-hidden pb-2" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                {/* Cursor/Select Tool */}
                <button
                  onClick={() => {
                    onToolChange('none');
                    setIsMobileExpanded(false);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all active:scale-95 w-16 ${
                    activeTool === 'none'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <span className="text-[9px] font-medium text-center leading-tight">Cursor</span>
                </button>

                {/* All Tools from All Categories */}
                {toolCategories.map((category) => 
                  category.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onToolChange(tool.id);
                        setIsMobileExpanded(false);
                      }}
                      className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all active:scale-95 w-16 ${
                        activeTool === tool.id
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
                      }`}
                      title={tool.label}
                    >
                      {tool.icon}
                      <span className="text-[9px] font-medium text-center leading-tight">{tool.label}</span>
                    </button>
                  ))
                )}

                {/* Clear All */}
                <button
                  onClick={() => {
                    onClearAll();
                    setIsMobileExpanded(false);
                  }}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gray-800/80 text-red-400 hover:bg-red-900/30 active:scale-95 transition-all w-16"
                  title="Clear All"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-[9px] font-medium text-center leading-tight">Clear</span>
                </button>
              </div>
            </div>
            {/* Scroll indicator */}
            <div className="text-center text-[10px] text-gray-500 mt-1">
              ← Swipe to see all tools →
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-900/95 to-gray-800/95 border-t border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${activeTool === 'none' ? 'bg-gray-500' : 'bg-blue-500 animate-pulse'}`}></div>
            <span className="text-sm font-semibold text-gray-200">
              {activeTool === 'none' ? 'Cursor Mode' : toolCategories.flatMap(c => c.tools).find(t => t.id === activeTool)?.label || 'Drawing Tool'}
            </span>
          </div>
          <button
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            {isMobileExpanded ? 'Hide' : 'Tools'}
          </button>
        </div>
      </div>

      {/* DESKTOP: TradingView-style left toolbar with popup submenus */}
      <div ref={toolbarRef} className="hidden md:block relative h-full">
        <div className="flex flex-col gap-0.5 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 h-full pt-20 px-1">
          {/* Cursor/Select Tool */}
          <button
            onClick={() => {
              onToolChange('none');
              setOpenCategory(null);
            }}
            className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
              activeTool === 'none'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Cursor"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="h-px bg-gray-800 my-0.5"></div>

          {/* Category Icons - TradingView Style */}
          {toolCategories.map((category) => (
            <div key={category.id} className="relative">
              <button
                onClick={() => handleCategoryClick(category.id, category.defaultTool)}
                onMouseEnter={() => handleCategoryMouseEnter(category.id)}
                className={`w-10 h-10 rounded flex items-center justify-center transition-all group ${
                  isCategoryActive(category)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                title={category.name}
              >
                {category.icon}
                {/* Small arrow indicator for submenu */}
                <svg 
                  className="w-2.5 h-2.5 absolute right-1 bottom-1 opacity-50" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </button>

              {/* Popup Submenu - Opens to the right */}
              {openCategory === category.id && (
                <div 
                  className="absolute left-12 top-0 min-w-[180px] bg-gray-900/98 border border-gray-700/50 rounded-lg shadow-2xl backdrop-blur-md p-2 animate-in fade-in slide-in-from-left-2 duration-150 z-50"
                >
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mb-1">
                    {category.name}
                  </div>
                  <div className="space-y-0.5">
                    {category.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          onToolChange(tool.id);
                          setOpenCategory(null);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
                          activeTool === tool.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <div className="w-4 h-4 flex-shrink-0">
                          {tool.icon}
                        </div>
                        <span className="whitespace-nowrap">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="h-px bg-gray-800 my-0.5"></div>

          {/* Clear All */}
          <button
            onClick={onClearAll}
            className="w-10 h-10 rounded flex items-center justify-center text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
            title="Clear All Drawings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-left-2 {
          from { transform: translateX(-0.5rem); }
          to { transform: translateX(0); }
        }
        .animate-in {
          animation: fade-in 0.15s ease-out, slide-in-from-left-2 0.15s ease-out;
        }
      `}</style>
    </>
  );
}

