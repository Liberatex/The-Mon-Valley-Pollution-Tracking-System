# Development Guide

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ (frontend) and 22+ (backend)
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Initial Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd "MV Pollution Tracking System"

# Frontend setup
cd frontend
npm install

# Backend setup
cd ../functions
npm install
```

2. **Firebase Configuration**
```bash
# Login to Firebase
firebase login

# Initialize Firebase (select your project)
firebase init

# Select the following:
# - Hosting
# - Functions
# - Firestore
# - Emulators (optional for local development)
```

3. **Environment Variables**
Create `.env` files in both directories with your Firebase configuration.

## 🧪 Testing Strategy

### Frontend Testing
- **Unit Tests**: Component testing with Jest and React Testing Library
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full user journey testing (future)

### Backend Testing
- **Unit Tests**: Function logic testing
- **Integration Tests**: Firebase Functions testing with emulators
- **API Tests**: Endpoint testing

### Test Commands
```bash
# Frontend
cd frontend
npm test                    # Run tests in watch mode
npm test -- --watchAll=false # Run tests once
npm test -- --coverage      # Run with coverage

# Backend
cd functions
npm test                    # Run all tests
npm test -- --testPathPatterns=simple.test.ts # Run specific tests
```

## 🔧 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# Write tests
# Update documentation

# Commit with conventional commits
git commit -m "feat: add new sensor data visualization"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Code Quality
- **Linting**: ESLint runs automatically in CI/CD
- **Formatting**: Prettier for consistent code style
- **Type Safety**: TypeScript for compile-time checks

### 3. Testing Checklist
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] No linting errors
- [ ] TypeScript compiles without errors
- [ ] Security audit passes

## 🚀 Local Development

### Frontend Development
```bash
cd frontend
npm start
```
- Runs on `http://localhost:3000`
- Hot reload enabled
- Proxy configured for API calls

### Backend Development
```bash
cd functions
npm run build:watch  # Watch for changes
npm run serve        # Start emulator
```

### Firebase Emulators
```bash
firebase emulators:start
```
- Functions: `http://localhost:5001`
- Firestore: `http://localhost:8080`
- Hosting: `http://localhost:5000`

## 📊 CI/CD Pipeline

### Automated Checks
1. **Tests**: Frontend and backend tests
2. **Linting**: ESLint checks
3. **Security**: npm audit
4. **Build**: Production build verification
5. **Deploy**: Automatic deployment to staging/production

### Manual Deployment
```bash
# Deploy to staging
firebase deploy --only hosting:staging
firebase deploy --only functions

# Deploy to production
firebase deploy --only hosting
firebase deploy --only functions
```

## 🐛 Debugging

### Frontend Debugging
- React Developer Tools
- Browser DevTools
- Console logging
- Error boundaries

### Backend Debugging
- Firebase Functions logs
- Local emulator debugging
- Error handling and logging

### Common Issues

#### React Hooks Errors
- Ensure hooks are called at the top level
- Check for multiple React versions
- Verify test environment setup

#### Firebase Configuration
- Check environment variables
- Verify Firebase project selection
- Ensure proper authentication

#### TypeScript Errors
- Check type definitions
- Verify import/export statements
- Update TypeScript configuration if needed

## 📝 Documentation

### Code Documentation
- JSDoc comments for functions
- README files for components
- API documentation
- Architecture diagrams

### Commit Messages
Use conventional commits:
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: test additions/changes
chore: maintenance tasks
```

## 🔒 Security

### Best Practices
- Never commit API keys
- Use environment variables
- Regular security audits
- Input validation
- Error handling

### Security Checklist
- [ ] No hardcoded secrets
- [ ] Input sanitization
- [ ] Proper authentication
- [ ] HTTPS only
- [ ] Regular dependency updates

## 📈 Performance

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

### Backend Optimization
- Efficient Firestore queries
- Batch operations
- Caching strategies
- Function optimization

## 🤝 Contributing

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit PR with description
6. Address review comments
7. Merge after approval

### Code Review Guidelines
- Check for security issues
- Verify test coverage
- Review code quality
- Ensure documentation updates
- Performance considerations

## 🆘 Getting Help

- Check existing issues
- Review documentation
- Ask in discussions
- Create detailed bug reports

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [GitHub Actions](https://docs.github.com/en/actions) 