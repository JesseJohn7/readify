"use client";

import { useState } from "react";

export default function HeroInput() {
  const [message, setMessage] = useState("");

  return (
    <section className="w-full flex items-center justify-center min-h-screen px-4 
    bg-gradient-to-b from-white to-gray-100 
    dark:from-black dark:to-gray-900">

      <main className="w-full max-w-3xl text-center">

        <h1 className="text-4xl md:text-[40px] font-semibold text-gray-900 dark:text-white">
          What do you want to create?
        </h1>

        <p className="mt-6 text-gray-600 dark:text-gray-400">
          Create something amazing with one simple message.
        </p>

        {/* Input */}
        <div className="max-w-xl w-full mx-auto mt-6 rounded-xl 
        bg-white/60 dark:bg-white/5 backdrop-blur-xl 
        border border-gray-200 dark:border-gray-700 
        shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40">

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-4 pb-0 resize-none outline-none bg-transparent 
            text-gray-900 dark:text-white"
            placeholder="Tell us about your idea"
            rows={3}
          />

          <div className="flex justify-between px-3 pb-3">
            <button className="bg-gray-200 dark:bg-gray-700 p-1 rounded-full">
              +
            </button>

            <button className="bg-indigo-600 text-white px-3 py-1 rounded-md">
              Send
            </button>
          </div>
        </div>

      </main>
    </section>
  );
}