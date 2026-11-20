
# Contributing to MERN E-Commerce

Thank you for your interest in contributing!

We welcome bug fixes, improvements, documentation updates, performance optimizations, security enhancements, and new features.

Please read this document before submitting contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Code Guidelines](#code-guidelines)
- [Database Guidelines](#database-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Security Issues](#security-issues)

## Getting Started

1. Fork the repository.
2. Clone your fork.
3. Install the required dependencies.
4. Create a dedicated branch.
5. Make your changes.
6. Run relevant checks.
7. Submit a pull request.

```bash
git clone https://github.com/ItsWanheda/mern-ecommerce.git
cd mern-ecommerce
```

Install dependencies:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

Check the project README for environment configuration and additional setup instructions.

## Development Environment

The project consists of:

- Frontend: React / Next.js
- Backend: Node.js / Express
- Database: PostgreSQL
- ORM: Prisma
- Cache: Redis
- Authentication: JWT-based authentication
- Payment integration: Zarinpal

Use the environment examples provided by the project.

Never commit actual `.env` files, passwords, API keys, tokens, or other secrets.

## Branching Strategy

Use descriptive branch names.

Recommended prefixes:

| Prefix | Purpose |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Code restructuring |
| `test/` | Tests |
| `perf/` | Performance improvements |
| `security/` | Security improvements |
| `chore/` | Maintenance |

Examples:

```bash
git checkout -b feat/product-reviews
git checkout -b fix/auth-refresh
git checkout -b docs/api-documentation
git checkout -b security/session-validation
```

Do not work directly on `master`.

Submit changes through pull requests so they can be reviewed before merging.

## Commit Guidelines

Use clear, descriptive commit messages.

Recommended format:

```text
type: short description
```

Examples:

```text
feat: add product review management
fix: resolve refresh token validation
docs: update installation instructions
refactor: simplify product query handling
test: add payment reconciliation tests
security: strengthen authentication validation
```

Keep commits focused on a single logical change whenever possible.

## Code Guidelines

- Follow the existing project architecture.
- Prefer readable and maintainable code.
- Avoid unnecessary dependencies.
- Avoid unrelated file modifications.
- Handle errors explicitly.
- Validate and sanitize user input.
- Preserve existing API contracts unless a change is intentional and documented.
- Avoid exposing sensitive information in logs or API responses.
- Keep frontend and backend behavior consistent.

## Database Guidelines

PostgreSQL and Prisma are the primary database technologies.

When modifying the database:

- Update `backend/prisma/schema.prisma`.
- Create appropriate Prisma migrations.
- Preserve existing API identifier compatibility.
- Consider foreign keys and relational integrity.
- Use transactions for operations that require atomicity.
- Avoid destructive migrations without a documented reason.
- Update relevant tests and documentation.

Never apply destructive database changes to production without explicit approval and a verified backup.

## Testing

Run the checks relevant to your changes.

Backend:

```bash
npm run build --prefix backend
npm test --prefix backend
```

Frontend:

```bash
npm test --prefix frontend
npm run build --prefix frontend
```

Database validation:

```bash
npm run db:validate --prefix backend
npm run db:generate --prefix backend
```

Some integration tests require a configured PostgreSQL database.

Document any tests that could not be executed and explain why.

## Pull Request Process

Before submitting a pull request:

- Ensure your branch is up to date with its target branch.
- Review your own changes.
- Remove temporary debugging code.
- Check for accidentally committed secrets.
- Update documentation where necessary.
- Include relevant tests.
- Describe any database or API changes.

A pull request should include:

1. A clear title.
2. A summary of changes.
3. The reason for the changes.
4. Testing performed.
5. Screenshots for relevant UI changes.
6. Known limitations or migration considerations.

Do not merge your own changes without the required review and project approval.

## Reporting Bugs

Please use the GitHub Bug Report issue template.

Include:

- A clear description.
- Steps to reproduce.
- Expected behavior.
- Actual behavior.
- Environment details.
- Relevant logs or screenshots.

Remove passwords, tokens, personal information, and other sensitive data before sharing logs.

## Security Issues

Please do not report security vulnerabilities through public GitHub issues.

Follow the instructions in [SECURITY.md](SECURITY.md).

## Code of Conduct

By participating in this project, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Thank You

Every contribution matters.

Thank you for helping improve this project!
