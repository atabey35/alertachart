// React 19 findDOMNode polyfill for ReactQuill
// This file should be imported before ReactQuill is used

if (typeof window !== 'undefined') {
  import('react-dom').then((ReactDOM) => {
    const ReactDOMAny = ReactDOM as any;
    if (!ReactDOMAny.findDOMNode) {
      const findDOMNodePolyfill = function(node: any) {
        if (!node) return null;
        
        // Eğer zaten bir DOM node ise
        if (node && typeof node === 'object' && 'nodeType' in node) {
          return node;
        }
        
        // Eğer bir ref ise
        if (node && typeof node === 'object' && 'current' in node) {
          const current = node.current;
          if (current) {
            // DOM node ise direkt dön
            if (typeof current === 'object' && 'nodeType' in current) {
              return current;
            }
            // React element ise, parent container'dan DOM node'u bul
            // ReactQuill editingArea ref'i için
            if (typeof current === 'object') {
              // Try to find the DOM node from the ref's parent
              const parent = (current as any).parentElement || (current as any).parentNode;
              if (parent) {
                const editor = parent.querySelector?.('.ql-editor') || 
                              parent.querySelector?.('div[contenteditable]') ||
                              parent.querySelector?.('div') ||
                              parent;
                if (editor) return editor;
              }
            }
          }
        }
        
        return null;
      };
      
      ReactDOMAny.findDOMNode = findDOMNodePolyfill;
      
      // react_dom_1.default.findDOMNode için de polyfill (ReactQuill'in kullandığı format)
      if (ReactDOMAny.default) {
        ReactDOMAny.default.findDOMNode = findDOMNodePolyfill;
      }
    }
  }).catch(() => {
    // Ignore errors
  });
}

