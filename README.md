# Global Weather Service (React)

A full React migration of the original Weather Service project, preserving all existing client and admin functionality.

## What This App Includes

### Client Portal

- Landing page with features and pricing sections
- Registration flow by plan (GO, PRO, MAX)
- OTP verification flow
- Manage subscription dashboard
- Profile update
- Plan update
- Unsubscribe and account deletion
- Contact form submission
- Light and dark theme toggle

### Admin Portal

- PIN-based lock screen (current PIN: 1234)
- Dashboard stats
- Weather report CRUD (create, edit, delete)
- Weather search by ID and pagination
- Client list management (active and inactive)
- Client activate and deactivate action
- Audit log view with pagination
- Responsive sidebar and theme toggle

## Tech Stack

- React 18
- Vite
- React Router
- Bootstrap 5
- Font Awesome (CDN)

## Project Structure

```text
WeatherService/
  public/
    config.js
  src/
    pages/
      ClientPortal.jsx
      AdminPortal.jsx
    styles/
      global.css
      client.css
      admin.css
    App.jsx
    main.jsx
  index.html
  vercel.json
  package.json
```

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (recommended)
- Running backend API for weather/client/admin operations

## Configuration

Update frontend API base URL in:

- public/config.js

Example:

```js
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:8080",
};
```

## Install

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

Then open the local Vite URL shown in terminal.

## Build for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Routes

- / : Client Portal
- /admin : Admin Portal

## Deployment Notes (Vercel)

This project uses rewrites in vercel.json for:

- Proxying API requests from /api/\* to the backend URL
- SPA fallback rewrite to /index.html for client-side routes like /admin

If your backend host changes, update vercel.json accordingly.

## Important Notes

- Admin unlock PIN is currently set to 1234 in frontend logic.
- Contact form uses Formspree endpoint already wired in client page.
- Theme preference in client portal is stored in browser localStorage.

## Scripts

- npm run dev: Start Vite dev server
- npm run build: Build app to dist
- npm run preview: Preview built app locally

## Migration Summary

- Legacy static pages were converted into React component-based routes.
- Existing behavior and API flows were preserved.
- Styling was split into reusable CSS files under src/styles.
