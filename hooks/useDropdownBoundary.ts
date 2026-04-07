import { useState, useEffect, RefObject } from 'react';

interface BoundaryStyle {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  transformOrigin?: string;
}

export function useDropdownBoundary(
  triggerRef: RefObject<HTMLElement>,
  dropdownRef: RefObject<HTMLElement>,
  isOpen: boolean,
  defaultPos: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right'
) {
  const [styles, setStyles] = useState<BoundaryStyle>({});

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const gap = 8;
    let newStyles: BoundaryStyle = {};

    // Bottom check
    const wouldOverflowBottom = triggerRect.bottom + gap + dropdownRect.height > viewportHeight;
    const roomAbove = triggerRect.top > dropdownRect.height + gap;

    if (wouldOverflowBottom && roomAbove) {
      // Flip to top
      newStyles.bottom = 'calc(100% + 8px)';
      newStyles.top = 'auto';
      newStyles.transformOrigin = 'bottom center';
    } else {
      // Keep bottom
      newStyles.top = 'calc(100% + 8px)';
      newStyles.bottom = 'auto';
      newStyles.transformOrigin = 'top center';
    }

    // Right check
    const wouldOverflowRight = triggerRect.left + dropdownRect.width > viewportWidth;
    const wouldOverflowLeft = triggerRect.right - dropdownRect.width < 0;

    if (defaultPos.includes('right')) {
        if(wouldOverflowLeft) {
            newStyles.left = 0;
            newStyles.right = 'auto';
        } else {
            newStyles.right = 0;
            newStyles.left = 'auto';
        }
    } else {
        if(wouldOverflowRight) {
            newStyles.right = 0;
            newStyles.left = 'auto';
        } else {
            newStyles.left = 0;
            newStyles.right = 'auto';
        }
    }


    setStyles(newStyles);
  }, [isOpen, triggerRef, dropdownRef, defaultPos]);

  return styles;
}
