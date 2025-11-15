import { useEffect, RefObject, MutableRefObject } from 'react';

/**
 * Hook that scrolls to bottom when all images in a container are loaded
 * Only scrolls if user is not manually scrolling up
 * @param containerRef - Reference to the container containing images
 * @param isUserScrollingUpRef - Mutable ref tracking if user is scrolling up
 * @param scrollToBottom - Function to scroll to bottom
 * @param dependencies - Dependencies that trigger re-checking (typically messages array)
 */
export const useImageLoadScroll = (
  containerRef: RefObject<HTMLElement>,
  isUserScrollingUpRef: MutableRefObject<boolean>,
  scrollToBottom: (behavior?: ScrollBehavior) => void,
  dependencies: unknown[]
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const images = container.querySelectorAll<HTMLImageElement>('.chat-image');
    if (images.length === 0) return;

    let loaded = 0;
    const maybeScroll = () => {
      loaded += 1;
      if (loaded === images.length && !isUserScrollingUpRef.current) {
        scrollToBottom('smooth');
      }
    };

    const cleanups: Array<() => void> = [];
    images.forEach((img) => {
      if (img.complete) {
        maybeScroll();
      } else {
        const handleLoad = () => {
          maybeScroll();
          img.removeEventListener('load', handleLoad);
        };
        img.addEventListener('load', handleLoad);
        cleanups.push(() => img.removeEventListener('load', handleLoad));
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, dependencies);
};

