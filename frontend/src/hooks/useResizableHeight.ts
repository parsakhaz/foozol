import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableHeightOptions {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  storageKey?: string;
}

export function useResizableHeight({
  defaultHeight,
  minHeight,
  maxHeight,
  storageKey,
}: UseResizableHeightOptions) {
  const getInitialHeight = () => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const h = parseInt(stored, 10);
        if (!isNaN(h) && h >= minHeight && h <= maxHeight) {
          return h;
        }
      }
    }
    return defaultHeight;
  };

  const [height, setHeight] = useState(getInitialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, height.toString());
    }
  }, [height, storageKey]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging up increases height (startY - currentY)
      const diff = startY.current - e.clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight.current + diff));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minHeight, maxHeight]);

  return { height, isResizing, startResize };
}
