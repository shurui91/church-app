# Church in Cerritos Backend Server

Backend API server for the Church in Cerritos mobile application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` file with your configuration:
   - Set `JWT_SECRET` to a random secure string
   - Configure Twilio: **`TWILIO_VERIFY_SERVICE_SID`** (recommended) for [Twilio Verify](https://www.twilio.com/docs/verify/api), plus `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`. Only if Verify is not used, set `TWILIO_PHONE_NUMBER` for the legacy Messages + local code flow.
   - Adjust `PORT` if needed

4. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Base URL
- `GET /` - API information

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_VERIFY_SERVICE_SID` - Twilio Verify Service SID (use Verify for login when set)
- `TWILIO_PHONE_NUMBER` - Sender number (legacy Messages flow only; optional if using Verify)
- `SMS_REQUIRE_PROVIDER` - When `true`, require real SMS config even in development
- `DB_PATH` - SQLite database file path (legacy; production often uses PostgreSQL via `DATABASE_URL`)
