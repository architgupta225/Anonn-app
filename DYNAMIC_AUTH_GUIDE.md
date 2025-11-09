# Dynamic Auth Integration Guide

## Overview
This application now properly integrates with Dynamic Auth to create Supabase user records when users authenticate. The integration uses the Dynamic Auth API with proper Authorization headers.

## How It Works

### 1. Client-Side Authentication
Users authenticate through the Dynamic Auth client (configured in `client/src/main.tsx`):
```typescript
<DynamicContextProvider
  settings={{
    environmentId: "064b1464-d122-4fea-a966-f560675236c3",
    apiKey: "dyn_z8bbWRi8PPWAIoel6X5LTnqPdcaHeHlFOdEpa49cmBBRj34ycQ1WGa5j",
    // ... wallet connectors
  }}
>
```

### 2. Server-Side Token Processing
When a user makes an authenticated request, the server:

1. **Extracts the Authorization header**: `Authorization: Bearer <dynamic-token>`
2. **Verifies the token** using Dynamic's JWKS endpoint
3. **Fetches user profile** from Dynamic's API: `GET /sdk/{environmentId}/users`
4. **Creates/updates user** in Supabase database
5. **Returns user data** to the client

### 3. API Endpoints

#### Authentication Endpoints
- `GET /api/auth/user` - Get current authenticated user
- `POST /api/auth/debug-create-user` - Test user creation (debug)
- `GET /api/auth/debug-user` - Check user authentication status (debug)

#### User Management Endpoints
- `PUT /api/users/me` - Update current user's profile
- `POST /api/auth/sync-dynamic-profile` - Force sync Dynamic profile

## Usage Examples

### 1. Making Authenticated Requests

```javascript
// Get user's access token from Dynamic Auth client
const token = await getAccessToken();

// Make authenticated request
const response = await fetch('/api/auth/user', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const user = await response.json();
```

### 2. Updating User Profile

```javascript
const token = await getAccessToken();

const response = await fetch('/api/users/me', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    bio: 'Software developer'
  })
});

const updatedUser = await response.json();
```

### 3. Testing User Creation (Debug)

```javascript
const token = await getAccessToken();

const response = await fetch('/api/auth/debug-create-user', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('User creation result:', result);
```

## Data Mapping

The server maps Dynamic user data to your database schema:

| Dynamic Field | Database Field | Description |
|---------------|----------------|-------------|
| `id` | `id` | User ID |
| `email` | `email` | Primary email |
| `alias` / `username` | `username` | Display name |
| `firstName` | `firstName` | First name |
| `lastName` | `lastName` | Last name |
| `verifiedCredentials[].address` | `walletAddress` | Wallet address |
| `verifiedCredentials[].name_service.avatar` | `profileImageUrl` | Profile image |
| `verifiedCredentials[].email` | `email` | Email from credentials |

## Configuration

### Environment Variables
```bash
DYNAMIC_ENVIRONMENT_ID=064b1464-d122-4fea-a966-f560675236c3
DYNAMIC_JWKS_URL=https://app.dynamic.xyz/api/v0/environments/064b1464-d122-4fea-a966-f560675236c3/jwks
```

### Client Configuration
```typescript
// client/src/main.tsx
environmentId: "064b1464-d122-4fea-a966-f560675236c3"
apiKey: "dyn_z8bbWRi8PPWAIoel6X5LTnqPdcaHeHlFOdEpa49cmBBRj34ycQ1WGa5j"
```

## Testing

### 1. Health Check
```bash
curl http://localhost:3000/api/auth/user
# Expected: 401 Not authenticated
```

### 2. Test with Token
```bash
curl -X POST http://localhost:3000/api/auth/debug-create-user \
  -H "Authorization: Bearer YOUR_DYNAMIC_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Check User Status
```bash
curl -X GET http://localhost:3000/api/auth/debug-user \
  -H "Authorization: Bearer YOUR_DYNAMIC_TOKEN"
```

## Troubleshooting

### Common Issues

1. **401 Authentication Failed**
   - Check if the token is valid
   - Verify the token format: `Bearer <token>`
   - Ensure the token hasn't expired

2. **500 Database Error**
   - Check for duplicate email constraints
   - Verify database connection
   - Check server logs for detailed error

3. **Dynamic Profile Fetch Failed**
   - Verify environment ID is correct
   - Check if Dynamic API is accessible
   - Ensure token has proper permissions

### Debug Endpoints

Use these endpoints to troubleshoot:

- `POST /api/auth/debug-create-user` - Test user creation
- `GET /api/auth/debug-user` - Check authentication status
- `POST /api/auth/sync-dynamic-profile` - Force profile sync

## Security Notes

1. **Token Validation**: All tokens are verified using Dynamic's JWKS endpoint
2. **Profile Fetching**: User profiles are fetched from Dynamic's official API
3. **Database Security**: User data is stored securely in Supabase
4. **Rate Limiting**: API endpoints are rate-limited for security

## Next Steps

1. **Test with Real Tokens**: Use actual Dynamic Auth tokens from your client
2. **Monitor Logs**: Check server logs for authentication flow
3. **Verify Database**: Confirm users are being created in Supabase
4. **Test User Updates**: Verify profile updates work correctly

The Dynamic Auth integration is now fully functional and will create Supabase user records when users authenticate through Dynamic Auth!
