"use client";

import React from 'react';
import { Loader2, MessageSquareText } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import UserInfoPanel from './UserInfoPanel';
import NotificationPromptUI from './NotificationPromptUI';
import SidebarContent from '../../Components/SidebarContent'; 
import { User, Chat } from '../../types'; 

interface DashboardSidebarProps {
  user: User | null;
  onLogout: () => void;
  onRequestNotificationPermission: () => void;
  notificationPermission: NotificationPermission;
  showNotificationPrompt: boolean;
  onCloseNotificationPrompt: () => void;
  copiedLink: boolean;
  onCopyLink: () => void;
  isLoadingChats: boolean;
  initialChatsFetchAttempted: boolean;
  chats: Chat[];
  selectedChatId: string | undefined;
  onChatSelect: (chat: Chat) => void;
  userError?: string | null;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  user,
  onLogout,
  onRequestNotificationPermission,
  notificationPermission,
  showNotificationPrompt,
  onCloseNotificationPrompt,
  copiedLink,
  onCopyLink,
  isLoadingChats,
  initialChatsFetchAttempted,
  chats,
  selectedChatId,
  onChatSelect,
  userError,
}) => {
  return (
    <aside className="flex flex-col w-full md:w-80 lg:w-96 bg-gray-50 border-r border-gray-200 h-full md:h-auto md:overflow-y-auto">
      <div className="hidden md:block">
        <DashboardHeader
          onLogout={onLogout}
          onRequestNotificationPermission={onRequestNotificationPermission}
          notificationPermission={notificationPermission}
          username={user?.username}
        />
      </div>
      <div className="md:hidden">
        <DashboardHeader
          onLogout={onLogout}
          onRequestNotificationPermission={onRequestNotificationPermission}
          notificationPermission={notificationPermission}
          isMobile
          username={user?.username}
        />
      </div>

      {user && (
        <UserInfoPanel
          chatLink={user.chatLink}
          username={user.username}
          onCopyLink={onCopyLink}
          copiedLink={copiedLink}
        />
      )}

      <NotificationPromptUI
        showPrompt={showNotificationPrompt && notificationPermission === 'default' && !!user?.username}
        onClosePrompt={onCloseNotificationPrompt}
        onRequestPermission={onRequestNotificationPermission}
        username={user?.username}
      />

      {userError && (userError.includes('reconnect') || userError.includes('lost')) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-3 m-2 text-xs rounded-md flex items-center">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span>{userError}</span>
        </div>
      )}


      <div className="flex-grow overflow-y-auto p-2">
        {isLoadingChats ? (
          <div className="flex justify-center items-center h-full text-teal-500 p-4">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading your conversations...</span>
          </div>
        ) : initialChatsFetchAttempted && chats.length === 0 ? (
          <div className="text-center text-gray-500 py-10 px-4">
            <MessageSquareText size={48} className="mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold text-lg text-gray-600 mb-1">No Chats Found</h3>
            <p className="text-sm">Please share your link to start receiving chats.</p>
          </div>
        ) : (
          <SidebarContent 
            chats={chats} 
            selectedChatId={selectedChatId} 
            onChatSelect={onChatSelect} 
          />
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;