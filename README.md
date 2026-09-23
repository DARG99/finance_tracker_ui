# Finance Tracker

## PWA and iPhone login

Build with `npm run build` and deploy `dist` using the provided nginx configuration.
Serve the public site over HTTPS (TLS can terminate at your reverse proxy); service
workers require a secure context. The worker is enabled only in production builds.

On iPhone, open the site in Safari, choose Share → Add to Home Screen, and open it
from the new Finance icon. You may need to log in once in the installed app because
Safari and the Home Screen app can have separate storage.

The access token stays in local storage across app restarts. Opening `/` or `/login`
with a saved, unexpired session redirects to `/dashboard`. Session checks also run
when returning from the background. JWT expiry is checked locally; the API remains
authoritative and a 401 clears the matching session. Network errors do not log you
out. Opaque tokens are checked by the API. This frontend has no refresh-token API:
expired tokens require a new login. Browser-cleared storage also requires login.

The service worker provides an offline screen. Financial data and API responses
are never cached; viewing or changing finances requires an internet connection.

## Verification

- `npm run build`
- `npm run lint`
- `npm test`
- On HTTPS or localhost, check the manifest and service worker in browser devtools.
- Log in, reopen `/login` and `/`, and verify both redirect to the dashboard.
- Background and reopen Safari and the installed app; verify the saved session.
- Check expired tokens and API 401 responses return to login; network failures
  should keep the token. Test airplane mode after the worker has installed.
