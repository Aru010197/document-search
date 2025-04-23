import React from 'react';
import Link from 'next/link';

/**
 * Footer component
 * 
 * @returns {JSX.Element}
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and copyright */}
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">DocSearch</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              &copy; {currentYear} Document Search App. All rights reserved.
            </p>
          </div>
          
          {/* Links */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Navigation</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="text-sm text-gray-500 hover:text-primary-600">
                    Search
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="text-sm text-gray-500 hover:text-primary-600">
                    Upload
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Supported Formats</h3>
              <ul className="space-y-2">
                <li className="text-sm text-gray-500">PDF Documents</li>
                <li className="text-sm text-gray-500">Word Documents</li>
                <li className="text-sm text-gray-500">PowerPoint Presentations</li>
                <li className="text-sm text-gray-500">Excel Spreadsheets</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom credits */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Built with Next.js, Supabase, and Tailwind CSS. Deployed on Vercel.
          </p>
        </div>
      </div>
    </footer>
  );
}
