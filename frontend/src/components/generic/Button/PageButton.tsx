import React from "react";
import { useEffect } from "react";

interface PageButtonProps {
  onClick: () => void;
  action: string;
  disabled?: boolean;
  currentPage: number;
}

const PageButton: React.FC<PageButtonProps> = ({ onClick, action, disabled, currentPage }) => {
  useEffect(() => {
    // Scroll to the top when currentPage changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]); // Dependency ensures it runs on every page change
  return (
    <button
      onClick={onClick}
      disabled={disabled}
    >
      {`${action} page`}
    </button>
  );
};

export default PageButton;