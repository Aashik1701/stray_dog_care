import React from 'react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </div>
              <label htmlFor="header-search" className="sr-only">Global search</label>
              <input
                id="header-search"
                name="headerSearch"
                type="text"
                placeholder="Search dogs, locations, or IDs..."
                className="block w-full py-2 pl-10 pr-3 leading-5 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500" aria-label="Notifications">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-0 right-0 block w-2 h-2 bg-red-400 rounded-full ring-2 ring-white"></span>
            </button>

            {/* Quick stats */}
            <div className="items-center hidden space-x-6 text-sm md:flex">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">1</div>
                <div className="text-gray-500">Dogs Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-gray-500">Vaccinated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-gray-500">Sterilized</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
