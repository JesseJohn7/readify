"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-3 md:py-4 shadow max-w-5xl rounded-full mx-auto w-full bg-white relative">
      
      {/* Logo */}
      <Link href="/">
        <Image
          src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/dummyLogo/prebuiltuiDummyLogo.svg"
          alt="Logo"
          width={120}
          height={40}
        />
      </Link>

      {/* Nav */}
      <nav
        className={`absolute md:static top-0 left-0 h-full md:h-auto bg-white/50 backdrop-blur md:bg-transparent flex flex-col md:flex-row items-center justify-center gap-8 text-gray-900 text-sm font-normal transition-all duration-300 ${
          isOpen ? "w-full" : "w-0 md:w-auto overflow-hidden md:overflow-visible"
        }`}
      >
        <Link href="#" className="hover:text-indigo-600">
          Products
        </Link>
        <Link href="#" className="hover:text-indigo-600">
          Customer Stories
        </Link>
        <Link href="#" className="hover:text-indigo-600">
          Pricing
        </Link>
        <Link href="#" className="hover:text-indigo-600">
          Docs
        </Link>

        {/* Close Button (Mobile) */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </nav>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        
        {/* Theme Icon */}
        <button className="size-8 flex items-center justify-center hover:bg-gray-100 transition border border-slate-300 rounded-md">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
          >
            <path
              d="M7.5 10.39a2.889 2.889 0 1 0 0-5.779 2.889 2.889 0 0 0 0 5.778M7.5 1v.722m0 11.556V14M1 7.5h.722m11.556 0h.723m-1.904-4.596-.511.51m-8.172 8.171-.51.511m-.001-9.192.51.51m8.173 8.171.51.511"
              stroke="#353535"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Signup */}
        <Link
          href="#"
          className="hidden md:flex bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition"
        >
          Sign up
        </Link>

        {/* Open Menu (Mobile) */}
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}