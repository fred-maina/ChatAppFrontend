// app/Components/SetUsernameModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react'; // Using existing icons

interface SetUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsernameSet: (newUsername: string) => void; // Callback after successful username setting
  email: string | null; // User's email to associate with the username
  currentUsername: string | null | undefined; // Pass current username if available
  token: string | null; // Auth token for API call
}

const SetUsernameModal: React.FC<SetUsernameModalProps> = ({
  isOpen,
  onClose,
  onUsernameSet,
  email,
  currentUsername,
  token
}) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUsername) {
      setUsername(currentUsername);
    } else {
      setUsername(''); // Reset if modal is reopened for a new attempt or different user context
    }
    setError(null); // Reset error on open/close or prop change
    setSuccessMessage(null);
  }, [isOpen, currentUsername, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    // Basic validation (you can expand this)
    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.");
      return;
    }
    // UPDATED REGEX and ERROR MESSAGE
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError("Username can only contain letters and numbers.");
      return;
    }

    setIsLoading(true);

    try {
      // Assume your backend endpoint for setting/updating username is /api/user/set-username
      // You'll need to adjust the endpoint and payload as per your backend API
      const response = await fetch('http://localhost:8080/api/auth/set-username', { // REPLACE WITH YOUR ACTUAL API ENDPOINT
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send auth token
        },
        body: JSON.stringify({ email: email, username: username }), // Send email to identify user if needed, or rely on token
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to set username. It might already be taken or invalid.');
      } else {
        setSuccessMessage('Username set successfully!');
        onUsernameSet(username); // Call the callback
        setTimeout(() => {
          onClose(); // Close modal on success after a short delay
        }, 1500);
      }
    } catch (err) {
      console.error("Set username error:", err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-username-modal-title"
    >
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="flex items-start justify-between mb-5">
          <h3 id="set-username-modal-title" className="text-xl font-semibold text-gray-800">
            {currentUsername ? 'Update Your Username' : 'Set Your Username'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-1">
          Choose a unique username for your AnonMsg profile. This will be part of your shareable chat link.
        </p>
        {email && <p className="text-xs text-gray-500 mb-4">Logged in as: {email}</p>}


        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              id="username_set"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`peer w-full border ${error ? 'border-red-500' : 'border-gray-300'} px-3 py-3 rounded-lg placeholder-transparent
                         focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-teal-500 focus:border-teal-500'} transition-colors`}
              placeholder="Choose your username"
              disabled={isLoading}
              maxLength={20}
              minLength={3}
            />
            <label
              htmlFor="username_set"
              className={`absolute left-3 -top-2.5 bg-white px-1 text-xs ${error ? 'text-red-600' : 'text-gray-500'} transition-all
                         peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                         peer-focus:-top-2.5 peer-focus:text-xs ${error ? 'peer-focus:text-red-600' : 'peer-focus:text-teal-600'}`}
            >
              Username
            </label>
          </div>
          {/* UPDATED HELPER TEXT */}
          <p className="text-xs text-gray-500">
            Use 3-20 characters: letters and numbers only. E.g., `cooluser123`.
          </p>

          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
              <AlertTriangle size={18} className="flex-shrink-0"/>
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
             <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2.5 rounded-md border border-green-200">
              <CheckCircle size={18} className="flex-shrink-0"/>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors text-sm disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !!successMessage}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors text-sm disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (currentUsername ? 'Update Username' : 'Set Username')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetUsernameModal;