import React from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * Main layout component for the application
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to render inside the layout
 * @returns {JSX.Element}
 */
export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
