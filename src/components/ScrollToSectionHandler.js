import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
export const ScrollToSectionHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (location.hash) {
            const sectionId = location.hash.substring(1);
            // Nếu không ở trang Home → chuyển về Home rồi scroll
            if (location.pathname !== "/") {
                navigate(`/#${sectionId}`);
                return;
            }
            let tries = 0;
            const maxTries = 30;
            const tryScroll = () => {
                const el = document.getElementById(sectionId);
                const header = document.querySelector("header");
                // Wait for DOM & header to render
                if (!el || !header) {
                    if (tries < maxTries) {
                        tries++;
                        setTimeout(tryScroll, 50);
                    }
                    return;
                }
                const headerHeight = header.offsetHeight;
                // Get the element's absolute position using getBoundingClientRect
                // This gives us the exact position of the section element's top edge
                const rect = el.getBoundingClientRect();
                const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                const absoluteTop = rect.top + scrollY;
                // Calculate scroll position: absolute top minus header height
                // This positions the top edge of the section (where padding-top area begins)
                // directly below the fixed navbar, so the full padding-top is visible
                const scrollPosition = Math.max(0, absoluteTop - headerHeight);
                window.scrollTo({
                    top: scrollPosition,
                    behavior: "smooth",
                });
            };
            // Wait a bit longer for page render after navigation
            setTimeout(() => {
                tryScroll();
            }, 300);
        }
    }, [location, navigate]);
    return null;
};
