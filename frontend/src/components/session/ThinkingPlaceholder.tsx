import { useState, useEffect } from 'react';

export function ThinkingPlaceholder() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev === '...' ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-sm text-text-secondary">
        Thinking{dots}
      </span>
    </div>
  );
}

export function InlineWorkingIndicator() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev === '...' ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center px-4 py-2 bg-surface-secondary/30 rounded">
      <span className="text-xs text-text-secondary italic">
        Thinking{dots}
      </span>
    </div>
  );
}
