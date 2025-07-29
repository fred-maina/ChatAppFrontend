"use client";

import React from 'react';
import { MessageSquareText, Loader2 } from 'lucide-react';

const DashboardHomePage = () => {
  return (
    <div className="hidden md:flex flex-col flex-grow items-center justify-center p-6 md:p-10 bg-white text-center h-full">
      <MessageSquareText className="w-20 h-20 text-teal-300 mb-5 animate-pulse" style={{ animationDuration: '3s' }} />
      <h2 className="text-2xl font-semibold text-gray-700 mb-1">Welcome to your Dashboard!</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        Select a conversation from the sidebar to view messages, or share your anonymous link to start receiving them.
      </p>
      <div className="mt-4 text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200 flex items-center">
        <Loader2 size={16} className="animate-spin mr-2" />
        <span>Chat server connection is active.</span>
      </div>
    </div>
  );
};

export default DashboardHomePage;