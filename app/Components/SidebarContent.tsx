// app/Components/SidebarContent.tsx
"use client";

import React from 'react';
import { UserCircle, MessageSquareText } from 'lucide-react'; 
import { Chat } from '../types'; 
import Image from 'next/image';

interface SidebarContentProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onCloseSidebar?: () => void; 
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
      onCloseSidebar(); 
    }
  };

  return (
    <div className="space-y-2 pt-2"> 
      {chats.length > 0 ? (
        chats.map(chat => (
          <div
            key={chat.id}
            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-150 ease-in-out relative
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
            <div className="flex-shrink-0 mr-3">
              {chat.avatar ? (
                <Image src={chat.avatar} alt={chat.sender} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <UserCircle
                  size={40}
                  className={selectedChat?.id === chat.id ? 'text-teal-100' : 'text-gray-400'}
                />
              )}
            </div>

            <div className="flex-grow overflow-hidden">
              <div className="flex justify-between items-center">
                <h4 className={`font-semibold text-sm truncate ${selectedChat?.id === chat.id ? 'text-white' : 'text-gray-800'}`}>
                  {chat.sender}
                </h4>
                {/* Display unread count if greater than 0 */}
                {chat.unreadCount && chat.unreadCount > 0 && (
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full
                                  ${selectedChat?.id === chat.id ? 'bg-white text-teal-600' : 'bg-teal-500 text-white'}`}>
                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${selectedChat?.id === chat.id ? 'text-teal-100' : 'text-gray-500'}`}>
                {chat.messagePreview}
              </p>
            </div>
            
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500 py-12 px-4">
          <MessageSquareText size={48} className="mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-600 mb-1">No Chats Yet</h3>
          <p className="text-sm">When you have conversations, they&apos;ll appear here.</p>
        </div>
      )}
    </div>
  );
};

export default SidebarContent;