---
description: 'Guidelines for building C# applications'
applyTo: '**/*.cs'
---

# C# Development

## C# Instructions
- Always use the latest version C#, currently C# 14 features.
- Write clear and concise comments for each function.

## General Instructions
- Make only high confidence suggestions when reviewing code changes.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Handle edge cases and write clear exception handling.
- For libraries or external dependencies, mention their usage and purpose in comments.

## Naming Conventions

- Follow PascalCase for component names, method names, and public members.
- Use camelCase for private fields and local variables. Prefix names of private fields with an underscore, e.g., `_dataContext`
- Prefix interface names with "I" (e.g., `IUserService`).
- Use ALL_UPPER-style for private constants, prefixed with an underscore, e.g., `_CACHEKEY_TRANSLATIONLIST`
- When naming Models, make sure the name of the class ends with `Model`, e.g. `UserModel`
- When naming Data Transfer Objects, make sure the name of the class end with `Data`, e.g `UserData`
- When naming Service classes (classes that contain business-logic) and service interfaces, make sure the name ends with `Service`, e.g. `TranslationService`, `ITranslationService`
- When naming Repositories for database access and repository-interfaces, make sure the name ends with `Repository`, e.g. `TranslationRepository`, `ITranslationRepository`

## Formatting

- Apply code-formatting style defined in `.editorconfig`.
- Prefer file-scoped namespace declarations and single-line using directives.
- Insert a newline before the opening curly brace of any code block (e.g., after `if`, `for`, `while`, `foreach`, `using`, `try`, etc.).
- Always use curly braces for code blocks (`if`, `for`, `while`, `foreach`, `using`, `try`, etc.) even if it only contains a single statement
- Ensure that the final return statement of a method is on its own line.
- Use pattern matching and switch expressions wherever possible.
- Use `nameof` instead of string literals when referring to member names.
- Ensure that XML doc comments are created for any public APIs. When applicable, include `<example>` and `<code>` documentation in the comments.
- Ensure that XML doc comments are created for Properties and all methods, even private ones. When applicable, include `<example>` and `<code>` documentation in the comments.
- Ensure that XML doc comments are created for DataTypes (classes, records, etc). When applicable, include `<example>` and `<code>` documentation in the comments.
- Use a starting and ending separation line for all XML doc comments, like in the following code snippet.

```csharp
/// ==============================================================================================================================
/// <summary>
/// Maps an object of the source type to a new object of the destination type
/// </summary>
/// <typeparam name="TSource">The source type</typeparam>
/// <typeparam name="TDestination">The destination type</typeparam>
/// <param name="source">The source object</param>
/// <returns>A new object of the provided destination type with the mapped data</returns>
/// ==============================================================================================================================
TDestination Map<TSource, TDestination>(TSource source)
	where TSource : class
	where TDestination : class, new();
```

## Project Setup and Structure

- Guide users through creating a new .NET project with the appropriate templates.
- Explain the purpose of each generated file and folder to build understanding of the project structure.
- Demonstrate how to organize code using feature folders or domain-driven design principles.
- Show proper separation of concerns with models, services, and data access layers.
- Explain the Program.cs and configuration system in ASP.NET Core 10 including environment-specific settings.

## Nullable Reference Types

- Declare variables non-nullable, and check for `null` at entry points.
- Always use `is null` or `is not null` instead of `== null` or `!= null`.
- Trust the C# null annotations and don't add null checks when the type system says a value cannot be null.

## Data Access Patterns

- Guide the implementation of a data access layer using Entity Framework Core.
- Explain different options (SQL Server, SQLite, In-Memory) for development and production.
- Demonstrate repository pattern implementation and when it's beneficial.
- Show how to implement database migrations and data seeding.
- Explain efficient query patterns to avoid common performance issues.

## Authentication and Authorization

- Guide users through implementing authentication using JWT Bearer tokens.
- Explain OAuth 2.0 and OpenID Connect concepts as they relate to ASP.NET Core.
- Show how to implement role-based and policy-based authorization.
- For this project we do not use AzureAD-Integration, but Microsoft Identity instead
- Explain how to secure both controller-based and Minimal APIs consistently.

## Validation and Error Handling

- Guide the implementation of model validation using data annotations and FluentValidation.
- Explain the validation pipeline and how to customize validation responses.
- Demonstrate a global exception handling strategy using middleware.
- Show how to create consistent error responses across the API.
- Explain problem details (RFC 7807) implementation for standardized error responses.

## API Versioning and Documentation

- Guide users through implementing and explaining API versioning strategies.
- Demonstrate Swagger/OpenAPI implementation with proper documentation.
- Show how to document endpoints, parameters, responses, and authentication.
- Explain versioning in both controller-based and Minimal APIs.
- Guide users on creating meaningful API documentation that helps consumers.

## Logging and Monitoring

- Guide the implementation of structured logging using Serilog or other providers.
- Explain the logging levels and when to use each.
- Demonstrate integration with Application Insights for telemetry collection.
- Show how to implement custom telemetry and correlation IDs for request tracking.
- Explain how to monitor API performance, errors, and usage patterns.

## Testing

- Always include test cases for critical paths of the application.
- Guide users through creating unit tests.
- Do not emit "Act", "Arrange" or "Assert" comments.
- Copy existing style in nearby files for test method names and capitalization.
- Explain integration testing approaches for API endpoints.
- Demonstrate how to mock dependencies for effective testing.
- Show how to test authentication and authorization logic.
- Explain test-driven development principles as applied to API development.
- Use xUnit for testing.

## Performance Optimization

- Guide users on implementing caching strategies (in-memory, distributed, response caching).
- Explain asynchronous programming patterns and why they matter for API performance.
- Demonstrate pagination, filtering, and sorting for large data sets.
- Show how to implement compression and other performance optimizations.
- Explain how to measure and benchmark API performance.


