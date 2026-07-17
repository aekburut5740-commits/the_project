# API connection changes

- Uses the supplied `lib/api.ts` / `lib/auth.ts` structure, with fixes for token storage and FormData.
- Added `lib/backend.ts` as a typed central wrapper around routes in `backend/index.ts`.
- Connected login, account creation, dashboard summary, projects, project detail, milestones, notifications, and Git Pulse.
- Existing UI and styling files were retained.
- Admin project updates follow the backend contract: status/progress/member routes are used separately.

Set the frontend environment variable when the backend is not on localhost:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```
