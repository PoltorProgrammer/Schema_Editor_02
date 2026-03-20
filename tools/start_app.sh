#!/bin/bash
# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "---------------------------------------------------"
echo "Starting MediXtract Schema Editor"
echo "Port: 2512"
echo "URL: http://localhost:2512"
echo "---------------------------------------------------"

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:2512"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:2512"
    else
        echo "Please manually open http://localhost:2512"
    fi
fi

# Run discovery and start server
node tools/discover_projects.js && npx serve -l 2512 .
