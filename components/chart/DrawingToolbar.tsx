/**
 * Drawing Toolbar Component - TradingView Style
 * Complete set of professional drawing tools
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
  | 'rectangle' 
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'channel'
  | 'fib-retracement'
  | 'fib-extension'
  | 'text'
  | 'price-label'
  | 'measure';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
}

interface ToolCategory {
  name: string;
  tools: Array<{
    id: DrawingTool;
    icon: JSX.Element | string;
    label: string;
  }>;
}

export default function DrawingToolbar({ activeTool, onToolChange, onClearAll }: DrawingToolbarProps) {
  // Keep all categories expanded by default for better UX
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null); 

  const toolCategories: ToolCategory[] = [
    {
      name: 'Lines',
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
      ]
    },
    {
      name: 'Shapes',
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
      name: 'Fibonacci',
      tools: [
        { 
          id: 'fib-retracement', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="20" strokeWidth="1" opacity="0.5"/><line x1="4" y1="16" x2="20" y2="16" strokeWidth="1" opacity="0.5"/><line x1="4" y1="12" x2="20" y2="12" strokeWidth="1" opacity="0.5"/></svg>,
          label: 'Fibonacci Retracement' 
        },
        { 
          id: 'fib-extension', 
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="16" x2="12" y2="8" strokeWidth="2"/><line x1="12" y1="8" x2="20" y2="4" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="20" strokeWidth="1" opacity="0.5"/></svg>,
          label: 'Fibonacci Extension' 
        },
      ]
    },
    {
      name: 'Annotations',
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

  return (
    <div className="absolute top-44 left-2 z-10 flex flex-col gap-1 bg-gray-900/95 border border-gray-700 rounded-lg p-1.5 shadow-lg max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Select Tool */}
      <button
        onClick={() => onToolChange('none')}
        className={`px-2 py-2 text-sm rounded transition-all flex items-center justify-center ${
          activeTool === 'none'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Select / Move"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 3 L13 9 L9 11 L7 15 L5 13 L9 11 L3 3Z" strokeWidth="2" fill="currentColor"/>
        </svg>
      </button>

      <div className="h-px bg-gray-700 my-1"></div>

      {/* Tool Categories - All expanded by default for easy access */}
      {toolCategories.map((category) => (
        <div key={category.name} className="flex flex-col">
          <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">
            {category.name}
          </div>

          <div className="flex flex-col gap-0.5 pl-1">
            {category.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  console.log('🔧 Tool button clicked:', tool.id);
                  onToolChange(tool.id);
                }}
                className={`px-2 py-2 text-sm rounded transition-all flex items-center justify-center ${
                  activeTool === tool.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="h-px bg-gray-700 my-1"></div>

      {/* Clear All */}
      <button
        onClick={onClearAll}
        className="px-2 py-2 text-sm rounded text-red-400 hover:text-red-300 hover:bg-gray-800 transition-all flex items-center justify-center"
        title="Clear All Drawings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

