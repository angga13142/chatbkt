# AI Agent Setup Guide 🤖

## Quick Start

### 1. Enable GitHub Actions

The AI agent runs automatically on:

- Every Pull Request (full review)
- Every push to `main` (full test suite)
- Daily at midnight (health check)

**No additional setup needed!** The workflows are in `.github/workflows/`.

### 2. Local Testing

Before pushing code, test locally:

```bash
# Run agent checks locally
npm run agent:test

# Or manually
bash scripts/test-agent.sh
```

### 3. NPM Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm start               # Production start

# Testing
npm test                # Basic tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:all        # All tests
npm run test:coverage   # With coverage report
npm run test:watch      # Watch mode

# Code Quality
npm run lint            # Check code style
npm run lint:fix        # Auto-fix issues
npm run format          # Format code
npm run format:check    # Check formatting

# Security
npm run security:audit  # Check vulnerabilities
npm run security:fix    # Auto-fix vulnerabilities

# Analysis
npm run check:circular  # Find circular dependencies
npm run check:size      # Check file sizes
npm run analyze:complexity # Complexity report
```

## Agent Features

### 🔍 Quick Scan (< 2 min)

- ✅ Linter checks
- ✅ Secret detection
- ✅ File size validation (max 700 lines)
- ✅ Circular dependency check

### 🧐 Deep Review (5-10 min)

- ✅ Code complexity analysis
- ✅ Unused dependency detection
- ✅ JSDoc coverage check
- ✅ Naming convention validation

### 🧪 Testing Suite (10-20 min)

- ✅ Unit tests (Node 18, 20)
- ✅ Integration tests
- ✅ Coverage reporting
- ✅ Codecov integration

### 🔒 Security Audit (5-10 min)

- ✅ NPM vulnerability scan
- ✅ Secret scanning (TruffleHog)
- ✅ Security pattern checks
- ✅ Dependency audit

### 🐛 Bug Detection (5-10 min)

- ✅ Unawaited promise detection
- ✅ Missing error handling
- ✅ Memory leak patterns
- ✅ ESLint static analysis

### 📊 Performance Analysis

- ✅ Bundle size monitoring
- ✅ Large file detection

### 📋 Automated Reporting

- ✅ PR comments with status
- ✅ Daily health reports
- ✅ Issue creation for critical problems

## PR Review Process

When you create a PR, the agent automatically:

1. **Quick Scan** - Checks basics (2 min)
2. **Deep Review** - Analyzes quality (5 min)
3. **Testing** - Runs all tests (10 min)
4. **Security** - Scans vulnerabilities (5 min)
5. **Bug Detection** - Finds patterns (5 min)
6. **Reports** - Comments on PR with results

**Total time: ~30 minutes**

## Agent Commands

Comment on PR to trigger specific checks:

```
@agent review       - Full code review
@agent test         - Run all tests
@agent security     - Security audit
@agent bugs         - Bug detection
@agent performance  - Performance check
@agent fix          - Auto-fix issues
```

_(Note: Manual commands require GitHub Copilot integration)_

## Configuration

### ESLint (.eslintrc.js)

```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "no-unused-vars": "warn",
    "no-console": "off",
    "max-lines": ["error", { max: 700 }],
    complexity: ["warn", 10],
  },
};
```

### Prettier (.prettierrc)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### Jest (jest.config.js)

```javascript
module.exports = {
  testEnvironment: "node",
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
};
```

## Daily Health Check

Runs at midnight UTC, checks:

- Total lines of code
- Average file size
- TODOs/FIXMEs count
- Test file count
- Code trends (30 days)

Creates issue if:

- Health grade is D
- TODOs exceed 20
- Average file size > 700 lines

## Thresholds

| Metric         | Target      | Warning | Critical |
| -------------- | ----------- | ------- | -------- |
| File Size      | < 300 lines | 300-700 | > 700    |
| Test Coverage  | > 80%       | 70-80%  | < 70%    |
| Complexity     | < 5         | 5-10    | > 10     |
| Security Score | A           | B-C     | D-F      |
| Lint Errors    | 0           | 1-5     | > 5      |

## Troubleshooting

### "Agent checks failed"

1. Run `npm run agent:test` locally
2. Fix errors shown
3. Commit and push again

### "File too large"

1. Check file with `npm run check:size`
2. Split file into smaller modules
3. Follow modular architecture in `docs/MODULARIZATION.md`

### "Tests failing"

1. Run `npm test` locally
2. Fix failing tests
3. Ensure coverage >= 70%

### "Security vulnerabilities"

1. Run `npm audit`
2. Run `npm audit fix` if safe
3. Update dependencies manually if needed

## Best Practices

1. **Before committing:**

   ```bash
   npm run agent:test
   ```

2. **Before pushing:**

   ```bash
   npm run lint:fix
   npm run format
   npm test
   ```

3. **When creating PR:**

   - Write clear description
   - Link related issues
   - Wait for agent review
   - Fix any issues found

4. **After PR merged:**
   - Delete feature branch
   - Update local main
   - Celebrate! 🎉

## Support

- **Documentation:** `.github/copilot-agent.md`
- **Issues:** GitHub Issues
- **Questions:** Ask in PR comments

---

**Happy coding with your AI guardian! 🤖✨**
