'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Map as MapIcon } from 'lucide-react';

const NAV_ITEMS = ['Product', 'Pricing', 'API', 'Sign In'];

const FLOATING_ELEMENTS = [
  { id: 1, label: 'GRZ1', top: '20%', left: '15%', delay: 0 },
  { id: 2, label: '711m²', top: '60%', left: '10%', delay: 1.5 },
  { id: 3, label: 'No Overlays', top: '30%', left: '80%', delay: 0.5 },
  { id: 4, label: '3 Townhouses', top: '70%', left: '75%', delay: 2 },
  { id: 5, label: 'Clause 55', top: '15%', left: '60%', delay: 1 },
];

export default function LandingPage() {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="relative min-h-screen w-full bg-[#241F21] text-white overflow-hidden font-sans selection:bg-[#E9E778] selection:text-[#241F21]">

      {FLOATING_ELEMENTS.map((el) => (
        <motion.div
          key={el.id}
          initial={{ y: 0 }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: el.delay }}
          className="absolute z-0 px-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-zinc-400 backdrop-blur-sm pointer-events-none"
          style={{ top: el.top, left: el.left }}
        >
          {el.label}
        </motion.div>
      ))}

      <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E9E778] rounded-sm flex items-center justify-center">
            <MapIcon className="text-[#241F21] w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">SimplySite</span>
        </div>

        <nav className="flex items-center gap-2" onMouseLeave={() => setHoveredNav(null)}>
          {NAV_ITEMS.map((item) => (
            <div key={item} onMouseEnter={() => setHoveredNav(item)} className="relative px-4 py-2 cursor-pointer transition-colors z-10">
              {hoveredNav === item && (
                <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-full -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              )}
              <span className={`relative z-20 text-sm font-medium ${hoveredNav === item ? 'text-[#E9E778]' : 'text-zinc-300'}`}>
                {item}
              </span>
            </div>
          ))}
          <button className="ml-4 px-5 py-2 bg-[#E9E778] text-[#241F21] text-sm font-bold rounded-full hover:bg-[#d4d262] transition-colors">
            Try for free
          </button>
        </nav>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Unlock any site&apos;s potential. <br />
            <span className="text-zinc-500">Made instantly.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Type any Victorian address to instantly generate spatial yields, statutory limits, and commercial feasibilities.
          </p>

          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-[#E9E778]/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/10 border border-white/20 backdrop-blur-md rounded-full p-2 pl-6 shadow-2xl transition-all group-focus-within:border-[#E9E778]/50 group-focus-within:bg-white/15">
              <Search className="w-6 h-6 text-zinc-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search any address (e.g. 62 Chandler Road, Noble Park)" className="w-full bg-transparent border-none text-white text-lg placeholder:text-zinc-500 focus:outline-none focus:ring-0 px-4 py-4" />
              <button className="px-8 py-4 bg-[#E9E778] text-[#241F21] font-bold text-lg rounded-full hover:bg-[#d4d262] transition-colors flex-shrink-0">
                Explore
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
