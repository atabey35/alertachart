/**
 * Text Edit Modal for Drawing Tools
 * Used for Anchored Text, Note, and other text-based drawings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Drawing } from '@/types/drawing';

interface TextEditModalProps {
    drawing: Drawing;
    onSave: (text: string) => void;
    onClose: () => void;
}

export default function TextEditModal({ drawing, onSave, onClose }: TextEditModalProps) {
    const [text, setText] = useState('');
    const [fontSize, setFontSize] = useState(14);

    useEffect(() => {
        // Load existing text if available
        if ('text' in drawing && typeof drawing.text === 'string') {
            setText(drawing.text);
        }
        if ('fontSize' in drawing && typeof drawing.fontSize === 'number') {
            setFontSize(drawing.fontSize);
        }
    }, [drawing]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && drawing.type !== 'note') {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter' && e.ctrlKey && drawing.type === 'note') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [text, drawing.type, onClose]);

    const handleSave = () => {
        if (text.trim()) {
            onSave(text);
            onClose();
        }
    };

    const isNote = drawing.type === 'note';

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-[#1e222d] rounded-lg p-6 w-full max-w-md shadow-xl border border-[#2a2e39]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">
                        {isNote ? 'Edit Note' : 'Edit Text'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Text Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            {isNote ? 'Note Content' : 'Text'}
                        </label>
                        {isNote ? (
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter note content..."
                                className="w-full bg-[#131722] text-white rounded px-3 py-2 border border-[#2a2e39] focus:outline-none focus:border-blue-500 min-h-[120px] font-mono text-sm"
                                autoFocus
                            />
                        ) : (
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter text..."
                                className="w-full bg-[#131722] text-white rounded px-3 py-2 border border-[#2a2e39] focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Font Size */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Font Size: {fontSize}px
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="32"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Preview */}
                    <div className="bg-[#131722] rounded p-3 border border-[#2a2e39]">
                        <p className="text-gray-400 text-xs mb-2">Preview:</p>
                        <p
                            className="text-white whitespace-pre-wrap"
                            style={{ fontSize: `${fontSize}px` }}
                        >
                            {text || '(Preview will appear here)'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-[#2a2e39] text-white rounded hover:bg-[#363a45] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save
                    </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-xs text-gray-500 text-center mt-3">
                    Press Enter to save, Esc to cancel
                </p>
            </div>
        </div>
    );
}
