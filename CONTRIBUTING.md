# Contributing to the Project

First off, thank you for considering contributing to this project! Every contribution is valuable.

This document provides guidelines to help you through the process of contributing.

## Development Workflow

1.  **Create a Branch**: Start by creating a new branch for your feature or bug fix from the `main` branch.
    ```sh
    git checkout -b feat/my-new-feature
    ```
2.  **Write Code**: Make your changes. Remember to follow the Test-Driven Development approach outlined below.
3.  **Commit Your Changes**: Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps us automate releases and makes the commit history easier to read.
    -   `feat:` for a new feature.
    -   `fix:` for a bug fix.
    -   `docs:` for documentation changes.
    -   `style:` for code style changes (formatting, etc.).
    -   `refactor:` for code changes that neither fix a bug nor add a feature.
    -   `test:` for adding or refactoring tests.
    -   `chore:` for build process or auxiliary tool changes.

    Example:
    ```sh
    git commit -m "feat(enrichment): add salesforce as a data source"
    ```

## Testing Philosophy

We follow a strict Test-Driven Development (TDD) approach. This means that **every new feature or bug fix must start with a failing test**.

### The Red-Green-Refactor Cycle

1.  **RED**: Write a failing test that describes the desired behavior or reproduces the bug.
2.  **GREEN**: Write the simplest possible production code to make the test pass.
3.  **REFACTOR**: Clean up and optimize both the production and test code while ensuring all tests still pass.

### Test Structure: The AAA Pattern

To ensure clarity and consistency, all unit tests should follow the **Arrange, Act, Assert** pattern.

-   **Arrange**: Set up the test. This includes creating mocks, instantiating classes, and preparing any data needed for the test case.
-   **Act**: Execute the single unit of work (method or function) being tested.
-   **Assert**: Verify the outcome. Check that the results match expectations and that mocks were called correctly.

**Example:**
```typescript
describe('MyService', () => {
  it('should do something correctly', () => {
    // Arrange
    const mockDependency = { doWork: jest.fn().mockReturnValue('expected') };
    const myService = new MyService(mockDependency);

    // Act
    const result = myService.performAction();

    // Assert
    expect(result).toBe('expected');
    expect(mockDependency.doWork).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking Strategy

-   **Mock External Boundaries**: We mock dependencies at the boundaries of our system. This includes external APIs (using `axios` mocks), database repositories, and access to the file system. This keeps our tests fast and reliable.
-   **Don't Mock Internal Implementation**: Avoid mocking classes that are part of the same feature or logical unit. If a test is hard to write because of complex internal dependencies, it's a sign that the code itself should be refactored.

## Code Style

-   **Prettier**: The project uses Prettier to ensure consistent code formatting. Please run the formatter before committing your changes.
-   **ESLint**: We use ESLint to catch common code quality issues. Ensure your code does not introduce any new linting errors.

## Submitting a Pull Request

Once your changes are ready, open a Pull Request against the `main` branch. Provide a clear description of the changes and link to any relevant issues.

Thank you for your contribution! 