// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Send, MessageSquareText, UserPlus, Menu, X, ShieldCheck, EyeOff, Link2, Users, MessageCircleQuestion, Sparkles, Gift, CheckCircle, Coffee } from 'lucide-react';
import LegalModal from './Components/LegalModal';
import TermsAndConditionsContent from './Components/TermsAndConditionsContent' // Ensure this path is correct for the new file
import PrivacyPolicyContent from './Components/PrivacyPolicyContent';


const MASK_IMAGE_URL = "https://images.unsplash.com/photo-1518895949257-762173c786d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGFub255bW91c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60";
const YOUR_APP_NAME = "AnonMsg";
const BUY_ME_A_COFFEE_LINK = "YOUR_BUY_ME_A_COFFEE_LINK_HERE";

const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);
};


const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useScrollAnimation();

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<React.ReactNode>(null);
  const [legalModalTitle, setLegalModalTitle] = useState("");

  const openTermsModal = () => {
    setLegalModalTitle("Terms and Conditions");
    setLegalModalContent(<TermsAndConditionsContent />);
    setIsLegalModalOpen(true);
  };

  const openPrivacyModal = () => {
    setLegalModalTitle("Privacy Policy");
    setLegalModalContent(<PrivacyPolicyContent />);
    setIsLegalModalOpen(true);
  }

  return (
    <>
    <div className="min-h-screen flex flex-col font-['Inter',_sans-serif] bg-white text-gray-800">
      <header className="py-4 px-6 md:px-10 shadow-md sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer" passHref>
            <MessageSquareText className="h-8 w-8 text-teal-500 transition-transform duration-300 hover:scale-110" />
            <span className="text-xl font-semibold text-gray-700 hidden sm:block">{YOUR_APP_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#how-it-works" className="text-gray-600 hover:text-teal-500 transition-colors duration-300 cursor-pointer">
              How It Works
            </Link>
            <Link href="#features" className="text-gray-600 hover:text-teal-500 transition-colors duration-300 cursor-pointer">
              Key Features
            </Link>
            <Link href="/auth" className="text-gray-600 hover:text-teal-500 transition-colors duration-300 cursor-pointer">
              Send a Message
            </Link>
            <Link href="/auth?view=signup" passHref>
              <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 flex items-center space-x-2">
                <UserPlus size={18} />
                <span>Create Account</span>
              </button>
            </Link>
          </nav>
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}
              className="text-gray-600 hover:text-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-2 bg-white shadow-lg rounded-lg">
            <nav className="flex flex-col items-center space-y-3">
              <Link href="#how-it-works" className="block px-4 py-2 text-gray-600 hover:text-teal-500 hover:bg-teal-50 rounded-md w-full text-center transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>How It Works</Link>
              <Link href="#features" className="block px-4 py-2 text-gray-600 hover:text-teal-500 hover:bg-teal-50 rounded-md w-full text-center transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>Key Features</Link>
              <Link href="/auth" className="block px-4 py-2 text-gray-600 hover:text-teal-500 hover:bg-teal-50 rounded-md w-full text-center transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>Send a Message</Link>
              <Link href="/auth?view=signup" className="w-[calc(100%-2rem)] mx-4" passHref onClick={() => setIsMobileMenuOpen(false)}>
                <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full">
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </button>
              </Link>
            </nav>
          </div>
        )}
      </header>

       <main className="flex-grow">
        <section className="bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 text-white py-20 md:py-32 px-6 md:px-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/25"></div>
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-around relative z-10">
            <div className="w-full md:w-1/2 lg:w-2/5 mb-10 md:mb-0 flex justify-center order-2 md:order-1">
              <div className="relative group">
                <div
                    className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-center bg-cover bg-no-repeat rounded-full shadow-2xl border-4 border-white/20 animate-slowPulse"
                    style={{ backgroundImage: `url(${MASK_IMAGE_URL})` }}
                    role="img"
                    aria-label="Symbol of anonymity"
                ></div>
                <div className="absolute inset-0 rounded-full bg-teal-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pingOnce"></div>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-3/5 text-center md:text-left md:pl-10 lg:pl-16 order-1 md:order-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight animate-fadeInDown animation-delay-200">
                Foster Honest Dialogue. <span className="block text-teal-200">Anonymously.</span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-200 mb-8 animate-fadeInDown animation-delay-400">
                {YOUR_APP_NAME} provides a secure platform for sharing thoughts, asking sensitive questions, and receiving genuine feedback while maintaining complete sender anonymity. Create your unique link to begin receiving insightful anonymous messages.
              </p>
              <blockquote className="mb-10 border-l-4 border-teal-300 pl-4 italic animate-fadeInDown animation-delay-500">
                <p className="text-xl lg:text-2xl leading-relaxed text-gray-100">
                  "Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth."
                </p>
                <footer className="mt-2 text-md text-teal-200 font-medium">
                  - Oscar Wilde
                </footer>
              </blockquote>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fadeInUp animation-delay-600">
                <Link href="/auth?view=signup" passHref>
                  <button className="bg-white hover:bg-gray-100 text-teal-600 font-bold py-3.5 px-10 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300 focus:ring-opacity-75 flex items-center justify-center space-x-2 shadow-lg">
                    <UserPlus size={22} />
                    <span>Create Your Link</span>
                  </button>
                </Link>
                 <Link href="#how-it-works" passHref>
                  <button className="bg-transparent hover:bg-white/20 border-2 border-white text-white font-bold py-3.5 px-10 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-opacity-75 flex items-center justify-center space-x-2">
                    <span>Learn How</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
         <section id="how-it-works" className="py-16 md:py-24 px-6 md:px-10 bg-gray-50">
            <div className="container mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 scroll-animate">How {YOUR_APP_NAME} Operates</h2>
                <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto scroll-animate animation-delay-200">
                  Engaging in anonymous conversations is a simple and secure process. Follow these straightforward steps:
                </p>
                <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                    {[
                      { icon: <UserPlus className="h-12 w-12 text-teal-500" />, title: "1. Create Your Account", description: "A quick and free sign-up process grants you access to your personal anonymous message link and a private dashboard to view and manage all received messages securely." },
                      { icon: <Link2 className="h-12 w-12 text-teal-500" />, title: "2. Receive Your Unique Link", description: "Upon registration, you will instantly obtain a unique, shareable link. This link serves as your dedicated portal for receiving anonymous messages." },
                      { icon: <Send className="h-12 w-12 text-teal-500" />, title: "3. Share & Receive Messages", description: "Distribute your link across social media platforms, to friends, or any desired channel. Anyone can send you messages without requiring an account, and their identity remains completely confidential to you." }
                    ].map((item, index) => (
                      <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center scroll-animate" style={{ animationDelay: `${index * 200 + 400}ms`}}>
                          <div className="flex justify-center items-center mb-6 bg-teal-100 p-5 rounded-full transition-transform duration-300 group-hover:scale-110">
                              {item.icon}
                          </div>
                          <h3 className="text-xl font-semibold mb-3 text-gray-800">{item.title}</h3>
                          <p className="text-gray-600 leading-relaxed text-sm">{item.description}</p>
                      </div>
                    ))}
                </div>
            </div>
        </section>
        <section id="features" className="py-16 md:py-24 px-6 md:px-10 bg-white">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 scroll-animate">Key Features & Benefits</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto scroll-animate animation-delay-200">
                {YOUR_APP_NAME} is engineered for simplicity, privacy, and fostering genuine communication. Discover our core advantages:
              </p>
            </div>
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                { icon: <EyeOff className="h-10 w-10 text-white" />, title: "Complete Sender Anonymity", description: "Individuals sending messages can express themselves with full candor, as no login or personal identification is required from their end." , bgColor: "bg-teal-500" },
                { icon: <CheckCircle className="h-10 w-10 text-white" />, title: "Foster Authentic Dialogue", description: "Cultivate an environment for honest feedback and open conversations. Receive candid responses and answer questions that people might hesitate to ask directly, all while ensuring sender privacy." , bgColor: "bg-sky-500"},
                { icon: <Link2 className="h-10 w-10 text-white" />, title: "Effortless Link Sharing", description: "Your personalized anonymous message link is designed for easy distribution across various platforms, including social media profiles and direct communications." , bgColor: "bg-cyan-500"},
              ].map((feature, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 scroll-animate" style={{ animationDelay: `${index * 150}ms` }}>
                  <div className={`p-4 rounded-full ${feature.bgColor} inline-block mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="use-cases" className="py-16 md:py-24 px-6 md:px-10 bg-gray-50">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4 scroll-animate">Versatile Applications</h2>
            <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto scroll-animate animation-delay-200">
              Anonymous messaging offers diverse utility. Consider these potential use cases:
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {["Candid Professional Feedback", "Public Figure Q&A Sessions", "Sharing Sensitive Information", "Expressing Views Privately"].map((useCase, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 scroll-animate" style={{ animationDelay: `${index * 200 + 300}ms`}}>
                  <h3 className="text-lg font-semibold text-teal-600">{useCase}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="py-16 md:py-24 px-6 md:px-10 bg-teal-700 text-white">
          <div className="container mx-auto text-center scroll-animate">
            <MessageSquareText className="h-16 w-16 text-teal-200 mx-auto mb-6 animate-bounce" style={{animationDuration: '1.5s'}}/>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Receive Authentic Messages?</h2>
            <p className="text-lg text-teal-100 mb-10 max-w-xl mx-auto">
              Join a growing community leveraging the power of anonymous communication. Create your personal link today and begin receiving valuable, candid insights.
            </p>
            <Link href="/auth?view=signup" passHref>
              <button className="bg-white hover:bg-gray-100 text-teal-700 font-extrabold py-4 px-12 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300 shadow-xl flex items-center justify-center mx-auto">
                <UserPlus size={24} className="mr-2.5" />
                Get Started for Free
              </button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-12 px-6 md:px-10 text-center">
        <div className="container mx-auto">
          <div className="mb-4">
            <MessageSquareText className="h-10 w-10 text-teal-400 mx-auto mb-3" />
            <p className="text-xl font-semibold">{YOUR_APP_NAME}</p>
          </div>
          <p className="mb-3 text-sm text-gray-400">
            Facilitating open and honest conversations, anonymously.
          </p>
          <nav className="flex justify-center items-center space-x-4 mb-6">
            <Link href="/auth" className="text-gray-300 hover:text-teal-400 text-sm">Login</Link>
            <Link href="/auth?view=signup" className="text-gray-300 hover:text-teal-400 text-sm">Sign Up</Link>
            <span className="text-gray-500 text-sm">|</span>
            <button onClick={openTermsModal} className="text-gray-300 hover:text-teal-400 text-sm cursor-pointer">Terms of Service</button>
            <span className="text-gray-500 text-sm">|</span>
            <button onClick={openPrivacyModal} className="text-gray-300 hover:text-teal-400 text-sm cursor-pointer">Privacy Policy</button>
            {BUY_ME_A_COFFEE_LINK && BUY_ME_A_COFFEE_LINK !== "YOUR_BUY_ME_A_COFFEE_LINK_HERE" && ( // Added check for placeholder
              <>
                <span className="text-gray-500 text-sm">|</span>
                <a
                  href={BUY_ME_A_COFFEE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-yellow-400 text-sm flex items-center space-x-1.5 group"
                >
                  <Coffee size={16} className="transition-transform duration-200 group-hover:scale-110" />
                  <span>Support the Creator</span>
                </a>
              </>
            )}
          </nav>
          <p className="text-xs text-gray-500">
            Designed by Fredrick Maina. All rights reserved &copy; {new Date().getFullYear()} {YOUR_APP_NAME}.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-600 { animation-delay: 0.6s; }

        @keyframes slowPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.95; }
        }
        .animate-slowPulse {
          animation: slowPulse 5s infinite ease-in-out;
        }

        @keyframes pingOnce {
          0% { transform: scale(.8); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.2; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        .animate-pingOnce {
          animation: pingOnce 1.5s cubic-bezier(0, 0, 0.2, 1);
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation-name: fadeInUp; animation-duration: 0.8s; animation-fill-mode: both;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown {
          animation-name: fadeInDown; animation-duration: 0.7s; animation-fill-mode: both;
        }
        .scroll-animate { opacity: 0; }
      `}</style>
    </div>

    <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        title={legalModalTitle}
        content={legalModalContent}
      />
    </>
  );
};

export default LandingPage;