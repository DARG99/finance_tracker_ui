# Finance Tracker

## PWA and iPhone login

Build with `npm run build` and deploy `dist` using the provided nginx configuration.
Serve the public site over HTTPS (TLS can terminate at your reverse proxy); service
workers require a secure context. The worker is enabled only in production builds.

On iPhone, open the site in Safari, choose Share → Add to Home Screen, and open it
from the new Finance icon. You may need to log in once in the installed app because
Safari and the Home Screen app can have separate storage.

Access and refresh tokens are saved together in one local-storage record across
app restarts. Existing access-only logins require signing in once after upgrading.
Opening `/` or `/login` with a renewable session redirects to `/dashboard`.

The app renews on startup, shortly before access-token expiry, and when returning
from the background. API 401 responses renew and retry the original request once.
Refresh 401 responses require sign-in; network/server failures keep the credentials
and show a retry option. Data loads again after session restoration. Sign out calls
the logout endpoint with the current refresh token and clears local credentials,
including when the logout request fails.

Deploy alongside the backend refresh-session migration and endpoints. The login
and refresh responses must include `token`, `expiresIn`, `refreshToken`, and
`refreshExpiresIn`, with durations in milliseconds. Web Locks serialize login,
refresh, and logout across tabs; use a current browser over HTTPS or localhost.
Both rotated credentials are published atomically before waiting tabs continue.
This JSON-token API sets no HttpOnly cookie, so credentials remain accessible to
JavaScript in local storage. Never log tokens or include them in URLs. A future
backend-for-frontend could move refresh credentials into an HttpOnly cookie.

The service worker provides an offline screen. Financial data and API responses
are never cached; viewing or changing finances requires an internet connection.

## Verification

- `npm run build`
- `npm run lint`
- `npm test`
- On HTTPS or localhost, check the manifest and service worker in browser devtools.
- Log in, reopen `/login` and `/`, and verify both redirect to the dashboard.
- Background and reopen Safari and the installed app; verify the saved session.
- Check expired/missing access tokens and API 401 responses renew the session.
- Open two tabs and verify simultaneous renewal sends only one refresh request.
- Check refresh 401 responses return to login and network/server failures allow
  retry without deleting credentials. Test airplane mode after worker installation.
- Sign out and verify the current refresh token is sent to `/auth/logout`.
