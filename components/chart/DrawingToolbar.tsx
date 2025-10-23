/**
 * Drawing Toolbar Component
 * Provides drawing tools for chart (horizontal line, trend line, etc.)
 */

'use client';

import React from 'react';

export type DrawingTool = 'none' | 'horizontal' | 'trend' | 'rectangle' | 'circle';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
}

export default function DrawingToolbar({ activeTool, onToolChange, onClearAll }: DrawingToolbarProps) {
  const tools = [
    { id: 'none' as DrawingTool, icon: '↖️', label: 'Select' },
    { id: 'horizontal' as DrawingTool, icon: '—', label: 'Horizontal Line' },
    { id: 'trend' as DrawingTool, icon: '/', label: 'Trend Line' },
    { id: 'rectangle' as DrawingTool, icon: '▭', label: 'Rectangle' },
    { id: 'circle' as DrawingTool, icon: '○', label: 'Circle' },
  ];

  return (
    <div className="absolute top-14 left-2 z-10 flex flex-col gap-1 bg-gray-900/95 border border-gray-700 rounded-lg p-1 shadow-lg">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`px-2 py-2 text-sm rounded transition-all ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title={tool.label}
        >
          <span className="text-lg">{tool.icon}</span>
        </button>
      ))}
      
      <div className="h-px w-6 bg-gray-700 my-1 mx-auto"></div>
      
      <button
        onClick={onClearAll}
        className="px-2 py-2 text-sm rounded text-red-400 hover:text-red-300 hover:bg-gray-800 transition-all"
        title="Clear All Drawings"
      >
        <span className="text-lg">🗑️</span>
      </button>
    </div>
  );
}

