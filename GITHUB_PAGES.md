# Deploying to GitHub Pages

## Quick Setup

1. **Create a GitHub repository** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Install GitHub Pages deployment tool**:
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to package.json**:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d build/client"
   }
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` → `/ (root)`
   - Save

6. **Access your app**:
   - URL: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
   - The app will be available at this URL
   - Install as PWA from your phone's browser → Add to Home Screen

## After Deployment

Once deployed:
- ✅ Works offline after first visit (service worker caches everything)
- ✅ Can be installed as PWA on your phone
- ✅ No server needed after installation
- ✅ All data stored locally in browser

## Updating the App

After making changes:
```bash
npm run build
npm run deploy
```

The changes will be live on GitHub Pages in a few minutes.

## Important Notes

- The app URL will be: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
- Make sure your `manifest.json` has the correct `start_url` (should be `/` or `/YOUR_REPO_NAME/` depending on your setup)
- After installing as PWA, the app works completely offline

