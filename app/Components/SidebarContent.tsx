"use client";

import React from 'react';
import { UserCircle, MessageSquareText } from 'lucide-react'; // Added MessageSquareText for empty state
import { Chat } from '../types'; // Import the Chat type

interface SidebarContentProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onCloseSidebar?: () => void; // For closing sidebar on mobile after selection
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  chats,
  selectedChat,
  onChatSelect,
  onCloseSidebar,
}) => {
  const handleSelect = (chat: Chat) => {
    onChatSelect(chat);
    if (onCloseSidebar) {
      onCloseSidebar(); // Close sidebar on mobile after selection
    }
  };

  return (
    // The main header "Conversations" and the close "X" button are now in app/chat/page.tsx
    // This component focuses solely on the list of chats.
    <div className="space-y-2 pt-2"> {/* Added small top padding */}
      {chats.length > 0 ? (
        chats.map(chat => (
          <div
            key={chat.id}
            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-150 ease-in-out
                        ${selectedChat?.id === chat.id
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-700'
                        }`}
            onClick={() => handleSelect(chat)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleSelect(chat)}
            aria-current={selectedChat?.id === chat.id ? "page" : undefined}
          >
            {/* Avatar or Placeholder */}
            <div className="flex-shrink-0 mr-3">
              {chat.avatar ? (
                <img src={chat.avatar} alt={chat.sender} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <UserCircle
                  size={40}
                  className={selectedChat?.id === chat.id ? 'text-teal-100' : 'text-gray-400'}
                />
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-grow overflow-hidden">
              <div className="flex justify-between items-center">
                <h4 className={`font-semibold text-sm truncate ${selectedChat?.id === chat.id ? 'text-white' : 'text-gray-800'}`}>
                  {chat.sender}
                </h4>
                {/* Optional: Unread count or timestamp */}
                {/* <span className={`text-xs ${selectedChat?.id === chat.id ? 'text-teal-200' : 'text-gray-400'}`}>10:30 AM</span> */}
              </div>
              <p className={`text-xs truncate ${selectedChat?.id === chat.id ? 'text-teal-100' : 'text-gray-500'}`}>
                {chat.messagePreview}
              </p>
            </div>
            {/* Optional: Unread messages badge */}
            {/* {chat.unreadCount && chat.unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {chat.unreadCount}
              </span>
            )} */}
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500 py-12 px-4">
          <MessageSquareText size={48} className="mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-600 mb-1">No Chats Yet</h3>
          <p className="text-sm">When you have conversations, they'll appear here.</p>
          {/* You could add a button/link here to guide users if applicable */}
          {/* e.g., <button className="mt-4 bg-teal-500 ...">Start a new chat</button> */}
        </div>
      )}
    </div>
  );
};

export default SidebarContent;