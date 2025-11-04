# StrayDogApp — Project Status Report

Date: 31 Oct 2025
Scope: React Native mobile app located at `StrayDogApp/`

## Overview
StrayDogApp is an Expo-based React Native application for field workers and NGOs to register, track, and manage stray dogs. The app integrates with a Node/Express API but also supports a demo mode that works entirely offline from the backend using mock data.

## Tech stack
- React Native: 0.81.5 (Expo SDK 54)
- Expo: 54.0.20
- React: 19.1.0
- Navigation: `@react-navigation/native`, stack and bottom-tabs
- HTTP: Axios
- Storage: `@react-native-async-storage/async-storage`
- Maps: `react-native-maps`
- Animations/gesture: `react-native-reanimated`, `react-native-gesture-handler`
- Icons: `@expo/vector-icons`

See exact versions in `StrayDogApp/package.json`.

## Current functionality
- Authentication UI with auto-login in demo mode
- Home dashboard with:
  - Quick actions (Register Dog, Map, Browse Dogs)
  - Statistics cards (Total, Sterilized, Vaccinated, Need Care)
  - Logged-in profile summary
- Dogs list and details
- Add dog workflow (form + image plumbing ready; images stored as metadata)
- Map screen (uses `/dogs/location` data)

## Key files
- App entry: `App.js`
- Navigation: `src/navigation/AppNavigator.jsx`
- Auth context: `src/contexts/AuthProvider.jsx`
- API client: `src/services/api.js`
- Screens:
  - `src/screens/HomeScreen.jsx`
  - `src/screens/DogsScreen.jsx`
  - `src/screens/DogDetailScreen.jsx`
  - `src/screens/AddDogScreen.jsx`
  - `src/screens/MapScreen.jsx`, `src/screens/MapScreen.web.jsx`
  - `src/screens/LoginScreen.jsx`, `src/screens/SplashScreen.jsx`
- UI utilities: `src/ui/shadow.js`, `src/ui/Loading.jsx`, `src/ui/ErrorMessage.jsx`
- JWT utilities: `src/utils/jwt.js`

## Authentication and demo mode
- The app auto-logs in using a demo user if no valid token is found or if real login fails.
- Source of logic:
  - `src/contexts/AuthProvider.jsx` — creates a demo user and issues a demo token (e.g., `demo-token-...`). Persisted in `AsyncStorage` under `auth`.
  - `src/services/api.js` — detects demo tokens and, on network/API failures, returns mock data for:
    - `GET /auth/me` (profile)
    - `GET /dogs/stats` (statistics)
    - `GET /dogs` (list with pagination)
    - `GET /dogs/location` (map feed)
- Real API use remains the first attempt; app falls back to mock responses when backend is unreachable or returns an error.

## Configuration
- `app.json` contains the API URL:
  ```json
  {
    "expo": {
      "extra": { "apiUrl": "http://localhost:3000" }
    }
  }
  ```
- `src/services/api.js` resolves `baseURL` in the following precedence:
  1) `EXPO_PUBLIC_API_URL` or `API_URL` env vars
  2) `expo.extra.apiUrl` from `app.json`
  3) LAN host inferred from Expo host URI
  4) Fallback to `http://localhost:3000`

## Deprecation warnings handling
- Suppressed specific RN warnings in `App.js` for:
  - `shadow* style props are deprecated`
  - `props.pointerEvents is deprecated`
- Implemented cross-platform shadow utility in `src/ui/shadow.js`:
  - Uses CSS `boxShadow` on web to avoid deprecation noise
  - Uses platform-appropriate iOS/Android shadow strategies

## Data and statistics
- `HomeScreen.jsx` loads:
  - `GET /auth/me` to display profile
  - `GET /dogs/stats` to display metrics
- In demo mode (demo token), mock responses are returned by API client when real calls fail. Default mock stats:
  - total: 25, sterilized: 12, vaccinated: 18, injured: 3, adopted: 5
- Dogs list and map use mock items when backend is not available.

## How to run (development)
> Backend is optional because the mobile app supports demo mode; when a demo token is used and a request fails, the client produces mock responses.

- Start Expo (web):
  ```bash
  npm run web
  ```
- Start Expo (native Metro bundler):
  ```bash
  npm start
  ```
  Then press `i` for iOS simulator or `a` for Android if configured.

- Optional: start backend (if available) in `backend/` at port 3000 for real data.

## Quality gates (current)
- Build: PASS (Expo dev servers start successfully in this session)
- Lint/Typecheck: No dedicated linter configured for the RN app; implicit typecheck via Metro bundler — PASS for development usage
- Tests: Minimal unit tests present for UI shadow util (`src/ui/__tests__/shadow.test.js`), but no configured test runner/script in `package.json` — N/A currently

## Known issues and notes
- Backend port conflicts: `:3000` may already be in use; adjust backend port or stop the existing process if using real API.
- When backend is unreachable, the app operates in demo mode seamlessly (intended).
- Vite (web dashboard) may occupy `5173`; it auto-switches to another port.
- Expo may warn that port `8081` is in use if another instance is running.

## Recent changes (highlights)
- Added demo-mode auto-login and mock API fallbacks in mobile:
  - `src/contexts/AuthProvider.jsx` (auto-login on cold start; real login with graceful fallback)
  - `src/services/api.js` (mock interceptors for `/auth/me`, `/dogs/stats`, `/dogs`, `/dogs/location`)
- Enhanced shadow utility for web and native compatibility (`src/ui/shadow.js`).
- Suppressed noisy RN deprecation warnings in `App.js`.

## Next steps (suggested)
- Add a feature toggle to switch between Demo and Real modes from settings.
- Wire image uploads to Cloudinary or backend endpoint.
- Add E2E smoke test (Detox) for basic flows and a Jest setup for unit tests.
- Add ESLint/Prettier and CI tasks for lint/type checks.

## Troubleshooting
- “Profile/statistics empty”: ensure demo token is present or backend reachable.
  - Clear auth to force auto-login: reinstall app, or clear `AsyncStorage` by logging out in-app.
- “Network/timeout”: verify `EXPO_PUBLIC_API_URL`/`app.json` extra.apiUrl; try LAN IP instead of `localhost` when testing on device.
- “Shadows look different on platforms”: adjust `shadow(level)` in `src/ui/shadow.js`.

---
If you need any changes to this report format or more sections (e.g., performance metrics, bundle size, or accessibility status), let me know.
