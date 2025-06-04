// app/dashboard/components/UserInfoPanel.tsx
"use client";

import React from 'react';
import { Link2Icon, Copy } from 'lucide-react';

interface UserInfoPanelProps {
  chatLink: string | undefined;
  username: string | null | undefined;
  onCopyLink: () => void;
  copiedLink: boolean;
}

const UserInfoPanel: React.FC<UserInfoPanelProps> = ({ chatLink, username, onCopyLink, copiedLink }) => {
  const displayLink = chatLink || (username ? `${window.location.origin}/chat/${username}` : "Set username to get link");

  return (
    <div className="p-4 border-b border-gray-200 bg-teal-50">
      <h3 className="text-sm font-semibold text-teal-700 mb-1.5 flex items-center">
        <Link2Icon size={16} className="mr-1.5 text-teal-600" />
        Your Anonymous Link:
      </h3>
      <div className="bg-white p-2.5 rounded-lg text-xs text-teal-800 break-all mb-2.5 shadow-sm border border-teal-200 min-h-[3.5em] flex items-center">
        {displayLink}
      </div>
      <button
        onClick={onCopyLink}
        disabled={!chatLink || copiedLink}
        className={`w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
          !chatLink
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : copiedLink
            ? 'bg-green-500 text-white border-green-600'
            : 'bg-teal-500 text-white border-teal-600 hover:bg-teal-600 focus:ring-2 focus:ring-teal-400'
        }`}
      >
        <Copy size={16} />
        <span>{copiedLink ? 'Link Copied!' : 'Copy My Link'}</span>
      </button>
      <p className="text-xs text-teal-600 mt-2.5">
        Share this link anywhere to start receiving anonymous messages!
      </p>
    </div>
  );
};

export default UserInfoPanel;