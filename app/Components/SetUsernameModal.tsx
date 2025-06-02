// app/Components/SetUsernameModal.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface SetUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsernameSet: (newUsername: string) => void;
  email: string | null;
  currentUsername: string | null | undefined;
  token: string | null;
}

interface UsernameCheckResponse {
  success: boolean;
  exists: boolean;
  message?: string;
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
  const [isLoading, setIsLoading] = useState(false); // For submission
  const [error, setError] = useState<string | null>(null); // For submission error
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For debounced username availability check
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameCheckMessage, setUsernameCheckMessage] = useState<string | null>(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentUsername) {
      setUsername(currentUsername);
      // If it's the user's current username, assume it's "available" to them for re-submission
      setIsUsernameAvailable(true);
      setLastCheckedUsername(currentUsername);
    } else {
      setUsername('');
      setIsUsernameAvailable(null);
      setLastCheckedUsername(null);
    }
    setError(null);
    setSuccessMessage(null);
    setUsernameCheckMessage(null);
  }, [isOpen, currentUsername, email]);


  // Debounced username check
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Reset availability status if username changes
    if (username !== lastCheckedUsername) {
        setIsUsernameAvailable(null);
        setUsernameCheckMessage(null);
    }

    if (username.trim() === '') {
      setUsernameCheckMessage(null);
      setIsUsernameAvailable(null);
      return;
    }

    if (username === currentUsername) {
        setUsernameCheckMessage("This is your current username.");
        setIsUsernameAvailable(true); // User can re-submit their own username
        setLastCheckedUsername(username);
        return;
    }
    
    // Basic client-side validation before hitting API
    if (username.length < 3 || username.length > 20) {
      setUsernameCheckMessage("Username must be 3-20 characters.");
      setIsUsernameAvailable(false);
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setUsernameCheckMessage("Letters and numbers only.");
      setIsUsernameAvailable(false);
      return;
    }


    debounceTimeoutRef.current = setTimeout(async () => {
      setIsCheckingUsername(true);
      setUsernameCheckMessage("Checking availability...");
      setIsUsernameAvailable(null);

      try {
        const response = await fetch(`http://localhost:8080/api/auth/check-username/${encodeURIComponent(username)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if your check-username endpoint requires it
            // 'Authorization': `Bearer ${token}`,
          },
        });
        const data: UsernameCheckResponse = await response.json();

        if (response.ok && data.success) {
          if (data.exists) {
            setUsernameCheckMessage("Username is already taken.");
            setIsUsernameAvailable(false);
          } else {
            setUsernameCheckMessage("Username is available!");
            setIsUsernameAvailable(true);
            setLastCheckedUsername(username);
          }
        } else {
          setUsernameCheckMessage(data.message || "Could not verify username.");
          setIsUsernameAvailable(false);
        }
      } catch (err) {
        console.error("Username check error:", err);
        setUsernameCheckMessage("Error checking username. Try again.");
        setIsUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 750); // 750ms debounce time

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [username, currentUsername, token]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError("Username can only contain letters and numbers.");
      return;
    }

    // Check against the debounced validation result
    if (username !== lastCheckedUsername || isUsernameAvailable !== true) {
      // If username changed after last check, or if it was marked unavailable
      if (username !== currentUsername) { // Allow submitting if it's their current username, even if check is stale
         setError(usernameCheckMessage || "Please ensure username is validated and available.");
         return;
      }
    }


    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/set-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email, username: username }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to set username. It might already be taken or invalid.');
      } else {
        setSuccessMessage(data.message ||'Username set successfully!');
        onUsernameSet(username);
        setTimeout(() => {
          // onClose(); // Modal will be closed by parent component logic or after redirect
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
          <div>
            <div className="relative">
              <input
                id="username_set"
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`peer w-full border ${error || (isUsernameAvailable === false && username.length > 0 && !isCheckingUsername) ? 'border-red-500' : (isUsernameAvailable === true && !isCheckingUsername ? 'border-green-500' : 'border-gray-300')} 
                           px-3 py-3 rounded-lg placeholder-transparent
                           focus:outline-none focus:ring-2 
                           ${error || (isUsernameAvailable === false && username.length > 0 && !isCheckingUsername) ? 'focus:ring-red-500 focus:border-red-500' : (isUsernameAvailable === true && !isCheckingUsername ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-teal-500 focus:border-teal-500')} 
                           transition-colors`}
                placeholder="Choose your username"
                disabled={isLoading}
                maxLength={20}
                minLength={3}
                autoComplete="off"
              />
              <label
                htmlFor="username_set"
                className={`absolute left-3 -top-2.5 bg-white px-1 text-xs 
                           ${error || (isUsernameAvailable === false && username.length > 0 && !isCheckingUsername) ? 'text-red-600' : (isUsernameAvailable === true && !isCheckingUsername ? 'text-green-600' : 'text-gray-500')} 
                           transition-all
                           peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                           peer-focus:-top-2.5 peer-focus:text-xs 
                           ${error || (isUsernameAvailable === false && username.length > 0 && !isCheckingUsername) ? 'peer-focus:text-red-600' : (isUsernameAvailable === true && !isCheckingUsername ? 'peer-focus:text-green-600' : 'peer-focus:text-teal-600')}`}
              >
                Username
              </label>
            </div>
            <div className="flex items-center justify-between min-h-[20px] mt-1.5">
                <p className={`text-xs ${
                    isCheckingUsername ? 'text-gray-500' :
                    isUsernameAvailable === true ? 'text-green-600' :
                    isUsernameAvailable === false && username.length > 0 ? 'text-red-600' :
                    'text-gray-500'
                }`}>
                    {isCheckingUsername && <Loader2 size={14} className="inline animate-spin mr-1" />}
                    {usernameCheckMessage || "3-20 characters, letters & numbers only."}
                </p>
            </div>
          </div>


          {error && ( // For submission errors
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
              <AlertTriangle size={18} className="flex-shrink-0"/>
              <span>{error}</span>
            </div>
          )}
          {successMessage && ( // For submission success
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
              disabled={isLoading || isCheckingUsername || !!successMessage || isUsernameAvailable !== true}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors text-sm disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
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