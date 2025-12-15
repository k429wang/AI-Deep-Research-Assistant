# Architecture Documentation

## System Overview

The Multi-API Deep Research Assistant is a full-stack Next.js application that orchestrates research workflows using OpenAI and Google Gemini, with sequential refinement questions, PDF generation, and email delivery.

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **NextAuth.js** - Authentication

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Database ORM
- **SQLite** - Database (development) / PostgreSQL (production)

### External Services
- **OpenAI API** - Deep research capabilities
- **Google Gemini API** - Complementary research
- **Gmail API** - Email delivery
- **Google OAuth** - User authentication

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Next.js Pages & Components)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         API Layer                       │
│  (Next.js API Routes)                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Business Logic Layer               │
│  (Research Orchestrator, State Machine) │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Service Layer                      │
│  (OpenAI, Gemini, PDF, Email)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Data Layer                         │
│  (Prisma ORM + Database)                │
└─────────────────────────────────────────┘
```

## Data Flow

### Research Session Creation

```
User Input
    │
    ▼
POST /api/sessions
    │
    ▼
ResearchOrchestrator.startSession()
    │
    ├──► Create DB Record
    │
    ├──► OpenAI.startDeepResearch()
    │     │
    │     ├──► Returns Refinement Questions
    │     │     │
    │     │     └──► Create Refinement Records
    │     │
    │     └──► OR Returns Result
    │           │
    │           └──► Run Research
    │
    └──► Update Session Status
```

### Refinement Flow

```
User Answers Question
    │
    ▼
POST /api/sessions/[id]/refinements
    │
    ▼
ResearchOrchestrator.submitRefinementAnswer()
    │
    ├──► Update Refinement Record
    │
    ├──► Check if All Answered
    │     │
    │     ├──► Yes ──► Generate Refined Prompt
    │     │            │
    │     │            └──► Run Research
    │     │
    │     └──► No ──► Update Status
    │
    └──► Return Updated Session
```

### Research Execution

```
Run Research
    │
    ├──► Update Status: RUNNING_RESEARCH
    │
    ├──► Parallel Execution:
    │     │
    │     ├──► OpenAI.startDeepResearch(refinedPrompt)
    │     │
    │     └──► Gemini.research(refinedPrompt)
    │
    ├──► Store Results
    │
    ├──► Generate PDF
    │
    ├──► Send Email
    │
    └──► Update Status: COMPLETED
```

## State Machine

The research session follows a deterministic state machine:

```
CREATED
  │
  ▼
AWAITING_REFINEMENTS
  │
  ▼
REFINEMENTS_IN_PROGRESS
  │
  ▼
REFINEMENTS_COMPLETE
  │
  ▼
RUNNING_RESEARCH
  │
  ▼
COMPLETED

Any State ──► FAILED (on error)
```

### State Transitions

- **CREATED → AWAITING_REFINEMENTS**: When OpenAI returns refinement questions
- **AWAITING_REFINEMENTS → REFINEMENTS_IN_PROGRESS**: When first answer submitted
- **REFINEMENTS_IN_PROGRESS → REFINEMENTS_COMPLETE**: When all questions answered
- **REFINEMENTS_COMPLETE → RUNNING_RESEARCH**: When research starts
- **RUNNING_RESEARCH → COMPLETED**: When both research results received
- **Any → FAILED**: On error

## Database Schema

### Core Entities

- **User**: Authentication and user data
- **ResearchSession**: Main research session entity
- **Refinement**: Refinement questions and answers
- **Account/Session**: NextAuth authentication tables

### Relationships

```
User
  ├──► ResearchSession (1:N)
  │       └──► Refinement (1:N)
  │
  ├──► Account (1:N)
  └──► Session (1:N)
```

## API Design

### RESTful Endpoints

- `GET /api/sessions` - List user's sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/[id]` - Get session details
- `POST /api/sessions/[id]/refinements` - Submit refinement answer
- `GET /api/sessions/[id]/pdf` - Download PDF

### Authentication

All API routes require authentication via NextAuth session.

### Error Handling

- Consistent error response format
- Appropriate HTTP status codes
- User-friendly error messages
- Detailed logging for debugging

## Security Considerations

### Authentication & Authorization
- NextAuth.js handles OAuth flow
- Session-based authentication
- User data isolation (users can only access their own sessions)

### Data Protection
- API keys stored in environment variables
- Database queries use Prisma (SQL injection prevention)
- Input validation with Zod
- XSS prevention via React's built-in escaping

### Rate Limiting
- Handles API rate limits (429 responses)
- Retry logic with exponential backoff
- Graceful degradation

## Scalability

### Current Design
- Stateless API routes
- Database-backed sessions
- Efficient queries with indexes

### Future Improvements
- Caching layer (Redis)
- Queue system for long-running tasks
- CDN for static assets
- Database connection pooling

## Error Handling Strategy

1. **API Errors**: Caught and returned with appropriate status codes
2. **External Service Errors**: Handled with retries and fallbacks
3. **Database Errors**: Logged and returned user-friendly messages
4. **Validation Errors**: Returned immediately with details

## Testing Strategy

1. **Unit Tests**: Test individual functions and utilities
2. **Integration Tests**: Test API routes and workflows
3. **Mock Mode**: Test without external API dependencies
4. **E2E Tests**: Test complete user flows (future)

## Deployment Architecture

### Development
- SQLite database (file-based)
- Local environment variables
- Mock mode available

### Production
- PostgreSQL database (Vercel Postgres/Supabase/Neon)
- Environment variables in hosting platform
- Real API integrations
- CDN for static assets

## Performance Optimizations

1. **Database**: Indexed queries, efficient relationships
2. **API**: Parallel execution of research calls
3. **Frontend**: Server-side rendering, optimized images
4. **Caching**: Session data cached in database

## Monitoring & Logging

- Console logging for development
- Error tracking (can integrate Sentry)
- API usage monitoring
- Database query logging (development only)

## Future Enhancements

- Real-time updates via WebSockets
- Research result caching
- Advanced filtering and search
- Export to multiple formats
- Collaborative research sessions
- Research templates
- Analytics dashboard

