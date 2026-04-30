"use client";

import { useState } from "react";

export default function HeroInput() {
  const [message, setMessage] = useState("");

  return (
    <section className="w-full flex items-center justify-center min-h-screen px-4">
      <main className="w-full max-w-3xl text-center">
        
        <div className="flex flex-col items-center justify-center w-full">
          
          <h1 className="text-4xl md:text-[40px]">
            What do you want to create?
          </h1>

          <p className="text-base mt-6">
            Create something amazing with one simple message.
          </p>

          {/* Input Box */}
          <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl rounded-xl focus-within:ring-2 focus-within:ring-white/40 overflow-hidden mt-4">
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 pb-0 resize-none outline-none bg-transparent"
              placeholder="Tell us about your idea"
              rows={3}
            />

            <div className="flex items-center justify-between pb-3 px-3">
              
              {/* Add Button */}
              <button
                className="flex items-center justify-center bg-gray-500 p-1 rounded-full size-6"
                aria-label="Add"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M1 5.5h9M5.5 1v9"
                    stroke="#CCD5E2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Send Button */}
              <button
                className="flex items-center justify-center p-1 rounded size-6 bg-indigo-600"
                aria-label="Send"
                onClick={() => console.log(message)}
              >
                <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                  <path
                    d="M1 5.5 5.5 1 10 5.5m-4.5 5.143V1"
                    stroke="#fff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

            </div>
          </div>

          {/* Suggestions */}
          <div className="grid grid-cols-2 gap-4 mt-8 text-slate-400 text-sm">
            <p className="cursor-pointer hover:text-white">
              How do I write a resume or cover letter?
            </p>
            <p className="cursor-pointer hover:text-white">
              How do I improve my writing skills?
            </p>

            <div className="w-full h-px bg-gray-400/50 col-span-2"></div>

            <p className="cursor-pointer hover:text-white">
              Can you translate something for me?
            </p>
            <p className="cursor-pointer hover:text-white">
              How can I be more productive?
            </p>
          </div>

        </div>

        {/* Footer */}
        <p className="text-gray-400 pb-3 mt-6 text-sm">
          By messaging us, you agree to our{" "}
          <a href="#" className="underline">
            Terms of Use
          </a>{" "}
          and confirm you've read our{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>.
        </p>

      </main>
    </section>
  );
}