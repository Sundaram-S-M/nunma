import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean, onClose: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const modalNode = modalRef.current;
    if (!modalNode) return;

    const focusableElements = modalNode.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Auto focus first element
    if (firstElement) {
      firstElement.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const isTabPressed = e.key === 'Tab';

      if (!isTabPressed) {
        return;
      }

      if (e.shiftKey) { // shift + tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }

    modalNode.addEventListener('keydown', handleKeyDown);

    return () => {
      modalNode.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, onClose]);

  return modalRef;
}
