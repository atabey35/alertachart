'use client';

import React, { useState, useEffect } from 'react';
import { Drawing } from '@/types/drawing';

interface DrawingPropertiesModalProps {
  drawing: Drawing | null;
  onClose: () => void;
  onUpdate: (drawing: Drawing) => void;
  onDelete: () => void;
}

export default function DrawingPropertiesModal({
  drawing,
  onClose,
  onUpdate,
  onDelete
}: DrawingPropertiesModalProps) {
  const defaultFillColor = 'rgba(41, 98, 255, 0.1)';
  
  const [color, setColor] = useState(drawing?.color || '#2962FF');
  const [lineWidth, setLineWidth] = useState(drawing?.lineWidth || 2);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>(drawing?.lineStyle || 'solid');
  const [fillColor, setFillColor] = useState(drawing?.fillColor || defaultFillColor);
  const [text, setText] = useState(drawing?.text || '');
  const [extendRight, setExtendRight] = useState(drawing?.extendRight || false);
  const [extendLeft, setExtendLeft] = useState(drawing?.extendLeft || false);

  useEffect(() => {
    if (drawing) {
      setColor(drawing.color || '#2962FF');
      setLineWidth(drawing.lineWidth || 2);
      setLineStyle(drawing.lineStyle || 'solid');
      setFillColor(drawing.fillColor || defaultFillColor);
      setText(drawing.text || '');
      setExtendRight(drawing.extendRight || false);
      setExtendLeft(drawing.extendLeft || false);
    }
  }, [drawing]);

  if (!drawing) return null;

  const handleSave = () => {
    console.log('💾 Saving drawing with fillColor:', fillColor);
    const updatedDrawing = {
      ...drawing,
      color,
      lineWidth,
      lineStyle,
      fillColor,
      text,
      extendRight,
      extendLeft
    };
    console.log('💾 Updated drawing:', updatedDrawing);
    onUpdate(updatedDrawing);
    onClose();
  };

  const isShapeWithFill = ['rectangle', 'circle', 'ellipse', 'triangle'].includes(drawing.type);
  const isLine = ['horizontal', 'vertical', 'trend', 'ray', 'extended', 'arrow', 'channel'].includes(drawing.type);
  const isText = drawing.type === 'text' || drawing.type === 'callout';

  // Predefined colors
  const colors = [
    '#2962FF', // Blue
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#95E1D3', // Mint
    '#FFD93D', // Yellow
    '#FF8B94', // Pink
    '#A8E6CF', // Light Green
    '#FFA726', // Orange
    '#9575CD', // Purple
    '#78909C', // Blue Grey
    '#FFFFFF', // White
    '#000000', // Black
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Çizim Özellikleri</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Renk</label>
          <div className="grid grid-cols-6 gap-2 mb-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-full aspect-square rounded border-2 ${
                  color === c ? 'border-white' : 'border-gray-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>

        {/* Line Width */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Çizgi Kalınlığı: {lineWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Line Style */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Çizgi Stili</label>
          <div className="grid grid-cols-3 gap-2">
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setLineStyle(style)}
                className={`px-3 py-2 rounded text-sm ${
                  lineStyle === style
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {style === 'solid' && 'Düz'}
                {style === 'dashed' && 'Kesik'}
                {style === 'dotted' && 'Noktalı'}
              </button>
            ))}
          </div>
        </div>

        {/* Fill Color (for shapes) */}
        {isShapeWithFill && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">İç Renk</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={(() => {
                  // Extract RGB values from rgba string
                  const match = fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (match) {
                    const r = parseInt(match[1]).toString(16).padStart(2, '0');
                    const g = parseInt(match[2]).toString(16).padStart(2, '0');
                    const b = parseInt(match[3]).toString(16).padStart(2, '0');
                    return `#${r}${g}${b}`;
                  }
                  return '#2962FF';
                })()}
                onChange={(e) => {
                  // Get current alpha from fillColor
                  const alphaMatch = fillColor.match(/[\d.]+(?=\))/);
                  const alpha = alphaMatch ? alphaMatch[0] : '0.1';
                  
                  // Convert hex to RGB
                  const rgb = e.target.value.match(/[0-9A-F]{2}/gi)?.map(x => parseInt(x, 16));
                  if (rgb) {
                    setFillColor(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`);
                  }
                }}
                className="flex-1 h-10 rounded cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={(() => {
                  const alphaMatch = fillColor.match(/[\d.]+(?=\))/);
                  return Number(alphaMatch ? alphaMatch[0] : '0.1') * 100;
                })()}
                onChange={(e) => {
                  const alpha = Number(e.target.value) / 100;
                  const colorMatch = fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (colorMatch) {
                    setFillColor(`rgba(${colorMatch[1]}, ${colorMatch[2]}, ${colorMatch[3]}, ${alpha.toFixed(2)})`);
                  }
                }}
                className="flex-1"
                title="Şeffaflık"
              />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Önizleme: <span style={{ 
                display: 'inline-block', 
                width: '40px', 
                height: '20px', 
                backgroundColor: fillColor,
                border: '1px solid #666',
                verticalAlign: 'middle',
                marginLeft: '4px'
              }}></span> {fillColor}
            </div>
          </div>
        )}

        {/* Extension options (for lines) */}
        {isLine && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Uzatma Seçenekleri</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={extendLeft}
                  onChange={(e) => setExtendLeft(e.target.checked)}
                  className="w-4 h-4"
                />
                Sola doğru uzat
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={extendRight}
                  onChange={(e) => setExtendRight(e.target.checked)}
                  className="w-4 h-4"
                />
                Sağa doğru uzat
              </label>
            </div>
          </div>
        )}

        {/* Text input (for text annotations) */}
        {isText && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Metin</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Metin girin..."
            />
          </div>
        )}

        {/* Coordinates */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Koordinatlar</label>
          <div className="space-y-2 text-sm text-gray-400">
            {drawing.points.map((point, index) => (
              <div key={index} className="flex gap-2">
                <span className="w-16">Nokta {index + 1}:</span>
                <span>Fiyat: {point.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Kaydet
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

