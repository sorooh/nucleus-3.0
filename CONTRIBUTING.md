# 🤝 Contributing to Nucleus 3.0

Thank you for your interest in contributing to Nucleus 3.0! This document provides guidelines and instructions for contributing to our unified AI system.

## 🌟 **Code of Conduct**

By participating in this project, you agree to abide by our commitment to providing a welcoming and inclusive environment for all contributors.

### 🎯 **Our Standards**

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🚀 **Getting Started**

### 📋 **Prerequisites**

Before contributing, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git** version control
- **TypeScript** knowledge
- **Docker** (for containerized development)

### 🔧 **Development Setup**

1. **Fork the Repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/nucleus-3.0.git
   cd nucleus-3.0
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize Database**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev:unified
   ```

---

## 🏗️ **Project Structure**

```
nucleus-3.0/
├── 🚀 apps/              # Applications
│   ├── empire-runner/    # Platform management
│   ├── ai-bridge/        # AI bridge services
│   └── client/           # Frontend application
├── 🔧 server/            # Backend services
├── 🧠 nucleus/           # Core AI engines
├── 💬 nicholas/          # Nicholas AI chat
├── 🔗 multibot-agents/   # Multi-bot system
├── 🛡️ src/              # Shared utilities
├── 🧪 tests/             # Test suites
├── 📚 docs/              # Documentation
├── 🐳 k8s/               # Kubernetes configs
└── 🔧 scripts/           # Build scripts
```

---

## 🛠️ **Types of Contributions**

### 🐛 **Bug Reports**

When filing a bug report, please include:

- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected behavior** vs actual behavior
- **Environment information** (OS, Node.js version, etc.)
- **Screenshots** or error logs (if applicable)

### ✨ **Feature Requests**

For new features:

- **Describe the problem** your feature would solve
- **Explain your proposed solution** in detail
- **Consider alternatives** you've explored
- **Provide examples** or mockups if relevant

### 🔧 **Code Contributions**

We welcome code contributions! Please:

1. **Check existing issues** before starting work
2. **Create an issue** for major features
3. **Follow our coding standards** (see below)
4. **Write tests** for your code
5. **Update documentation** as needed

---

## 📝 **Coding Standards**

### 🎯 **General Guidelines**

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Write **descriptive commit messages**
- Keep functions **small and focused**
- Add **JSDoc comments** for public APIs

### 🏗️ **Code Style**

```typescript
// ✅ Good: Clear interface with documentation
interface AIEngineConfig {
  /** The name of the AI engine */
  name: string;
  /** Configuration options for the engine */
  options: {
    model: string;
    temperature: number;
  };
}

// ✅ Good: Descriptive function with error handling
async function initializeAIEngine(config: AIEngineConfig): Promise<AIEngine> {
  try {
    const engine = new AIEngine(config);
    await engine.initialize();
    return engine;
  } catch (error) {
    logger.error('Failed to initialize AI engine', { error, config });
    throw new AIEngineError('Initialization failed', error);
  }
}
```

### 📁 **File Naming**

- Use **kebab-case** for file names: `ai-engine-manager.ts`
- Use **PascalCase** for classes: `AIEngineManager`
- Use **camelCase** for functions: `initializeEngine`
- Use **SCREAMING_SNAKE_CASE** for constants: `MAX_RETRY_ATTEMPTS`

---

## 🧪 **Testing**

### 🎯 **Test Requirements**

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve test coverage
- Tests should be deterministic and isolated

### 🏃 **Running Tests**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test:ai-engines
```

### 📝 **Writing Tests**

```typescript
describe('AIEngineManager', () => {
  let manager: AIEngineManager;

  beforeEach(() => {
    manager = new AIEngineManager();
  });

  it('should initialize all engines successfully', async () => {
    const configs = [
      { name: 'engine1', options: { model: 'gpt-4', temperature: 0.7 } }
    ];

    const engines = await manager.initializeEngines(configs);
    
    expect(engines).toHaveLength(1);
    expect(engines[0].name).toBe('engine1');
  });
});
```

---

## 📚 **Documentation**

### 📖 **Documentation Standards**

- Use **Markdown** for documentation
- Include **code examples** where helpful
- Keep documentation **up-to-date** with code changes
- Write in **clear, concise** English

### 📝 **Required Documentation**

- **README updates** for new features
- **API documentation** for public interfaces
- **Configuration guides** for new options
- **Troubleshooting notes** for known issues

---

## 🔄 **Pull Request Process**

### 📋 **Before Submitting**

1. **Update your fork** with the latest changes
2. **Run tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Update documentation** if needed
5. **Test your changes** thoroughly

### 📬 **Submitting a PR**

1. **Create a descriptive title**: `feat: Add AI engine load balancing`
2. **Fill out the PR template** completely
3. **Link related issues** using keywords
4. **Request review** from relevant maintainers
5. **Respond to feedback** promptly

### 📝 **PR Template**

```markdown
## 🎯 Description
Brief description of changes

## 🔗 Related Issues
Closes #123

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed

## 📚 Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Examples provided

## ✅ Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
```

---

## 🏷️ **Commit Convention**

We use **Conventional Commits** for consistent commit messages:

### 📝 **Format**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 🎯 **Types**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 📝 **Examples**
```bash
feat(ai-engine): add GPT-4 support
fix(nicholas): resolve chat history persistence
docs(readme): update installation instructions
test(federation): add unit tests for sync protocol
```

---

## 🌍 **Internationalization**

### 🇸🇦 **Arabic Support**

When contributing Arabic features:

- Use proper **RTL support**
- Test with **Arabic text**
- Follow **Arabic UI conventions**
- Include **Arabic documentation**

### 🌐 **Localization Guidelines**

- Use **i18n keys** instead of hardcoded strings
- Provide **English fallbacks**
- Test **bi-directional layouts**
- Consider **cultural context**

---

## 🔒 **Security**

### 🛡️ **Security Considerations**

- **Never commit** sensitive data (API keys, passwords)
- **Validate all inputs** in security-critical code
- **Use secure defaults** for configurations
- **Follow OWASP guidelines** for web security

### 🚨 **Reporting Security Issues**

Please report security vulnerabilities to: security@nucleus.ai

**Do not** create public issues for security vulnerabilities.

---

## 🎓 **Learning Resources**

### 📖 **Project Documentation**
- [Project Overview](PROJECT-OVERVIEW.md)
- [Architecture Guide](NUCLEUS-3.0-ARCHITECTURE.md)
- [API Documentation](docs/api/)

### 🛠️ **Technology Stack**
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Docker Documentation](https://docs.docker.com/)

---

## 🆘 **Getting Help**

### 💬 **Communication Channels**

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Email**: development@nucleus.ai

### 🕒 **Response Times**

We aim to respond to:
- **Critical bugs**: Within 24 hours
- **Feature requests**: Within 1 week
- **General questions**: Within 3 days

---

## 🏆 **Recognition**

### 🌟 **Contributors**

All contributors will be:
- **Listed** in our CONTRIBUTORS.md file
- **Mentioned** in release notes for significant contributions
- **Invited** to our contributor Discord server

### 🎖️ **Types of Recognition**

- **First-time contributor** badge
- **Regular contributor** status
- **Core contributor** privileges
- **Special mentions** in project updates

---

## 📄 **License**

By contributing to Nucleus 3.0, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 **Thank You**

Thank you for contributing to Nucleus 3.0! Your efforts help make this project better for everyone.

---

**Questions? Contact us at: contributors@nucleus.ai**

**Ready to contribute? Check out our [good first issues](https://github.com/sorooh/nucleus-3.0/labels/good%20first%20issue)!**