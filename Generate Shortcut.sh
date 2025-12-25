#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR" && pwd )"
DESKTOP_PATH="$HOME/Desktop"
LAUNCHER_PATH="$PROJECT_ROOT/tools/start_app.sh"
ICON_PATH="$PROJECT_ROOT/tools/MediXtract-Circular-logo.ico"

echo "---------------------------------------------------"
echo "🔍 Checking for Node.js..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    read -p "Would you like to open the Node.js download page? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "https://nodejs.org/"
        else
            xdg-open "https://nodejs.org/"
        fi
        exit 1
    fi
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js found: $NODE_VERSION"
fi

echo "🚀 Generating Shortcut..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac Shortcut (Command file)
    SHORTCUT="$DESKTOP_PATH/Schema Editor.command"
    echo "#!/bin/bash" > "$SHORTCUT"
    echo "\"$LAUNCHER_PATH\"" >> "$SHORTCUT"
    chmod +x "$SHORTCUT"
    echo "✅ Mac Shortcut created on Desktop!"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux Shortcut (.desktop file)
    SHORTCUT="$DESKTOP_PATH/schema-editor.desktop"
    echo "[Desktop Entry]" > "$SHORTCUT"
    echo "Name=Schema Editor" >> "$SHORTCUT"
    echo "Exec=\"$LAUNCHER_PATH\"" >> "$SHORTCUT"
    echo "Icon=$ICON_PATH" >> "$SHORTCUT"
    echo "Type=Application" >> "$SHORTCUT"
    echo "Terminal=true" >> "$SHORTCUT"
    chmod +x "$SHORTCUT"
    # Mark as trusted if on GNOME
    gio set "$SHORTCUT" metadata::trusted true 2>/dev/null
    echo "✅ Linux Shortcut created on Desktop!"
else
    echo "❌ Unsupported OS for this script."
fi
