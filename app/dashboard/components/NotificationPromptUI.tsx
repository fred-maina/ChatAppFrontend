// app/dashboard/components/NotificationPromptUI.tsx
"use client";

import React from 'react';
import { BellDot, X } from 'lucide-react';

interface NotificationPromptUIProps {
  showPrompt: boolean;
  onClosePrompt: () => void;
  onRequestPermission: () => void;
  username: string | null | undefined; // To personalize the message slightly
}

const NotificationPromptUI: React.FC<NotificationPromptUIProps> = ({
  showPrompt,
  onClosePrompt,
  onRequestPermission,
  username,
}) => {
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="bg-sky-50 border border-sky-300 text-sky-700 px-4 py-3 shadow-md m-2 rounded-lg text-sm relative">
      <button
        onClick={onClosePrompt}
        className="absolute top-1 right-1 p-1 text-sky-500 hover:bg-sky-100 rounded-full"
        aria-label="Close notification prompt"
      >
        <X size={18} />
      </button>
      <div className="flex items-start">
        <BellDot size={36} className="mr-3 text-sky-600 flex-shrink-0 mt-1" />
        <div>
          <p className="font-semibold">Get Notified of New Messages!</p>
          <p className="text-xs mb-2">
            Enable browser notifications {username ? `for ${username}'s account ` : ''}
            to receive instant alerts when someone sends you an anonymous message.
          </p>
          <button
            onClick={onRequestPermission}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium py-1.5 px-3 rounded-md transition-colors mr-2"
          >
            Enable Notifications
          </button>
          <button
            onClick={onClosePrompt}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-md transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPromptUI;