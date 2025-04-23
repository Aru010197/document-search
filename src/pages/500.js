import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { FaExclamationCircle, FaHome, FaRedo } from 'react-icons/fa';

export default function ServerErrorPage() {
  return (
    <Layout>
      <Head>
        <title>Server Error | Document Search App</title>
        <meta name="description" content="An error occurred on the server." />
      </Head>
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <FaExclamationCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Server Error</h2>
          
          <p className="text-gray-600 mb-8">
            An error occurred on the server. Please try again later or contact support if the problem persists.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FaHome className="mr-2" />
              Go Home
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FaRedo className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
