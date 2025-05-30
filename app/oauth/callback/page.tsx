"use client";

import { useEffect, Suspense,useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { LockKeyhole, MessageSquareText, AlertTriangle } from "lucide-react"; // Added AlertTriangle

// Component to handle the actual OAuth callback logic
function OAuthCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  // State to manage any errors displayed on this page before redirecting
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error"); // Error from Google (e.g., access_denied)
    const errorDescription = params.get("error_description"); // More details on the error

    if (error) {
      console.error("OAuth error from provider:", error, errorDescription);
      // Display error on this page temporarily before redirecting to /auth
      const message = `Google login failed: ${errorDescription || error}. Redirecting to login...`;
      setPageError(message);
      setTimeout(() => {
        router.push(`/auth?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`);
      }, 3000); // Delay redirect to allow user to see message
      return;
    }

    if (!code) {
      console.error("No OAuth code found in callback.");
       const message = "Authorization code missing. Redirecting to login...";
      setPageError(message);
      setTimeout(() => {
        router.push("/auth?error=oauth_failed&message=Authorization%20code%20missing.");
      }, 3000);
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback";

    // Clear any previous page error when starting fetch
    setPageError(null);

    fetch(`${backendUrl}/api/auth/oauth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirectUri: redirectUri,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "An unknown error occurred during OAuth processing with our server." }));
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && data.token) {
          localStorage.setItem("token", data.token); // Store the token

          if (data.user && data.user.username === null) {
            // Username is null, redirect to dashboard to set it via modal
            const emailForModal = data.user.email || '';
            router.push(`/dashboard?action=setUsername&email=${encodeURIComponent(emailForModal)}&tempToken=${encodeURIComponent(data.token)}`);
          } else if (data.user && data.user.username) {
            // Username exists, proceed to dashboard
            router.push("/dashboard");
          } else {
            // Handle cases where user object might be incomplete or username is missing but not strictly null
            console.warn("OAuth login successful, but user data is not as expected or username is missing:", data.user);
            if (data.user?.email && !data.user?.username) {
                 router.push(`/dashboard?action=setUsername&email=${encodeURIComponent(data.user.email)}&tempToken=${encodeURIComponent(data.token)}`);
            } else {
                // If critical info (like email for username setup) is missing.
                throw new Error(data.message || "Login successful, but user profile is incomplete.");
            }
          }
        } else {
          // Handle success=false from our API or other errors
          throw new Error(data.message || "Login failed after API processing. Please try again.");
        }
      })
      .catch((err) => {
        console.error("OAuth callback processing error:", err);
        const message = `Error processing login: ${err.message || "Could not complete sign-in."} Redirecting to login...`;
        setPageError(message);
        setTimeout(() => {
          router.push(`/auth?error=oauth_processing_failed&message=${encodeURIComponent(err.message || "Could not complete sign-in.")}`);
        }, 3000);
      });
  }, [params, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 p-4 text-white font-['Inter',_sans-serif]">
      <div className="text-center bg-white/10 backdrop-blur-lg p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full">
        {!pageError ? (
          <>
            <div className="relative flex justify-center items-center mb-8">
              <MessageSquareText className="absolute text-teal-200/50 text-8xl md:text-9xl animate-pulse" style={{animationDuration: '2s'}} />
              <FcGoogle className="text-6xl md:text-7xl relative" />
              <LockKeyhole size={36} className="absolute text-white -right-3 -bottom-0 opacity-80" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-white">
              Connecting with Google
            </h1>
            <p className="text-base md:text-lg text-gray-200 mb-8 max-w-md mx-auto">
              Almost there! We're securely signing you into your AnonMsg account. This will only take a moment.
            </p>
            <div className="flex justify-center items-center space-x-3">
              <div className="w-4 h-4 bg-white/90 rounded-full animate-bounce delay-0"></div>
              <div className="w-4 h-4 bg-white/90 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-4 h-4 bg-white/90 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
            <p className="text-xs text-gray-300 mt-10">
              Securing your session...
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center items-center mb-6">
                <AlertTriangle size={48} className="text-red-300" />
            </div>
             <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-red-100">
              Login Error
            </h1>
            <p className="text-base md:text-lg text-gray-200 mb-8 max-w-md mx-auto">
              {pageError}
            </p>
             <div className="w-full h-1 bg-gray-300/50 rounded-full overflow-hidden">
                <div className="h-1 bg-red-400 animate-progressOriginLeft" style={{animation: 'progress 3s linear forwards'}}></div>
            </div>
            <style jsx>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progressOriginLeft {
                    transform-origin: left;
                }
            `}</style>
          </>
        )}
      </div>
       <div className="absolute bottom-6 text-center text-white/70 text-xs">
         AnonMsg &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}

// Main page component that wraps content with Suspense
export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<MinimalLoadingScreen />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

// Minimal loading screen for Suspense fallback
function MinimalLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-['Inter',_sans-serif]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-gray-600">Loading page...</p>
    </div>
  )
}