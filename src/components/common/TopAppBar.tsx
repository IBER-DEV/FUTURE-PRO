import React from 'react';

export const TopAppBar: React.FC = () => {
  return (
    <header className="flex justify-center items-center w-full px-4 h-16 max-w-md mx-auto sticky top-0 z-40 bg-[#f8f9fb]/80 backdrop-blur-xl transition-colors duration-150 border-b border-transparent">
      <h1 className="text-xl font-serif-hero text-black italic font-normal tracking-tight">
        Future{' '}
        <span className="text-[10px] font-sans font-bold not-italic tracking-tighter uppercase bg-black text-white px-1.5 py-0.5 rounded-sm ml-0.5 align-middle">
          PRO
        </span>
      </h1>
    </header>
  );
};
