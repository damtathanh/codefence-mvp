import { useCallback } from 'react';
/**
 * Scrolls a container to the bottom
 * @param containerRef - Reference to the scrollable container
 * @param behavior - Scroll behavior ('auto' or 'smooth')
 */
export const scrollToBottom = (containerRef, behavior = 'auto') => {
    const container = containerRef.current;
    if (!container)
        return;
    container.scrollTo({ top: container.scrollHeight, behavior });
};
/**
 * Hook for auto-scrolling message containers
 * Returns scrollToBottom function and handleScroll handler
 * @param containerRef - Reference to the scrollable container
 * @param isUserScrollingUpRef - Mutable ref to track scrolling state
 * @param threshold - Distance from bottom to consider "near bottom" (default: 80px)
 */
export const useMessageScroll = (containerRef, isUserScrollingUpRef, threshold = 80) => {
    const scrollToBottomCallback = useCallback((behavior = 'auto') => {
        scrollToBottom(containerRef, behavior);
    }, [containerRef]);
    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        isUserScrollingUpRef.current = !isNearBottom;
    }, [containerRef, isUserScrollingUpRef, threshold]);
    return { scrollToBottom: scrollToBottomCallback, handleScroll };
};
