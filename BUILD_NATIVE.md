# Building a Fully Offline Native App

Since Capacitor requires Node 22+, here are alternative approaches to create a fully offline app:

## Option 1: Use PWABuilder (Easiest - Android)

PWABuilder can create an APK from your web app without needing Node 22+:

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Go to https://www.pwabuilder.com/**
   - Enter your deployed URL (or use localhost if testing)
   - Or upload your `build/client` folder as a zip
   - Click "Start" → "Build My PWA"
   - Select "Android" → Download APK
   - Install APK on your phone

## Option 2: Manual Android APK (Using Android Studio)

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Install Android Studio** (if not already installed)

3. **Create a new Android project:**
   - Choose "Empty Activity"
   - Minimum SDK: API 21 (Android 5.0)
   - Use Kotlin or Java

4. **Replace the WebView:**
   - In `MainActivity`, replace the default content with a WebView
   - Point it to `file:///android_asset/www/index.html`
   - Copy your `build/client` folder contents to `app/src/main/assets/www/`

5. **Build APK:**
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Install the generated APK on your phone

## Option 3: Use Cordova (Alternative)

1. **Install Cordova:**
   ```bash
   npm install -g cordova
   ```

2. **Create Cordova project:**
   ```bash
   cordova create calorietracker com.calorietracker.app "Calorie Tracker"
   cd calorietracker
   ```

3. **Add Android platform:**
   ```bash
   cordova platform add android
   ```

4. **Copy your built files:**
   ```bash
   cp -r ../build/client/* www/
   ```

5. **Build APK:**
   ```bash
   cordova build android
   ```

6. **Find APK:** `platforms/android/app/build/outputs/apk/debug/app-debug.apk`

## Option 4: Simple Android WebView Wrapper (Simplest)

Create a minimal Android app that just loads your HTML:

1. **Create Android project** in Android Studio
2. **Add WebView** to `activity_main.xml`:
   ```xml
   <WebView
       android:id="@+id/webview"
       android:layout_width="match_parent"
       android:layout_height="match_parent" />
   ```

3. **In MainActivity:**
   ```kotlin
   val webView = findViewById<WebView>(R.id.webview)
   webView.settings.javaScriptEnabled = true
   webView.settings.domStorageEnabled = true
   webView.loadUrl("file:///android_asset/www/index.html")
   ```

4. **Copy files:** Copy `build/client` contents to `app/src/main/assets/www/`

## Quick Test: Serve Once, Install PWA

Even though you want it offline, you can:
1. Serve it once via local server
2. Install as PWA on your phone
3. **After installation, it works completely offline** - no server needed!

The PWA will be cached and work offline forever after the initial install.

## Recommended Approach

**For Android:** Use PWABuilder (Option 1) - it's the easiest and creates a proper APK.

**For iOS:** You'll need Xcode and an Apple Developer account (or use TestFlight).

