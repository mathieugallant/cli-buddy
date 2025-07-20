# Development Practices

## AI-Assisted Development
This project is built using AI agents and serves as a tool for AI-assisted development workflows. All development should follow practices that work well with AI agents and maintain code quality.

## Test-Driven Development (TDD)
**MANDATORY**: All functionality additions and maintenance must follow strict TDD practices.

### TDD Workflow
1. **Write Test First**: Create a failing test that describes the desired functionality
2. **Verify Failure**: Run the test to confirm it fails for the expected reason
3. **Implement Code**: Write minimal code to make the test pass
4. **Verify Success**: Run the test to confirm it passes
5. **Refactor**: Clean up code while keeping tests green

### Testing Requirements
- Every new feature must have corresponding tests
- Bug fixes must include regression tests
- Tests must be written before implementation code
- All tests must be verified to fail before implementation
- All tests must be verified to pass after implementation

## AI Agent Guidelines
When working with AI agents on this project:

### Code Quality
- Always run tests after code changes
- Verify test results and interpret failures
- Ensure code follows existing patterns and conventions
- Maintain component isolation and clear interfaces

### Documentation
- Update relevant documentation when adding features
- Keep steering documents current with project evolution
- Document AI agent integration patterns and best practices

### Validation Steps
1. Write failing test
2. Implement feature
3. Verify test passes
4. Run full test suite
5. Check code coverage
6. Update documentation if needed

## Testing Commands
```bash
npm run test         # Run all tests
npm run test:ui      # Interactive test runner
npm run test:coverage # Coverage report
```

## Quality Gates
- All tests must pass before merging changes
- Code coverage should be maintained or improved
- No console errors or warnings in test output
- Components must be testable in isolation