# Customer account management

This branch adds a customer account center, account security controls, account-synchronized wishlist storage, and richer customer records in the existing Admin customer list. The current storefront shell and Admin navigation are retained.

## Email delivery

Email verification and email-change confirmation use the existing Resend integration. Configure these backend-only variables:

```dotenv
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Computer Hardware Store <no-reply@example.ir>
APP_URL=https://store.example.ir
```

`APP_URL` is the public frontend origin used to create verification links. Keep these values server-side. If the email provider is not configured, signup still succeeds; the customer can request an email verification link later from the account center, which will return a clear configuration error until delivery is enabled.

## Session architecture

- Each successful signup/login creates a separate MongoDB `AccountSession` record with a random session identifier, device/user-agent metadata, IP address, last-use timestamp, and seven-day expiry.
- Access and refresh JWTs carry the session identifier. Redis refresh-token keys are isolated per user and session, so signing in on another device no longer overwrites the first device's refresh token.
- Refresh rotation remains atomic and is scoped to that session.
- Protected requests verify that the referenced session remains active. Revoking a session therefore blocks subsequent requests immediately, not only after the access token expires.
- Session records expire through a MongoDB TTL index. Old tokens without a session identifier remain supported for their original expiry window; new logins use the multi-session format.
- Password changes revoke other devices while keeping the current device signed in. Password reset, account deactivation, and account-deletion requests revoke all sessions.

## Customer API

All routes are mounted below `/api/account`. Except for the two email-token confirmation endpoints, they require the existing HTTP-only cookie authentication.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/overview` | Account summary, recent order data, support counts |
| PATCH | `/profile` | Update display name and primary contact phone |
| PATCH | `/password` | Change password after verifying the current password |
| POST | `/email/verification` | Send a one-time email-verification link |
| POST | `/verify-email` | Confirm an email-verification token |
| POST | `/email/change` | Request an email change after password confirmation |
| POST | `/confirm-email-change` | Confirm the new email address |
| GET | `/sessions` | List active devices |
| DELETE | `/sessions/:sessionId` | Revoke one device session |
| GET | `/notifications` | View security/login history |
| PATCH | `/notifications/:id/read` | Mark a security notification read |
| GET/PATCH | `/preferences` | Read or update communication preferences |
| GET/POST/DELETE | `/wishlist` | Read, add, or clear the account wishlist |
| DELETE | `/wishlist/:productId` | Remove one wishlist product |
| GET | `/export` | Download a JSON account-data export |
| POST | `/deletion-request` | Request account deactivation/deletion review |
| POST | `/two-factor/setup` | Generate an authenticator secret |
| POST | `/two-factor/enable` | Enable TOTP after verifying a code |
| POST | `/two-factor/disable` | Disable TOTP after password and code verification |

Existing order-history and support/return/refund routes remain the source of truth for order and service-case records. The account center links to those existing experiences rather than duplicating them.

## Account data and retention

- Wishlist product IDs are stored on the user document. Existing guest wishlist data is merged into the account on sign-in and remains available on other devices.
- Communication preferences are stored per account. Email delivery integrations should check the relevant preference before sending non-essential marketing or order messages.
- Data export includes profile, order, service-case, and security-notification data, while excluding password hashes, token hashes, and the authenticator secret.
- A deletion request immediately disables sign-in and revokes sessions. It records a review request; it does not hard-delete paid order/accounting records. Define the retention schedule and an operator-approved anonymization process before production launch.
- The primary phone field is editable but is not marked verified. SMS verification is not included in this implementation.

## Two-factor authentication

Optional TOTP uses the standard 30-second, six-digit SHA-1 authenticator format supported by common authenticator applications. The user must verify a generated code before enabling it; login then requires the current authenticator code. Keep the authenticator secret private and provide a separately designed recovery-code process before requiring 2FA for all accounts or administrators.

## Rollout checks

1. Configure Resend and verify delivery on the production frontend domain.
2. Confirm MongoDB TTL index creation for `AccountSession.expiresAt`.
3. Test two simultaneous logins in separate browsers and verify both sessions remain active.
4. Revoke one session and confirm that device can no longer access protected API routes or refresh.
5. Test email verification and email-change links, including expired and replayed tokens.
6. Test password change, password reset, account deactivation, deletion request, and TOTP login.
7. Confirm guest wishlist merging and cross-device synchronization.
8. Verify JSON export contents and the store's legal/accounting retention policy before enabling deletion processing.
