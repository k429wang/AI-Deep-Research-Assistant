# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `USE_MOCK_APIS=true` (for testing without API keys)
- Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`

### 3. Set Up Database

```bash
npm run db:generate
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Open Browser

Visit [http://localhost:3000](http://localhost:3000)

## Testing with Mock Mode

With `USE_MOCK_APIS=true`, you can test the entire flow without API keys:

1. Sign in (will redirect to sign-in page - you can skip this in mock mode or set up Google OAuth)
2. Create a research session
3. Answer refinement questions
4. View mock research results
5. Download PDF

## Troubleshooting

**Database errors?**
```bash
rm dev.db
npm run db:push
```

**Build errors?**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Port already in use?**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Need Help?

- Check the [README.md](./README.md) for detailed instructions
- Review error messages in the console
- Ensure all environment variables are set correctly

Thanks for reading! 🚀

