StrayDogApp - Mobile Client (Expo React Native)
=============================================

Feature-rich mobile client for the Stray Dog Care platform built with Expo (React Native). Implements authentication, dog registration with image uploads & geolocation, listing, map visualization, offline-friendly caching, and JWT session lifecycle management.

## Core Features
* Auth: Login with JWT, persisted via AsyncStorage, auto logout before token expiry
* Dogs: List view with search (ID, color, size, zone) + status badges (injured, treated, vaccinated)
* Add Dog: Camera / gallery image selection, batched Cloudinary upload with progress, location capture, notes
* Map: (Planned / existing) Map markers for registered dogs (depending on backend data)
* Offline resilience: Cached dog list (stale-while-revalidate, 1‑minute freshness window)
* UI Components: Loading, ErrorMessage, EmptyState, progress overlays
* Environment-aware API base URL resolution (LAN IP or EXPO_PUBLIC_API_URL)

## Project Structure
```
src/
  contexts/       AuthProvider (auth state, expiry handling)
  hooks/          useDogs (caching, fetch, refresh)
  navigation/     AppNavigator (auth gating + tabs + stack)
  screens/        Feature screens (Home, Dogs, AddDog, Map, DogDetail, Login, Splash)
  services/       api.js (axios instance w/ dynamic base URL)
  ui/             Shared UI components & theme
  utils/          jwt.js decode & expiry helpers
```

## Quick Start

```bash
npm install
npx expo start
```

Press the key shortcuts shown (e.g. `w` for web, `i` for iOS simulator, `a` for Android). 

## Environment Configuration

The API base URL is auto-resolved in this order:
1. `EXPO_PUBLIC_API_URL` (preferred in app config / env)
2. `API_URL`
3. Derived LAN host from Expo dev server
4. Fallback: `http://localhost:3000`

Set an env value (example):
```
EXPO_PUBLIC_API_URL=https://your-backend.example.com
```
You can put this in an `app.config.js` / `app.json` extra or use an `.env` with Expo (if configured) for builds.

## Image Upload Flow
1. User selects / captures images
2. Single multipart request POST `/api/uploads/images` (Cloudinary-backed)
3. Returns `{ url, publicId, type }[]`
4. Dog creation POST `/api/dogs` persists these image objects
5. UI shows per‑batch simulated progress (%) across all images

## Caching & Offline
`useDogs` hook:
* Loads last cached list from AsyncStorage (`dogs_cache_v1`)
* Immediately renders cached data if present
* Fetches fresh data unless cache is < 60s old
* `refresh()` forces refetch
* Silent failure falls back to cached list

## JWT Lifecycle
* On launch: stored auth loaded & token validity checked
* If expired: storage cleared, user redirected to login
* Timer scheduled to auto logout 15s before expiry

## Scripts
```bash
npm start         # expo start
npm run android   # open on Android (device/emulator)
npm run ios       # open on iOS (simulator)
```

## Development Tips
* For real devices on LAN: ensure phone & machine are on same network
* If images fail to upload, verify Cloudinary backend env vars are set
* Clear cache: `AsyncStorage.clear()` via a quick debug snippet if needed

## Potential Next Enhancements
* Map clustering & dog status filters
* Push notifications for new injured dog reports
* Dog status update actions (vaccinated / sterilized toggles) in detail screen
* Dark mode theme toggle

## License
Internal project (add license info if needed).
