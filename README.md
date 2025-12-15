# Multi-API Deep Research Assistant

A comprehensive full-stack application that combines OpenAI Deep Research and Google Gemini to provide in-depth research capabilities with sequential refinement questions, PDF generation, and email delivery.

## Features

- 🔐 **Google OAuth Authentication** - Secure user authentication
- 🤖 **OpenAI Deep Research Integration** - Advanced research with refinement questions
- 🧠 **Google Gemini Integration** - Complementary research insights
- 📄 **PDF Report Generation** - Professional research reports
- 📧 **Email Delivery** - Automatic PDF delivery via Gmail API
- 🔄 **State Machine** - Robust session state management
- 📊 **Session History** - Track all your research sessions
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- 🧪 **Mock Mode** - Test locally without API keys

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (via Prisma)
- **Authentication**: NextAuth.js with Google OAuth
- **PDF Generation**: @react-pdf/renderer
- **Email**: Gmail API (via googleapis)
- **AI Services**: OpenAI API, Google Gemini API

## Prerequisites

- Node.js 18+ and npm/yarn
- Google OAuth credentials
- OpenAI API key
- Google Gemini API key
- Gmail API credentials (for email delivery)

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/k429wang/AI-Deep-Research-Assistant
cd AI-Deep-Research-Assistant
npm install
```

### 2. Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"

# Gmail API (optional for email delivery)
GMAIL_CLIENT_ID="your-gmail-client-id"
GMAIL_CLIENT_SECRET="your-gmail-client-secret"
GMAIL_REFRESH_TOKEN="your-gmail-refresh-token"

# Mock Mode (set to "true" for local development without API keys)
USE_MOCK_APIS="false"
```

### 3. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

### 4. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Mock Mode

For local development without API keys, set `USE_MOCK_APIS=true` in your `.env` file. This will:

- Use mock OpenAI responses with sample refinement questions
- Use mock Gemini responses
- Skip actual email sending (logs to console)
- Use mock PDF generation

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth configuration
│   │   └── sessions/      # Research session endpoints
│   ├── dashboard/         # Dashboard pages
│   └── auth/              # Authentication pages
├── lib/                   # Core libraries
│   ├── openai-client.ts   # OpenAI integration
│   ├── gemini-client.ts   # Gemini integration
│   ├── pdf-generator.ts   # PDF generation
│   ├── email-service.ts   # Email delivery
│   ├── state-machine.ts   # State management
│   └── research-orchestrator.ts  # Workflow orchestration
├── prisma/                # Database schema
├── tests/                 # Test files
└── types/                 # TypeScript type definitions
```

## API Endpoints

### Sessions

- `GET /api/sessions` - List all sessions for the authenticated user
- `POST /api/sessions` - Create a new research session
- `GET /api/sessions/[id]` - Get session details
- `POST /api/sessions/[id]/refinements` - Submit refinement answer
- `GET /api/sessions/[id]/pdf` - Download PDF report

## Research Workflow

1. **User Authentication** - Sign in with Google OAuth
2. **Create Session** - User enters initial research prompt
3. **Refinement Questions** - If needed, OpenAI returns refinement questions
4. **Answer Questions** - User answers questions one at a time
5. **Research Execution** - System runs research with both OpenAI and Gemini
6. **PDF Generation** - Research results compiled into PDF
7. **Email Delivery** - PDF sent to user's email address
8. **Session History** - All sessions saved and accessible

## State Machine

The research session follows a state machine with these states:

- `CREATED` - Session created, awaiting processing
- `AWAITING_REFINEMENTS` - Waiting for refinement questions
- `REFINEMENTS_IN_PROGRESS` - User answering questions
- `REFINEMENTS_COMPLETE` - All questions answered
- `RUNNING_RESEARCH` - Research in progress
- `COMPLETED` - Research complete, PDF generated
- `FAILED` - Error occurred

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Next.js App   │
│  (App Router)   │
└──────┬──────────┘
       │
       ├──► NextAuth (Google OAuth)
       │
       ├──► API Routes
       │    ├── Sessions
       │    ├── Refinements
       │    └── PDF Download
       │
       ▼
┌─────────────────┐
│  Prisma Client  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   SQLite DB     │
└─────────────────┘

Research Flow:
┌─────────────┐
│   OpenAI    │──► Refinement Questions
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   OpenAI    │     │   Gemini    │
│   Research  │     │   Research  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
         ┌──────────────┐
         │ PDF Generator│
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Email Service│
         │  (Gmail API) │
         └──────────────┘
```

## Research Sequence Flow

```
User Input
    │
    ▼
OpenAI Deep Research
    │
    ├──► Needs Refinement?
    │         │
    │         ├── Yes ──► Show Questions
    │         │              │
    │         │              ▼
    │         │         User Answers
    │         │              │
    │         │              ▼
    │         └──────── Refined Prompt
    │
    ▼
Run Research (Parallel)
    │
    ├──► OpenAI Research
    │
    └──► Gemini Research
    │
    ▼
Combine Results
    │
    ▼
Generate PDF
    │
    ▼
Send Email
    │
    ▼
Complete
```

## Troubleshooting

### Database Issues

```bash
# Reset database
rm dev.db
npm run db:push
```

### Authentication Issues

- Ensure Google OAuth credentials are correct
- Check that `NEXTAUTH_URL` matches your deployment URL
- Verify `NEXTAUTH_SECRET` is set

### API Issues

- Check API keys are valid
- Verify rate limits haven't been exceeded
- Use mock mode for testing: `USE_MOCK_APIS=true`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License

## AI Usage Disclosure

This application uses the following AI services:

- **OpenAI API**: For deep research capabilities and refinement question generation
- **Google Gemini API**: For complementary research insights

Both services are used to enhance research quality and provide comprehensive results. User data is processed according to each service's privacy policy.

## Support

For issues and questions, please open an issue on GitHub.

## Roadmap

- [ ] Support for additional research providers
- [ ] Custom PDF templates
- [ ] Research session sharing
- [ ] Export to other formats (DOCX, Markdown)
- [ ] Advanced filtering and search
- [ ] Research templates
- [ ] Collaborative research sessions
- [ ] Complete OpenAI, Gemini, and Gmail integrations
- [ ] Deploy application w/ Vercel hosting + Supabase prod database

