## Detailed scenarios

### CM-TC-001 Password policy: boundary + equivalence
- Type: Unit • Priority: High
- Preconditions: N/A
- Test Data: "Aa1!aaa" (too short), "AAAAAAA1!" (no lowercase), "aaaaaaa1!" (no uppercase), "Aaaaaaa!!" (no number), "Aaaaaaa11" (no special), valid "Strong@123"
- Steps: Call `validatePassword` with each input
- Expected: Specific errors for invalid inputs; no error for valid
- Automation: `backend/src/tests/passwordPolicy.test.ts`

### CM-TC-002 Encryption round‑trip integrity (AES‑256‑GCM)
- Type: Unit • Priority: High
- Preconditions: `FILE_ENCRYPTION_KEY` present (dev fallback OK)
- Test Data: Small text file buffer
- Steps: `encryptFile(input)`, then `decryptToStream(meta)` to output; compare bytes
- Expected: Decrypted bytes equal original
- Automation: `backend/src/tests/encryption.test.ts`

### CM-TC-003 Auth session: refresh rotation
- Type: Integration • Priority: High
- Preconditions: User registered + email verified
- Steps: `POST /login` → get `refreshToken`; `POST /refresh` with token → new token pair
- Expected: New `refreshToken` differs from old
- Automation: `backend/src/tests/auth.session.test.ts`

### CM-TC-004 Auth session: logout revokes refresh token
- Type: Integration • Priority: High
- Preconditions: Logged-in user with valid `refreshToken`
- Steps: `POST /logout` with token; then `POST /refresh` with same token
- Expected: 401 on refresh
- Automation: `backend/src/tests/auth.session.test.ts`

### CM-TC-005 Submissions: upload → list versions → preview
- Type: Integration • Priority: High
- Preconditions: Logged-in student; project exists with student as member
- Test Data: Small PDF file
- Steps: `POST /student/submissions/upload` (multipart), `GET /student/submissions/versions`, `GET /student/submissions/:id/versions/1/preview`
- Expected: Upload 201 with id/version; versions contains v1; preview 200 inline, decrypts on the fly
- Automation: `backend/src/tests/submissions.integration.test.ts`

### CM-TC-006 Submissions: restore previous version
- Type: Integration • Priority: Medium
- Preconditions: Student has v1 uploaded
- Steps: `POST /student/submissions/:id/versions/1/restore` → `GET` versions list
- Expected: Restore returns v2; versions become [1, 2]
- Automation: `backend/src/tests/submissions.authz_restore.test.ts`

### CM-TC-007 Submissions: cross-student download denied
- Type: Integration • Priority: High
- Preconditions: Student A uploaded; Student B is a different user
- Steps: Student B `GET /student/submissions/:id/versions/1/download`
- Expected: 403 Not authorized
- Automation: `backend/src/tests/submissions.authz_restore.test.ts`

### CM-TC-008 Admin-only route requires authentication
- Type: Security • Priority: High
- Steps: `GET /api/v1/auth/faculty/requests` without auth
- Expected: 401 Unauthorized
- Automation: `backend/src/tests/security.authz.test.ts`

### CM-TC-009 Admin-only route rejects student
- Type: Security • Priority: High
- Preconditions: Student logged in
- Steps: `GET /api/v1/auth/faculty/requests` with student token
- Expected: 403 Forbidden
- Automation: `backend/src/tests/security.authz.test.ts`

### CM-TC-010 /healthz response shape stable
- Type: Regression • Priority: Medium
- Steps: `GET /healthz`
- Expected: `{ success: true, data: { status: 'ok', timestamp: string } }`
- Automation: `backend/src/tests/regression.snapshot.test.ts`

### CM-TC-011 Unauthorized error shape stable
- Type: Regression • Priority: Medium
- Steps: `GET /student/submissions/versions` (no auth)
- Expected: Response has top-level keys `['error', 'success']`
- Automation: `backend/src/tests/regression.snapshot.test.ts`

### CM-TC-012 /healthz parallel performance smoke
- Type: Performance • Priority: Low
- Steps: Fire 15 parallel `GET /healthz`
- Expected: All 200; total < 3s
- Automation: `backend/src/tests/performance.smoke.test.ts`

### CM-TC-013 Student acceptance flow
- Type: Acceptance • Priority: High
- Steps: Register → verify → login → create project → upload → complete milestone → preview → download
- Expected: All operations succeed; preview inline; download attachment
- Automation: `backend/src/tests/system.acceptance.api.test.ts`

### CM-TC-014 Login page renders (Playwright)
- Type: E2E • Priority: Medium
- Preconditions: Next build; server running
- Steps: Open `/login`; assert email/password fields and login button visible
- Expected: Elements visible and actionable
- Automation: `frontend/e2e/login.spec.ts`

