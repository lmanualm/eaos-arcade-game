# Arcade Game Leaderboard API Documentation

## Overview
RESTful API server built with Node.js for managing arcade game scores and retrieving leaderboard data.

**Server Port**: Configurable via `PORT` environment variable (default: 3000)  
**Base URL**: `http://localhost:3000` (or configured port)

## API Endpoints

### GET /api/leaderboard
Returns the top 10 highest scores from the leaderboard.

**Request**
```
GET /api/leaderboard HTTP/1.1
Host: localhost:3000
```

**Response** (200 OK)
```json
{
  "scores": [
    {
      "name": "Charlie",
      "score": 200,
      "timestamp": "2026-06-10T23:47:53.923Z"
    },
    {
      "name": "Bob",
      "score": 150,
      "timestamp": "2026-06-10T23:47:53.911Z"
    },
    {
      "name": "Alice",
      "score": 100,
      "timestamp": "2026-06-10T23:47:53.896Z"
    }
  ],
  "queryTimeMs": 0
}
```

**Performance**: Query completes in <100ms (typically <1ms)  
**Caching**: Results cached for 5 seconds to optimize performance

---

### POST /api/scores
Submit a new score to the leaderboard.

**Request**
```
POST /api/scores HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Player Name",
  "score": 250
}
```

**Response** (200 OK - Success)
```json
{
  "success": true,
  "scores": [
    {
      "name": "New Player",
      "score": 250,
      "timestamp": "2026-06-10T23:48:00.000Z"
    }
  ]
}
```

**Response** (400 Bad Request - Validation Error)
```json
{
  "error": "Invalid data: name and score are required"
}
```

---

## Input Validation

### Score Submission Validation Rules

| Field | Type | Required | Rules | Error Message |
|-------|------|----------|-------|---------------|
| `name` | string | Yes | Max 50 characters | "Invalid data: name and score are required" |
| `score` | number | Yes | Must be >= 0 | "Invalid data: score cannot be negative" |

### Validation Examples

**Valid Request**
```json
{
  "name": "Alice",
  "score": 150
}
```

**Invalid - Missing name**
```json
{
  "score": 150
}
```
Response: `400 Bad Request` - "Invalid data: name and score are required"

**Invalid - Negative score**
```json
{
  "name": "Bob",
  "score": -50
}
```
Response: `400 Bad Request` - "Invalid data: score cannot be negative"

**Invalid - Non-numeric score**
```json
{
  "name": "Charlie",
  "score": "not a number"
}
```
Response: `400 Bad Request` - "Invalid data: name and score are required"

---

## HTTP Status Codes

| Code | Reason | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input data or malformed JSON |
| 404 | Not Found | Requested endpoint does not exist |
| 500 | Internal Server Error | Server error (rare) |

---

## Features

### Persistent Storage
- Scores are persisted to `scores.json` file
- Survives server restarts
- Top 10 scores automatically maintained

### Performance Optimization
- In-memory caching of top-10 scores
- Cache invalidated on score submission
- 5-second TTL for subsequent queries
- Typical query time: <1ms

### CORS Support
- All endpoints support cross-origin requests
- Configured for frontend integration

### Data Structure
Each score record contains:
- `name`: Player name (string, max 50 chars)
- `score`: Score value (integer, >= 0)
- `timestamp`: ISO 8601 timestamp of submission

---

## Running the Server

### Start with default port (3000)
```bash
node server.js
```

### Start with custom port
```bash
PORT=8080 node server.js
```

### Environment Variables
- `PORT`: Server port (default: 3000)

---

## Static Files

The server also serves static files:
- `GET /` → `index.html`
- `GET /game.js` → `game.js`
- `GET /style.css` → `style.css`

---

## Testing

### Example cURL Commands

**Get leaderboard**
```bash
curl http://localhost:3000/api/leaderboard
```

**Submit a score**
```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","score":150}'
```

**Test validation (missing name)**
```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"score":150}'
```

---

## Architecture

### Score Storage Flow
1. Player submits score via `POST /api/scores`
2. Input validation performed
3. Score added to in-memory array
4. Top 10 scores kept (sorted descending)
5. Persisted to `scores.json`
6. Cache invalidated for next query

### Leaderboard Query Flow
1. Client requests `GET /api/leaderboard`
2. Check cache (5-second TTL)
3. If expired or empty: load from `scores.json`
4. Sort and keep top 10
5. Return JSON response with query time

---

## Version
**API Version**: 1.0  
**Last Updated**: 2026-06-10
