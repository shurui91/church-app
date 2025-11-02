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
   - Configure Twilio credentials for SMS service
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
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `DB_PATH` - SQLite database file path
