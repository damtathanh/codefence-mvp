import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const ScrollToSectionHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Nếu có hash (ví dụ /demo/login#contact)
    if (location.hash) {
      const sectionId = location.hash.substring(1);

      // Nếu không ở trang Home → điều hướng về /#section
      if (location.pathname !== "/") {
        navigate(`/#${sectionId}`);
        return;
      }

      // Nếu đã ở Home → cuộn tới section tương ứng
      const el = document.getElementById(sectionId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [location, navigate]);

  return null;
};
