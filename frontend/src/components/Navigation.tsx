import React from 'react';

interface NavigationProps {
  isAuthenticated: boolean;
  username?: string;
  onAdminClick: () => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  isAuthenticated,
  username,
  onAdminClick,
  onLogout,
}) => {
  return (
    <nav className="flex justify-end items-center gap-4 p-4 border-b">
      {isAuthenticated && username && (
        <span className="text-sm text-gray-600">Welcome, {username}</span>
      )}
      {isAuthenticated ? (
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
        >
          Logout
        </button>
      ) : (
        <button
          onClick={onAdminClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          Admin
        </button>
      )}
    </nav>
  );
};
