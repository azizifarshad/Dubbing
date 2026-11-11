# Contributing Guidelines

Thank you for your interest in contributing to the **Dubbing** software product. Because this is a private, proprietary software repository with enterprise distribution and licensing requirements, all contributions must strictly adhere to the following workflow and standards.

---

## Code of Conduct & Confidentiality

1. **Strict Confidentiality:** The source code, internal APIs, cryptographic licensing schemes, and update mechanisms of this repository are private and proprietary. Never expose, fork publicly, or leak code, test keys, or customer details.
2. **Zero Credentials in Git:** Never commit secrets, `.env` files, API keys, private keys (`.pem`), or client activation requests/licenses (`.dbreq`, `.dblic`).
3. **No Unapproved Binaries:** Never commit compiled executables (`.exe`, `.msi`), Python runtimes, or heavy model weights into Git history.

---

## Development Workflow

### 1. Branch Strategy
- `main`: Protected production branch. All code must pass CI/CD checks before merging.
- Feature branches: Use descriptive prefixes:
  - `feat/feature-name`
  - `fix/bug-fix-name`
  - `security/patch-name`
  - `docs/documentation-update`

### 2. Local Setup
```bash
# Clone the private repository
git clone https://github.com/azizifarshad/Dubbing.git
cd Dubbing

# Install Node dependencies
npm install

# Copy environment template
cp .env.example .env

# Run development server
npm run dev
```

### 3. Verification & Testing
Before submitting a pull request, run all verification suites locally:
```bash
# Run TypeScript compilation check
npm run lint

# Run full automated test suite
npm test

# Build production assets
npm run build
```

---

## Pull Request Checklist

Every pull request must satisfy:
- [ ] Comprehensive commit messages following conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
- [ ] All 9 automated test suites pass without warnings or regressions.
- [ ] No secrets, tokens, or binary files included in changes.
- [ ] Code formatted with project standards and TypeScript strict typing preserved.
- [ ] Both English and Persian documentation updated where UI or features change.
- [ ] Auto-update and offline licensing compatibility verified.

---

## Code Ownership & Approvals
Pull requests require review and sign-off from the lead maintainer:
- **Farshad Azizi** (`@azizifarshad`)
