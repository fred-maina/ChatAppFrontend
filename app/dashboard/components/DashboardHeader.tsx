// app/dashboard/components/DashboardHeader.tsx
"use client";

import React from 'react';
import { MessageSquareText, LogOut, BellDot } from 'lucide-react';

interface DashboardHeaderProps {
  onLogout: () => void;
  onRequestNotificationPermission: () => void;
  notificationPermission: NotificationPermission;
  isMobile?: boolean; // To differentiate styling or layout if needed
  username: string | null | undefined;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onLogout,
  onRequestNotificationPermission,
  notificationPermission,
  isMobile = false,
  username,
}) => {
  const title = isMobile ? "AnonMsg Inbox" : (username ? `${username}'s Chats` : "My Chats");

  return (
    <div className={`p-4 md:p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-gray-50 z-10`}>
      <div className="flex items-center space-x-2">
        <MessageSquareText className={`h-7 w-7 md:h-8 md:w-8 ${isMobile ? 'text-teal-600' : 'text-teal-500'}`} />
        <h2 className={`font-bold text-gray-800 ${isMobile ? 'text-lg' : 'text-xl'}`}>{title}</h2>
      </div>
      <div className="flex items-center space-x-1">
        <button
          onClick={onRequestNotificationPermission}
          title={
            notificationPermission === 'granted'
              ? 'Notifications Enabled'
              : notificationPermission === 'denied'
              ? 'Notifications Blocked - Click to see instructions' // Or similar
              : 'Enable Notifications'
          }
          className={`p-2 rounded-lg transition-colors ${
            notificationPermission === 'granted'
              ? 'text-green-500 hover:bg-green-50'
              : notificationPermission === 'denied'
              ? 'text-red-500 hover:bg-red-50' // Removed cursor-not-allowed to allow clicking for instructions
              : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
          }`}
          // Consider not disabling if permission is denied, to allow user to click and get instructions
          // disabled={notificationPermission === 'denied'}
        >
          <BellDot size={20} />
        </button>
        <button
          onClick={onLogout}
          title="Logout"
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;