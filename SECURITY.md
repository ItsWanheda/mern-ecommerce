
# Security Policy

## Supported Versions

Security updates are prioritized for the latest actively maintained version of the project.

| Version | Supported |
|---|---|
| Latest development version | Yes |
| Older releases | Best effort |
| Unmaintained versions | No |

## Reporting a Vulnerability

We take security issues seriously.

If you discover a potential security vulnerability, please report it privately.

**Do not disclose security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Preferred reporting method:

1. Open the repository on GitHub.
2. Navigate to the **Security** tab.
3. Check whether **Private vulnerability reporting** is available.
4. If enabled, submit a private vulnerability report.

If private vulnerability reporting is unavailable, contact the project maintainers privately through GitHub.

Please do not publish exploit details before maintainers have had a reasonable opportunity to investigate.

## What to Include

When reporting a vulnerability, include:

- A clear description of the issue.
- The affected component or endpoint.
- Steps to reproduce the vulnerability.
- Potential security impact.
- Proof of concept, if safe to provide.
- Suggested mitigation, if known.

Please avoid including real user credentials, private customer data, production secrets, or other sensitive information.

## Scope

Security reports may include vulnerabilities involving:

- Authentication and authorization.
- JWT and refresh token handling.
- Session management.
- Account management and access control.
- SQL injection and database security.
- API input validation.
- Cross-Site Scripting (XSS).
- Cross-Site Request Forgery (CSRF).
- File uploads and media processing.
- Payment processing and payment verification.
- Sensitive information exposure.
- Dependency vulnerabilities.
- Administrative functionality.
- Rate limiting and abuse prevention.

## Response Process

After receiving a report, maintainers will make reasonable efforts to:

1. Acknowledge receipt.
2. Review and validate the reported issue.
3. Determine its severity and impact.
4. Develop and test a fix.
5. Coordinate disclosure when appropriate.
6. Publish a security update when ready.

Response and remediation times may vary depending on severity and complexity.

## Responsible Disclosure

Please:

- Give maintainers reasonable time to investigate and resolve the issue.
- Avoid accessing, modifying, or deleting other people's data.
- Do not disrupt production services.
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue.
- Do not publicly disclose unpatched vulnerabilities.

## Security Best Practices

Contributors must never:

- Commit API keys, passwords, or authentication tokens.
- Include real customer information in tests or examples.
- Disable authentication or authorization checks to bypass functionality.
- Introduce unsafe database queries.
- Expose sensitive information through error messages.
- Store passwords in plaintext.
- Bypass payment verification or transaction integrity checks.

## Dependencies

Dependencies should be reviewed and updated regularly.

Contributors are encouraged to report known vulnerable dependencies and propose safe upgrades.

## Thank You

We appreciate responsible security research and the efforts of everyone helping keep this project secure.
