#!/bin/bash
# Quick build script - faster than npx expo run:android

echo "🚀 Starting quick Android build..."

# Stop any running Gradle daemons
cd android
./gradlew --stop 2>/dev/null

# Build only debug variant (faster)
echo "📦 Building debug APK..."
./gradlew assembleDebug --no-daemon --max-workers=4

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📱 Installing APK..."
    adb install -r app/build/outputs/apk/debug/app-debug.apk
    echo "🎉 Done! Starting Metro bundler..."
    cd ..
    npx expo start --dev-client
else
    echo "❌ Build failed!"
    cd ..
    exit 1
fi





