'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// ReactQuill'i dynamic import ile yükle
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface ReactQuillWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  modules?: any;
  formats?: string[];
  theme?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function ReactQuillWrapper(props: ReactQuillWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const quillRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    // React 19'da findDOMNode yok, global polyfill ekle
    if (typeof window !== 'undefined') {
      // ReactDOM'u yükle ve findDOMNode'u polyfill et
      import('react-dom').then((ReactDOM) => {
        const ReactDOMAny = ReactDOM as any;
        if (!ReactDOMAny.findDOMNode) {
          const findDOMNodePolyfill = function(node: any) {
            if (!node) return null;
            
            // Eğer zaten bir DOM node ise
            if (node && typeof node === 'object' && 'nodeType' in node) {
              return node;
            }
            
            // Eğer bir ref ise (ReactQuill'in editingArea ref'i)
            if (node && typeof node === 'object' && 'current' in node) {
              const current = node.current;
              if (current) {
                // DOM node ise direkt dön
                if (typeof current === 'object' && 'nodeType' in current) {
                  return current;
                }
                // React element ise, container'dan DOM node'u bul
                if (containerRef.current) {
                  const editingArea = containerRef.current.querySelector('.ql-editor') || 
                                    containerRef.current.querySelector('div[contenteditable]') ||
                                    containerRef.current.querySelector('div') ||
                                    containerRef.current;
                  return editingArea;
                }
              }
            }
            
            // Component instance için - container ref'ini kullan
            if (containerRef.current) {
              return containerRef.current.querySelector('.ql-editor') || 
                     containerRef.current.querySelector('div[contenteditable]') ||
                     containerRef.current.querySelector('div') ||
                     containerRef.current;
            }
            
            return null;
          };
          
          ReactDOMAny.findDOMNode = findDOMNodePolyfill;
          
          // react_dom_1.default.findDOMNode için de polyfill (ReactQuill'in kullandığı format)
          if (ReactDOMAny.default) {
            ReactDOMAny.default.findDOMNode = findDOMNodePolyfill;
          }
          
          // Module.exports formatı için de (CommonJS)
          if (typeof module !== 'undefined' && module.exports) {
            const reactDomModule = require('react-dom');
            if (reactDomModule && reactDomModule.default) {
              reactDomModule.default.findDOMNode = findDOMNodePolyfill;
            }
            if (reactDomModule && !reactDomModule.findDOMNode) {
              reactDomModule.findDOMNode = findDOMNodePolyfill;
            }
          }
        }
      }).catch(() => {
        // Hata durumunda sessizce devam et
      });
    }
  }, []);

  if (!isClient || typeof window === 'undefined') {
    return <div ref={containerRef} className={props.className} style={props.style} />;
  }

  return (
    <div ref={containerRef}>
      <ReactQuill
        {...props}
        ref={quillRef}
      />
    </div>
  );
}
