import React from 'react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search dogs, locations, or IDs..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* Quick stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
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
