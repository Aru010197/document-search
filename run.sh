#!/bin/bash

# Document Search Application Runner Script

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run this application."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm to run this application."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Warning: .env.local file not found. Creating from example..."
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo "Created .env.local from example. Please update with your credentials."
    else
        echo "Error: .env.local.example not found. Please create .env.local manually."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the development server
echo "Starting development server..."
npm run dev
