@echo off
REM Quick build script for Windows - faster than npx expo run:android

echo 🚀 Starting quick Android build...

REM Stop any running Gradle daemons
cd android
call gradlew.bat --stop 2>nul

REM Build only debug variant (faster)
echo 📦 Building debug APK...
call gradlew.bat assembleDebug --no-daemon --max-workers=4

REM Check if build succeeded
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful!
    echo 📱 Installing APK...
    adb install -r app\build\outputs\apk\debug\app-debug.apk
    echo 🎉 Done! Starting Metro bundler...
    cd ..
    npx expo start --dev-client
) else (
    echo ❌ Build failed!
    cd ..
    exit /b 1
)





