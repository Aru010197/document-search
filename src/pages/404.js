import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { FaExclamationTriangle, FaHome, FaSearch } from 'react-icons/fa';

export default function NotFoundPage() {
  return (
    <Layout>
      <Head>
        <title>Page Not Found | Document Search App</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Head>
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <FaExclamationTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-6" />
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
          
          <p className="text-gray-600 mb-8">
            The page you are looking for does not exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FaHome className="mr-2" />
              Go Home
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FaSearch className="mr-2" />
              Search Documents
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
