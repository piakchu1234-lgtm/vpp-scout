/**
 * COLLAPSIBLE SIDEBAR WRAPPER
 *
 * Landchecker-style collapsible panel with:
 * - Smooth 300ms slide transitions
 * - Floating chevron toggle (always visible)
 * - Mapbox canvas auto-resize
 * - Right-side placement
 *
 * Wraps any sidebar content (PropertyInspector, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  side?: 'left' | 'right';
  width?: string;
}

export default function CollapsibleSidebar({
  children,
  defaultOpen = true,
  onToggle,
  side = 'right',
  width = 'w-96',
}: CollapsibleSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Handle toggle
  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);

    // Use Mapbox camera padding instead of resize (eliminates jank)
    if (typeof window !== 'undefined' && (window as any).mapboxMap) {
      const map = (window as any).mapboxMap;

      // Smooth camera transition with padding
      map.easeTo({
        padding: {
          right: newState ? (side === 'right' ? 384 : 0) : 0,  // 384px = w-96
          left: newState ? (side === 'left' ? 384 : 0) : 0,
          top: 0,
          bottom: 0,
        },
        duration: 300,  // Match CSS animation
        easing: (t: number) => t * (2 - t),  // easeInOut curve
      });
    }
  };

  // Keyboard support (WCAG 2.1.1)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <>
      {/* Collapsible Sidebar Panel */}
      <div
        id="property-sidebar"
        role="complementary"
        aria-label="Property information panel"
        className={`
          fixed ${side === 'right' ? 'right-0' : 'left-0'} top-0 h-full ${width}
          bg-[#0A0A0A] dark:bg-[#0A0A0A] border-${side === 'right' ? 'l' : 'r'} border-zinc-800
          transition-transform duration-300 ease-in-out z-40
          overflow-y-auto
          ${isOpen ? 'translate-x-0' : (side === 'right' ? 'translate-x-full' : '-translate-x-full')}
        `}
      >
        {children}
      </div>

      {/* Floating Chevron Toggle - OUTSIDE SIDEBAR EDGE */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={isOpen ? 'Close property sidebar' : 'Open property sidebar'}
        aria-expanded={isOpen}
        aria-controls="property-sidebar"
        className={`
          absolute top-1/2 -translate-y-1/2 z-50
          w-8 h-16 bg-zinc-900
          border-y border-zinc-700
          ${side === 'right'
            ? 'border-l rounded-l-md -left-8'
            : 'border-r rounded-r-md -right-8'
          }
          flex items-center justify-center
          hover:bg-zinc-800 hover:border-[#E9E778]
          active:scale-95
          transition-all duration-200 shadow-lg
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9E778] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]
          ${side === 'right'
            ? (isOpen ? 'right-0' : '-right-0')
            : (isOpen ? 'left-0' : '-left-0')
          }
        `}
        style={{
          position: 'absolute',
          top: '50%',
        }}
      >
        <span className="sr-only">
          {isOpen ? 'Close' : 'Open'} sidebar
        </span>
        {side === 'right' ? (
          isOpen ? (
            <ChevronRight className="w-5 h-5 text-zinc-400" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-zinc-400" aria-hidden="true" />
          )
        ) : (
          isOpen ? (
            <ChevronLeft className="w-5 h-5 text-zinc-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-zinc-400" aria-hidden="true" />
          )
        )}
      </button>
    </>
  );
}
