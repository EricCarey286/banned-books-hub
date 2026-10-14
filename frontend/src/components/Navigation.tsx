import React from 'react';
import { Link } from 'react-router-dom';

interface NavigationProps {
  isAuthenticated: boolean;
  username?: string;
  onAdminClick: () => void;
  onLogout: () => void;
}

const ghostButton =
  'px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 transition-colors';

const primaryButton =
  'px-3 py-1.5 text-sm font-medium text-[#002251] bg-white rounded-full hover:bg-white/90 transition-colors';

export const Navigation: React.FC<NavigationProps> = ({
  isAuthenticated,
  username,
  onAdminClick,
  onLogout,
}) => {
  return (
    <nav className="flex justify-end items-center gap-3 px-4 py-3 border-b border-white/10">
      {isAuthenticated && username && (
        <span className="text-sm text-white/60 mr-auto">{username}</span>
      )}
      {isAuthenticated ? (
        <>
          <Link to="/admin" className={primaryButton}>
            Dashboard
          </Link>
          <button onClick={onLogout} className={ghostButton}>
            Logout
          </button>
        </>
      ) : (
        <button onClick={onAdminClick} className={primaryButton}>
          Admin
        </button>
      )}
    </nav>
  );
};
