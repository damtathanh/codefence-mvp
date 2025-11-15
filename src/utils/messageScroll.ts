import { RefObject, useCallback, MutableRefObject } from 'react';

/**
 * Scrolls a container to the bottom
 * @param containerRef - Reference to the scrollable container
 * @param behavior - Scroll behavior ('auto' or 'smooth')
 */
export const scrollToBottom = (
  containerRef: RefObject<HTMLElement>,
  behavior: ScrollBehavior = 'auto'
): void => {
  const container = containerRef.current;
  if (!container) return;
  container.scrollTo({ top: container.scrollHeight, behavior });
};

/**
 * Hook for auto-scrolling message containers
 * Returns scrollToBottom function and handleScroll handler
 * @param containerRef - Reference to the scrollable container
 * @param isUserScrollingUpRef - Mutable ref to track scrolling state
 * @param threshold - Distance from bottom to consider "near bottom" (default: 80px)
 */
export const useMessageScroll = (
  containerRef: RefObject<HTMLElement>,
  isUserScrollingUpRef: MutableRefObject<boolean>,
  threshold: number = 80
) => {
  const scrollToBottomCallback = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      scrollToBottom(containerRef, behavior);
    },
    [containerRef]
  );

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isUserScrollingUpRef.current = !isNearBottom;
  }, [containerRef, isUserScrollingUpRef, threshold]);

  return { scrollToBottom: scrollToBottomCallback, handleScroll };
};

