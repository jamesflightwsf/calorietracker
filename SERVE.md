# How to Package and Install on Your Phone

## Option 1: Serve Locally (Easiest for Testing)

### On Your Computer:

1. **Build the app** (already done):
   ```bash
   npm run build
   ```

2. **Start a local server** from the `build/client` directory:

   **Using Python 3:**
   ```bash
   cd build/client
   python3 -m http.server 8080
   ```

   **Or using Node.js (npx):**
   ```bash
   cd build/client
   npx serve -p 8080
   ```

3. **Find your computer's IP address:**
   - **Linux/Mac:** Run `ip addr show` or `ifconfig` and look for your local IP (usually starts with 192.168.x.x or 10.x.x.x)
   - **Windows:** Run `ipconfig` and look for IPv4 Address

### On Your Phone:

1. Make sure your phone is on the **same WiFi network** as your computer
2. Open your phone's browser (Chrome/Safari)
3. Navigate to: `http://YOUR_COMPUTER_IP:8080`
   - Example: `http://192.168.1.100:8080`
4. The app should load!
5. **Install as PWA:**
   - **Android (Chrome):** Tap the menu (3 dots) → "Add to Home screen" or "Install app"
   - **iOS (Safari):** Tap the Share button → "Add to Home Screen"

## Option 2: Deploy to a Web Server

### Deploy to Netlify (Free):

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   cd build/client
   netlify deploy --prod
   ```

3. Follow the prompts to create a site
4. Access your app via the provided URL
5. Install on phone via browser → Add to Home Screen

### Deploy to GitHub Pages:

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Set source to `build/client` directory
4. Access via `https://YOUR_USERNAME.github.io/REPO_NAME`
5. Install on phone via browser → Add to Home Screen

## Option 3: Copy Files to Phone Directly

1. Copy the entire `build/client` folder to your phone
2. Use a file manager app that can serve HTTP (like "Simple HTTP Server" on Android)
3. Open the served URL in your phone's browser
4. Install as PWA

## Important Notes:

- The app works **offline** once installed as a PWA
- All data is stored locally in your browser (localStorage)
- The food database CSV is bundled with the app
- Make sure HTTPS is used for production deployments (required for service workers)

