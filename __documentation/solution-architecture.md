# SimpleLyrics Solution Architecture

## Overview

SimpleLyrics is a Blazor Server application for managing song lyrics, built using .NET 10 with a clean architecture pattern. The solution follows a layered architecture with clear separation of concerns between presentation, business logic, and data access layers.

**Repository:** https://github.com/fjeller/SimpleLyrics  
**Target Framework:** .NET 10  
**Architecture Pattern:** Clean Architecture / Layered Architecture  
**UI Framework:** Blazor Server with Fluent UI Components  
**Data Access:** Entity Framework Core 10 with SQL Server  
**Logging:** Serilog with SQL Server and Console sinks

---

## Solution Structure

```
SimpleLyrics.Blazor.Server.sln
│
├── SimpleLyrics (Blazor Server - Presentation Layer)
├── SimpleLyrics.Core (Business Logic Layer)
├── SimpleLyrics.Contracts (Shared Contracts/Interfaces)
└── SimpleLyrics.Data.SqlServer (Data Access Layer)
```

---

## Project Details

### 1. SimpleLyrics.Contracts
**Type:** Class Library  
**Purpose:** Shared contracts, interfaces, DTOs, and enums used across all layers

#### Structure:
```
SimpleLyrics.Contracts/
├── DataObjects/
│   ├── SongData.cs                    # Full song DTO for data layer
│   └── SongListItemData.cs            # Song list item DTO for data layer
├── Models/
│   ├── SongModel.cs                   # Full song model for business/presentation
│   └── SongListItemModel.cs           # Song list item model for business/presentation
├── Repositories/
│   └── ISongRepository.cs             # Repository interface
├── Services/
│   └── ISongService.cs                # Service interface
└── Results/
    └── SongResult.cs                  # Operation result enum
```

#### Key Types:

**SongData / SongModel**
- Properties: `Id`, `Title`, `Interpreter`, `Category`, `Capo`, `Text`
- Purpose: Complete song information with lyrics

**SongListItemData / SongListItemModel**
- Properties: `Id`, `Title`, `Interpreter`, `Category`, `Capo`
- Purpose: Summary information for song lists (without lyrics text)

**SongResult Enum**
```csharp
None = 0
SongAdded
SongUpdated
SongDeleted
Error = 1000
SongCouldNotBeAdded
SongCouldNotBeUpdated
SongCouldNotBeDeleted
SongDataIsInvalid
```

#### Documentation Standard:
- All public members documented with XML comments
- Separation lines (126 characters) wrapping all documentation
- Uses `<inheritdoc/>` for interface implementations
- Consistent property documentation with `<summary>` and `<value>` tags

---

### 2. SimpleLyrics.Data.SqlServer
**Type:** Class Library  
**Purpose:** Data access layer using Entity Framework Core

#### Dependencies:
- `Microsoft.EntityFrameworkCore.SqlServer` v10.0.0
- `Fjeller.SimpleMapper` v1.0.0-alpha-3
- `Fjeller.Convenience` v1.1.0
- SimpleLyrics.Contracts

#### Structure:
```
SimpleLyrics.Data.SqlServer/
├── DataAccess/
│   ├── Context/
│   │   └── SongsDataContext.cs        # EF Core DbContext
│   └── Entities/
│       └── Song.cs                    # Database entity
├── Mapping/
│   └── DataMappingProfile.cs          # Entity <-> DTO mappings
└── Repositories/
    └── SongRepository.cs              # ISongRepository implementation
```

#### Key Components:

**SongsDataContext**
- Inherits: `DbContext`
- DbSets: `Songs`
- Configuration: String length constraints (Title: 200, Interpreter: 200, Category: 50)

**Song Entity**
- Partial class for extensibility
- Properties: `Id`, `Title`, `Interpreter`, `Category`, `Capo`, `Text`
- Maps directly to database table

**SongRepository**
- Implements: `ISongRepository`
- Pattern: Uses `IDbContextFactory<SongsDataContext>` for context creation
- Features:
  - Efficient filtering with LINQ (searches Title, Interpreter, Category, Text)
  - Ordered results (by Title)
  - Uses `ExecuteDeleteAsync()` for optimal delete performance (EF Core 7+)
  - Comprehensive error logging with Serilog
  - Automatic insert vs. update decision based on `Id <= 0`

**DataMappingProfile**
- Uses Fjeller.SimpleMapper
- Mappings:
  - `Song` → `SongData`
  - `Song` → `SongListItemData`
  - `SongData` → `Song` (ignores Id for inserts)

#### File Organization:
- Fields → Properties → Private Methods → Public Methods → Constructors
- All methods documented (including private methods)
- Uses regions: Fields, Properties, Private Methods, Public Methods, Constructors

---

### 3. SimpleLyrics.Core
**Type:** Class Library  
**Purpose:** Business logic layer

#### Dependencies:
- `Fjeller.SimpleMapper` v1.0.0-alpha-3
- `Fjeller.Convenience` v1.1.0
- SimpleLyrics.Contracts

#### Structure:
```
SimpleLyrics.Core/
├── Services/
│   └── SongService.cs                 # ISongService implementation
└── Mapping/
    └── CoreMappingProfile.cs          # Model <-> DTO mappings
```

#### Key Components:

**SongService**
- Implements: `ISongService`
- Pattern: Service layer orchestrating repository and mapping
- Methods:
  - `GetSongsAsync(string? filter)` → Returns `List<SongModel>`
  - `GetSong(int songId)` → Returns `SongModel?`
  - `StoreSong(SongModel model)` → Returns `SongResult`
  - `DeleteSong(int songId)` → Returns `SongResult`
- Uses `<inheritdoc/>` for all public methods

**CoreMappingProfile**
- Uses Fjeller.SimpleMapper
- Mappings:
  - `SongData` → `SongModel`
  - `SongListItemData` → `SongListItemModel`
  - `SongModel` → `SongData`

#### File Organization:
- Fields → Public Methods → Constructors
- Minimal complexity (passes through to repository with mapping)

---

### 4. SimpleLyrics (Blazor Server)
**Type:** Blazor Server Web Application  
**Purpose:** Presentation layer / User interface

#### Dependencies:
- `Microsoft.FluentUI.AspNetCore.Components` v4.13.2
- `Microsoft.FluentUI.AspNetCore.Components.Icons` v4.13.2
- `Serilog.AspNetCore` v10.0.0
- `Serilog.Sinks.Console` v6.1.1
- `Serilog.Sinks.MSSqlServer` v9.0.2
- `Serilog.Settings.Configuration` v10.0.0
- `Serilog.Enrichers.Thread` v4.0.0
- `Fjeller.SimpleMapper` v1.0.0-alpha-3
- `Fjeller.Convenience` v1.1.0
- SimpleLyrics.Core
- SimpleLyrics.Data.SqlServer

#### Structure:
```
SimpleLyrics/
├── Components/
│   ├── Layout/
│   │   └── MainLayout.razor           # Main application layout
│   ├── Pages/
│   │   ├── Home.razor                 # Home page
│   │   └── NotFound.razor             # 404 page
│   ├── Shared/
│   │   ├── SubHeader.razor            # Reusable sub-header component
│   │   └── PageContent.razor          # Reusable page content wrapper
│   ├── App.razor                      # Root component
│   ├── Routes.razor                   # Routing configuration
│   └── _Imports.razor                 # Global usings
├── Extensions/
│   └── ServiceCollectionExtensions.cs # Dependency injection setup
├── wwwroot/
│   ├── app.css                        # Application styles
│   └── favicon.ico
├── appsettings.json                   # Production configuration
├── appsettings.Development.json       # Development configuration
└── Program.cs                         # Application entry point
```

#### Key Components:

**Program.cs**
- Configures Serilog with:
  - Bootstrap logger for startup
  - Console sink
  - SQL Server sink (logs to `dbo.Logs` table)
  - Enrichers: FromLogContext, ThreadId, MachineName, EnvironmentName
  - Request logging middleware
  - Fatal error handling
- Configures Blazor Server with Interactive Server render mode
- Registers SimpleLyrics services via extension method
- Registers Fluent UI components

**ServiceCollectionExtensions.cs**
```csharp
AddSimpleLyricsServices(IServiceCollection services, IConfiguration configuration)
```
- Retrieves `DefaultConnection` connection string (throws `InvalidOperationException` if missing)
- Registers `DbContextFactory<SongsDataContext>` with SQL Server
- Registers SimpleMapper with both mapping profiles
- Registers services:
  - `ISongRepository` → `SongRepository` (Scoped)
  - `ISongService` → `SongService` (Scoped)

**MainLayout.razor**
- Uses `FluentDesignTheme` (Dark mode, Visio color scheme)
- Structure:
  - `FluentHeader` - Application title
  - `FluentStack` - Main content area
  - `FluentBodyContent` - Page body
  - `FluentFooter` - Links and info
- Error UI for unhandled exceptions

**Shared Components**

*SubHeader.razor*
- Purpose: Standardized page sub-header with actions
- Features:
  - Flexbox layout (`justify-content: flex-end`)
  - Responsive inner-content wrapper
  - Accepts any child content
- Usage: Typically contains action buttons (Add, Export, Import, etc.)

*PageContent.razor*
- Purpose: Consistent page content wrapper
- Features: `inner-content` class for responsive width constraints

**Home.razor**
- Route: `/`
- Structure:
  - SubHeader with buttons:
    - "Add Song" (Accent, left-aligned via FluentSpacer)
    - "Export Songs" (Outline, right-aligned)
    - "Import Songs" (Outline, right-aligned)
  - PageContent (currently empty)

#### Configuration

**appsettings.json**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=(local);Initial Catalog=SimpleLyrics;Integrated Security=True;TrustServerCertificate=true"
  },
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.MSSqlServer"],
    "MinimumLevel": {
      "Default": "Warning",
      "Override": {
        "Microsoft": "Warning",
        "Microsoft.AspNetCore": "Warning",
        "System": "Warning"
      }
    },
    "Enrich": ["FromLogContext"],
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "MSSqlServer",
        "Args": {
          "connectionString": "DefaultConnection",
          "sinkOptionsSection": {
            "tableName": "Logs",
            "schemaName": "dbo",
            "autoCreateSqlTable": true,
            "batchPostingLimit": 1000,
            "period": "0.00:00:05"
          },
          "restrictedToMinimumLevel": "Information",
          "columnOptionsSection": {
            "addStandardColumns": ["LogEvent"]
          }
        }
      }
    ]
  },
  "AllowedHosts": "*"
}
```

**appsettings.Development.json**
- Overrides: Debug level logging for development
- More verbose Microsoft/AspNetCore logging

#### Styling

**app.css**
- Imports Fluent UI reboot styles
- Design tokens: Uses CSS variables from Fluent UI
- Layout:
  - `.main` - Min height calculation for full viewport
  - `.body-content` - Flex layout for content area
  - `.content` - Full width, stretch alignment
- Components:
  - `.song-header` - Header styling (1.5rem, 400 weight)
  - `.sub-header` - Border bottom, flexbox for actions
  - `.inner-content` - Responsive width constraints
- Responsive breakpoints:
  - Mobile (< 600px): Full width, stacked layout
  - Desktop (>= 1280px): 1200px max width
  - Large desktop (>= 1920px): 1440px max width
- Fluent UI integration:
  - Error boundary styling
  - Loading progress indicators
  - Alert styles (danger, success, warning)

---

## Architecture Patterns

### Dependency Flow
```
Presentation (SimpleLyrics)
    ↓ depends on
Business Logic (SimpleLyrics.Core)
    ↓ depends on
Contracts (SimpleLyrics.Contracts)
    ↑ implemented by
Data Access (SimpleLyrics.Data.SqlServer)
```

### Key Patterns Used

1. **Clean Architecture / Layered Architecture**
   - Clear separation between presentation, business, and data layers
   - Contracts layer defines interfaces (Dependency Inversion Principle)

2. **Repository Pattern**
   - `ISongRepository` / `SongRepository`
   - Abstracts data access logic
   - Enables testability and swap-ability

3. **Service Layer Pattern**
   - `ISongService` / `SongService`
   - Orchestrates business logic
   - Maps between domain models and DTOs

4. **Dependency Injection**
   - All services registered in `ServiceCollectionExtensions`
   - Constructor injection throughout
   - Scoped lifetime for services and repositories

5. **DbContext Factory Pattern**
   - Uses `IDbContextFactory<SongsDataContext>`
   - Enables proper DbContext lifecycle management in Blazor Server
   - Each operation gets a fresh context

6. **Object Mapping**
   - Uses Fjeller.SimpleMapper
   - Separate profiles per layer (DataMappingProfile, CoreMappingProfile)
   - Automatic property mapping

7. **Result Pattern**
   - `SongResult` enum for operation outcomes
   - Avoids exception-based flow control
   - Clear success/failure states

8. **Component-Based UI**
   - Reusable Blazor components (SubHeader, PageContent)
   - Fluent UI component library
   - RenderFragment for composability

---

## Data Flow

### Query Flow (Read Operations)
```
User Interaction (Home.razor)
    ↓
Service Call (ISongService.GetSongsAsync)
    ↓
SongService.GetSongsAsync
    ↓
ISongRepository.GetSongsAsync
    ↓
SongRepository.GetSongsAsync
    ↓ creates context
DbContextFactory → SongsDataContext
    ↓ queries
SQL Server Database
    ↓ returns entities
Song entities
    ↓ maps to
SongData (via DataMappingProfile)
    ↓ returns to service
SongService
    ↓ maps to
SongModel (via CoreMappingProfile)
    ↓ returns to UI
Blazor Component
    ↓ renders
User sees data
```

### Command Flow (Write Operations)
```
User Action (Button Click)
    ↓
Service Call (ISongService.StoreSong)
    ↓
SongService.StoreSong
    ↓ maps model to data
SongData (via CoreMappingProfile)
    ↓
ISongRepository.StoreSongAsync
    ↓
SongRepository.StoreSongAsync
    ↓ validates
Checks if data is null
    ↓ decides insert vs. update
InternalInsertSongAsync or InternalUpdateSongAsync
    ↓ maps to entity
Song entity (via DataMappingProfile)
    ↓ saves
DbContext.SaveChangesAsync
    ↓ persists
SQL Server Database
    ↓ returns result
SongResult enum
    ↓ propagates back
SongService → Blazor Component
    ↓
User sees feedback
```

---

## Database Schema

### Songs Table
```sql
CREATE TABLE [dbo].[Songs]
(
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Title] NVARCHAR(200) NOT NULL,
    [Interpreter] NVARCHAR(200) NULL,
    [Category] NVARCHAR(50) NULL,
    [Capo] INT NOT NULL DEFAULT 0,
    [Text] NVARCHAR(MAX) NULL
)
```

### Logs Table (Serilog)
```sql
-- Auto-created by Serilog.Sinks.MSSqlServer
CREATE TABLE [dbo].[Logs]
(
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Message] NVARCHAR(MAX),
    [MessageTemplate] NVARCHAR(MAX),
    [Level] NVARCHAR(128),
    [TimeStamp] DATETIME NOT NULL,
    [Exception] NVARCHAR(MAX),
    [LogEvent] NVARCHAR(MAX)
    -- Additional columns configured in appsettings.json
)
```

---

## Logging Strategy

### Serilog Configuration
- **Bootstrap Logger**: Minimal console logging for startup errors
- **Main Logger**: Configured from appsettings.json
  - Console sink for development visibility
  - SQL Server sink for production persistence
  - Batch writing (1000 entries or 5 seconds)
  
### Enrichers
- `FromLogContext` - Contextual properties
- `ThreadId` - Thread information
- `MachineName` - Server identification
- `EnvironmentName` - Development/Production distinction

### Logging Locations
- **Repository Layer**: All CRUD operation errors logged with structured data
- **Startup**: Application start/stop events
- **Requests**: HTTP request logging via `UseSerilogRequestLogging()`

### Log Levels
- **Production**: Warning and above
- **Development**: Debug and above
- **Repository errors**: LogError with exception and structured properties

---

## UI/UX Architecture

### Design System
- **Framework**: Microsoft Fluent UI for Blazor
- **Theme**: Dark mode with Visio color scheme
- **Storage**: Theme preference stored in browser (StorageName="theme")

### Layout Structure
```
FluentLayout
├── FluentHeader (Application title)
├── FluentStack (Main content)
│   └── FluentBodyContent
│       └── Page content (@Body)
└── FluentFooter (Links)
```

### Responsive Design
- **Mobile-first**: Base styles for mobile
- **Breakpoints**:
  - `< 600px`: Mobile (full width, stacked)
  - `>= 1280px`: Desktop (1200px container)
  - `>= 1920px`: Large desktop (1440px container)

### Component Patterns
- **SubHeader**: Action bar pattern with left/right alignment
- **PageContent**: Consistent content wrapper
- **FluentSpacer**: Used for flexible spacing in flex layouts

---

## Code Style & Standards

### Documentation
- **All members documented**: Public, internal, protected, and private
- **Separation lines**: 126-character separator wrapping all XML docs
- **Standard wording**:
  - Constructors: "Initializes a new instance of the <ClassName> class."
  - Properties: "Gets or sets..." / "Gets..."
  - Methods: Present-tense, third-person verb
- **Inheritance**: Use `<inheritdoc/>` for interface implementations
- **Tags**: `<summary>`, `<param>`, `<returns>`, `<value>`, `<exception>`
- **Cross-references**: `<see cref>` for types, `<see langword>` for keywords

### File Organization (Classes/Structs)
Order: Constants → Fields → Properties → Methods → Constructors

**Method Ordering**:
- Private → Internal → Protected → Internal Protected → Public

**Regions**:
- `#region Fields`
- `#region Properties`
- `#region Private Methods`
- `#region Internal Methods`
- `#region Protected Methods`
- `#region Internal Protected Methods`
- `#region Public Methods`
- `#region Constructors`

### Naming Conventions
- **Private fields**: `_camelCase` (underscore prefix)
- **Public members**: `PascalCase`
- **Interfaces**: `I` prefix (e.g., `ISongService`)
- **Models**: `Model` suffix (e.g., `SongModel`)
- **Data objects**: `Data` suffix (e.g., `SongData`)
- **Services**: `Service` suffix (e.g., `SongService`)
- **Repositories**: `Repository` suffix (e.g., `SongRepository`)

### C# Features Used
- **Nullable reference types**: Enabled across all projects
- **Implicit usings**: Enabled for cleaner code
- **Pattern matching**: Used in repository queries (`is null` checks)
- **Collection expressions**: Empty collections `[]` instead of `new List<T>()`
- **String interpolation**: For formatted strings and SQL
- **Async/await**: Throughout for I/O operations
- **LINQ**: Extensive use for queries and transformations

---

## Extension Points

### Adding New Entity Types
1. Create entity in `SimpleLyrics.Data.SqlServer/DataAccess/Entities/`
2. Add DbSet to `SongsDataContext`
3. Create Data and Model classes in `SimpleLyrics.Contracts`
4. Create repository interface in `SimpleLyrics.Contracts/Repositories/`
5. Implement repository in `SimpleLyrics.Data.SqlServer/Repositories/`
6. Create service interface in `SimpleLyrics.Contracts/Services/`
7. Implement service in `SimpleLyrics.Core/Services/`
8. Add mappings to `DataMappingProfile` and `CoreMappingProfile`
9. Register in `ServiceCollectionExtensions`
10. Create Blazor pages/components in `SimpleLyrics/Components/`

### Adding New Pages
1. Create `.razor` file in `SimpleLyrics/Components/Pages/`
2. Add `@page` directive with route
3. Use `SubHeader` and `PageContent` components for consistency
4. Inject services via `@inject` directive
5. Follow Fluent UI component patterns

### Adding New Shared Components
1. Create `.razor` file in `SimpleLyrics/Components/Shared/`
2. Define `[Parameter]` properties for customization
3. Use `RenderFragment` for flexible content
4. Add corresponding CSS to `app.css` if needed
5. Import in `_Imports.razor` if widely used

---

## Testing Strategy (Future)

### Recommended Test Structure
```
SimpleLyrics.Tests/
├── Unit/
│   ├── Services/
│   │   └── SongServiceTests.cs
│   └── Repositories/
│       └── SongRepositoryTests.cs
├── Integration/
│   ├── Database/
│   │   └── SongRepositoryIntegrationTests.cs
│   └── Services/
│       └── SongServiceIntegrationTests.cs
└── E2E/
    └── Blazor/
        └── HomePageTests.cs
```

### Testing Tools (Recommended)
- **Unit Tests**: xUnit, NSubstitute (mocking), FluentAssertions
- **Integration Tests**: xUnit, TestContainers (SQL Server), WebApplicationFactory
- **E2E Tests**: Playwright for .NET, bUnit (Blazor component testing)

---

## Security Considerations

### Current Implementation
- **Connection String**: Stored in appsettings.json (consider User Secrets for dev)
- **SQL Injection**: Protected by EF Core parameterized queries
- **Authentication**: None currently implemented
- **Authorization**: None currently implemented

### Recommendations for Production
1. **Authentication**: Add ASP.NET Core Identity or Azure AD
2. **Authorization**: Implement role-based or policy-based authorization
3. **HTTPS**: Enforce HTTPS in production
4. **Connection Strings**: Use Azure Key Vault or environment variables
5. **CORS**: Configure if exposing APIs
6. **Input Validation**: Add FluentValidation for model validation
7. **Rate Limiting**: Consider adding rate limiting middleware
8. **Logging**: Ensure no sensitive data in logs

---

## Performance Considerations

### Current Optimizations
- **DbContext Factory**: Proper context lifecycle in Blazor Server
- **Efficient Deletes**: Uses `ExecuteDeleteAsync()` (EF Core 7+)
- **Batch Logging**: Serilog batches 1000 entries or 5 seconds
- **Scoped Services**: Proper DI lifetime management

### Recommendations
1. **Caching**: Add distributed caching (Redis) for read-heavy operations
2. **Pagination**: Implement pagination for song lists
3. **Lazy Loading**: Consider for large text fields
4. **Indexing**: Add database indexes on frequently queried columns
5. **SignalR Optimization**: Configure hub options for Blazor Server
6. **Static Assets**: Use CDN for Fluent UI assets in production
7. **Prerendering**: Consider prerendering for initial page load

---

## Deployment Architecture

### Development
- **Database**: Local SQL Server (localdb or SQL Express)
- **Application**: IIS Express or Kestrel
- **Logging**: Console + Local SQL Server

### Production (Recommended)
```
Azure App Service (Blazor Server)
    ↓
Azure SQL Database
    ↓
Azure Application Insights (Logging)
```

**Alternative**: Docker containers on Azure Container Apps or Kubernetes

---

## Future Enhancements

### Planned Features (Based on UI)
1. **Add Song**: Modal/page for creating new songs
2. **Edit Song**: Edit existing song details and lyrics
3. **Delete Song**: Confirmation dialog and deletion
4. **Export Songs**: Export to JSON, XML, or CSV
5. **Import Songs**: Import from various formats
6. **Search/Filter**: Full-text search across songs
7. **Categories**: Category management
8. **Print View**: Optimized print layout for lyrics

### Technical Improvements
1. **Authentication & Authorization**: User management
2. **Real-time Collaboration**: Multiple users editing
3. **Version History**: Track song changes over time
4. **Attachments**: Audio files, sheet music PDFs
5. **Advanced Search**: Elasticsearch integration
6. **API Layer**: RESTful API for mobile apps
7. **Offline Support**: Progressive Web App (PWA) features
8. **Internationalization**: Multi-language support

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | .NET | 10.0 |
| **Language** | C# | 14.0 |
| **UI Framework** | Blazor Server | .NET 10 |
| **UI Library** | Fluent UI | 4.13.2 |
| **ORM** | Entity Framework Core | 10.0.0 |
| **Database** | SQL Server | N/A |
| **Logging** | Serilog | 9.0.0/10.0.0 |
| **Mapping** | Fjeller.SimpleMapper | 1.0.0-alpha-3 |
| **Utilities** | Fjeller.Convenience | 1.1.0 |

---

## References & Documentation

### Internal Documentation
- This file serves as the primary architecture reference
- All code is documented with XML comments
- Follow established patterns when making changes

### External Resources
- [Blazor Documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor)
- [Fluent UI Blazor](https://www.fluentui-blazor.net)
- [EF Core Documentation](https://learn.microsoft.com/en-us/ef/core/)
- [Serilog Documentation](https://serilog.net/)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-01-XX | 1.0 | Initial architecture documentation | AI Assistant |

---

## Maintenance Notes

### When Making Changes
1. **Follow established patterns**: Reference this document
2. **Update documentation**: Keep XML docs current
3. **Maintain layering**: Respect dependency flow
4. **Test thoroughly**: Ensure changes don't break existing functionality
5. **Update this document**: Add new patterns or architectural decisions

### Code Review Checklist
- [ ] XML documentation complete and follows standards
- [ ] File organization follows defined structure
- [ ] Naming conventions followed
- [ ] Dependency injection properly configured
- [ ] Error handling and logging implemented
- [ ] No direct cross-layer dependencies (only through Contracts)
- [ ] Async/await used for I/O operations
- [ ] Nullable reference types respected

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Development Team
