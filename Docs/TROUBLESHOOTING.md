# Troubleshooting Guide

## Common Errors and Solutions

### 0. AuthProvider ReferenceError: Cannot access 'logout' before initialization

**Error:**
```
Uncaught ReferenceError: Cannot access 'logout' before initialization
   at AuthProvider (...)
```

**Explanation:**
In React, variables declared with `const` are not hoisted. If a hook (like `useEffect`) captures a function (e.g., `logout`) that is declared later in the component, it can trigger a Temporal Dead Zone (TDZ) error during initialization.

**Fix (already applied):**
- Define `logout` with `useCallback` before the `useEffect` that references it.
- Ensure the context value memo includes all function dependencies.

Snippet (for reference):
```js
// Define first
const logout = useCallback(async () => { /* ... */ }, []);

// Then use inside effects
useEffect(() => {
   if (!token) return;
   // ...
   const timer = setTimeout(() => logout(), delay);
   return () => clearTimeout(timer);
}, [token, logout]);

// Memoize context value with correct deps
const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading, login, register, logout]);
```

### 1. Chrome Extension Errors (Can be ignored)

**Error:**
```
TypeError: Failed to fetch dynamically imported module: chrome-extension://...
contentscript.js:18 reconnecting...
```

**Explanation:**
These errors are from browser extensions (like React DevTools, Redux DevTools, or other Chrome extensions) trying to load their modules. They do NOT affect your app functionality.

**Solution:**
- You can safely ignore these errors
- If they bother you, disable browser extensions when developing
- These errors will NOT appear in production builds or on physical devices

### 2. Login Failed - Connection Issues

**Symptoms:**
- "Cannot connect to server" error
- "Network Error" message
- "Unable to login"

**Common Causes:**

#### a) Backend Not Running
**Check:**
```bash
# In the backend directory
cd backend
npm start
# or
node server.js
```

You should see:
```
🚀 Server running on port 3000
🔗 Health check: http://localhost:3000/health
📡 API base URL: http://localhost:3000/api
```

**Verify backend is accessible:**
- Open: `http://localhost:3000/health` in your browser
- Should return: `{ "status": "ok" }`

#### b) Wrong API URL Configuration

**For Local Development (Web):**
If running on web with Expo, `localhost` should work.

**For Physical Device or Emulator:**
`localhost` won't work! You need your computer's IP address.

**Find your IP address:**
- **macOS/Linux:** Run `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** Run `ipconfig` and look for IPv4 Address
- **Example:** `192.168.1.100`

**Update API URL:**

**Option 1: Environment Variable (Recommended)**
Create a `.env` file in `StrayDogApp/`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```
Replace `192.168.1.100` with your actual IP address.

**Option 2: Update app.json**
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.100:3000"
    }
  }
}
```

**Option 3: For production/deployment**
Set `EXPO_PUBLIC_API_URL` in your deployment platform's environment variables.

#### c) CORS Issues
If you see CORS errors in the browser console, check that your backend allows requests from your frontend origin.

**Backend CORS configuration** (already set in `backend/src/app.js`):
- Should allow: `http://localhost:19006`, `http://localhost:8081`, `http://localhost:8082`
- For production, add your production domain

#### d) Firewall Blocking Connection
Your computer's firewall might be blocking port 3000.

**Check:**
- Ensure port 3000 is open
- Try temporarily disabling firewall to test
- For production, ensure your hosting allows connections on port 3000

### 3. Debugging Steps

1. **Check API URL in Console:**
   When the app starts, look for these logs in your console:
   ```
   🌐 API URL from env: http://...
   🔗 API Base URL: http://.../api
   ```
   If you see a warning about fallback URL, configure it properly.

2. **Test Backend Connection:**
   ```bash
   # Test if backend is accessible
   curl http://localhost:3000/health
   # Or open in browser: http://localhost:3000/health
   ```

3. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Try logging in
   - Look for failed requests to `/api/auth/login`
   - Check the request URL and error message

4. **Check Backend Logs:**
   - Look at your backend server console
   - See if login requests are reaching the server
   - Check for any error messages

### 4. Testing with Demo Mode

If backend connection issues persist, you can use demo mode:

**Enable Demo Mode:**
In `StrayDogApp/app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:3000",
      "demoMode": true
    }
  }
}
```

Then use any credentials with a demo token prefix. This will use mock data instead of connecting to the backend.

### 5. Still Having Issues?

1. **Clear cache:**
   ```bash
   # In StrayDogApp directory
   npm start -- --clear
   ```

2. **Restart everything:**
   - Stop backend server
   - Stop Expo dev server
   - Clear node_modules and reinstall if needed
   - Restart both

3. **Check MongoDB Connection:**
   Ensure your backend can connect to MongoDB:
   - Check `backend/.env` for `MONGODB_URI`
   - Backend should show: `✅ MongoDB Connected`

4. **Verify User Exists:**
   Use the backend test script to create a user:
   ```bash
   cd backend
   node create-test-users.js
   ```

## Quick Checklist

- [ ] Backend server is running (`http://localhost:3000/health` works)
- [ ] API URL is correctly configured (check console logs)
- [ ] Using correct IP address (not `localhost`) if on device/emulator
- [ ] MongoDB is connected (backend shows `✅ MongoDB Connected`)
- [ ] Test user exists (run `create-test-users.js` if needed)
- [ ] No firewall blocking port 3000
- [ ] Browser DevTools Network tab shows the request (even if it fails)

---

## Deprecation Warnings

### "shadow*" style props are deprecated. Use "boxShadow".

**Why this appears:**
On web, React Native for Web deprecates legacy shadow props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) in favor of the standard `boxShadow` CSS property.

**Current project status:**
- Our shadow utility `src/ui/shadow.js` already uses `boxShadow` on web and platform-specific styles on native. If you still see warnings, they usually come from any inline styles that directly use the legacy props.

**How to fix in your components:**
- Replace legacy props with `boxShadow` on web, or import and use our utility:
   ```js
   import { shadow } from '../ui/shadow';
  
   const styles = StyleSheet.create({
      card: {
         backgroundColor: '#fff',
         borderRadius: 12,
         padding: 16,
         ...shadow(2), // web: boxShadow, iOS: shadow*, Android: elevation
      },
   });
   ```
- If you must write inline per-platform shadows, prefer:
   ```js
   import { Platform } from 'react-native';
   const shadowStyle = Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4, shadowColor: '#000' },
   });
   ```

No changes needed if you stick to `...shadow(level)`.

