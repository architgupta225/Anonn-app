# 🚀 Anonn Platform - Production Setup Guide

This guide will help you deploy the Anonn platform with Dynamic authentication and Supabase database in production.

## 📋 Prerequisites

Before starting, ensure you have:

- Node.js 18+ and npm
- A Supabase project
- A Dynamic account and app configured
- A domain name (for production deployment)

## 🔧 Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Dynamic Auth Configuration
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id_here
DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id_here
DYNAMIC_JWKS_URL=https://app.dynamic.xyz/api/v0/environments/your_dynamic_environment_id_here/jwks
DYNAMIC_WEBHOOK_SECRET=your_webhook_secret_here

# Supabase Configuration
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com

# Security (generate random strings for these)
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here
```

## 🏗️ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Wait for the project to be fully initialized

### 1.2 Get Database Connection Details
1. Go to Settings → Database
2. Copy the connection string (use the pooled connection for production)
3. Update `DATABASE_URL` in your `.env` file

### 1.3 Get API Keys
1. Go to Settings → API
2. Copy the `anon/public` key → `SUPABASE_ANON_KEY`
3. Copy the `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. Copy the project URL → `SUPABASE_URL`

### 1.4 Configure Database
1. The application will automatically create tables when you run it
2. Make sure your Supabase project allows connections from your deployment platform

## 🔐 Step 2: Dynamic Auth Setup

### 2.1 Create Dynamic Account
1. Go to [Dynamic](https://www.dynamic.xyz/)
2. Create an account and new app
3. Configure your app settings

### 2.2 Get Environment ID
1. In your Dynamic dashboard, go to Settings → Environments
2. Copy your Environment ID → `VITE_DYNAMIC_ENVIRONMENT_ID` and `DYNAMIC_ENVIRONMENT_ID`

### 2.3 Configure Webhooks
1. In Dynamic dashboard, go to Webhooks
2. Add a webhook endpoint: `https://your-domain.com/api/webhooks/dynamic`
3. Select events: `user.created`, `user.updated`
4. Copy the webhook secret → `DYNAMIC_WEBHOOK_SECRET`

### 2.4 Configure Allowed Origins
1. In Dynamic dashboard, go to Settings → CORS
2. Add your domain: `https://your-domain.com`
3. For development, also add: `http://localhost:3000`

## 🚀 Step 3: Deployment

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Build the Application
```bash
npm run build
```

### 3.3 Deploy to Your Platform

#### For Vercel:
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy

#### For Railway:
1. Connect your GitHub repository to Railway
2. Add all environment variables in Railway dashboard
3. Deploy

#### For DigitalOcean App Platform:
1. Create a new app from your GitHub repository
2. Add all environment variables
3. Deploy

#### For Traditional VPS:
```bash
# Install PM2 for process management
npm install -g pm2

# Start the application
NODE_ENV=production pm2 start npm --name "anonn" -- start

# Setup PM2 to restart on system reboot
pm2 startup
pm2 save
```

## 🔒 Step 4: Security Configuration

### 4.1 SSL Certificate
Ensure your domain has a valid SSL certificate (Let's Encrypt recommended).

### 4.2 Firewall Rules
- Allow HTTPS (443) and HTTP (80) traffic
- Block all other ports except SSH (22)

### 4.3 Environment Variables Security
- Never commit `.env` files to version control
- Use your deployment platform's environment variable system
- Rotate secrets regularly

## 📊 Step 5: Database Migration

### 5.1 Push Schema to Supabase
```bash
npm run db:push
```

### 5.2 Verify Tables
Check in Supabase dashboard that all tables were created:
- users
- organizations
- bowls
- posts
- comments
- votes
- notifications
- And others...

## ✅ Step 6: Testing

### 6.1 Health Check
Visit: `https://your-domain.com/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 123.456
}
```

### 6.2 Authentication Test
1. Go to your domain
2. Click "Continue" to authenticate with Dynamic
3. Complete your profile
4. Verify you can access the platform

### 6.3 Webhook Test
1. Create a new user account
2. Check Supabase to ensure user was created
3. Check server logs for webhook processing

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Authentication required" errors
- Check Dynamic environment ID is correct
- Verify CORS settings in Dynamic dashboard
- Ensure webhook secret is configured

#### 2. Database connection errors
- Verify DATABASE_URL is correct
- Check Supabase project is running
- Ensure IP whitelist includes your deployment platform

#### 3. Webhook not working
- Check webhook URL is accessible
- Verify webhook secret matches
- Check server logs for errors

#### 4. CORS errors
- Add your domain to Dynamic CORS settings
- Verify CORS_ORIGIN environment variable

## 📈 Step 7: Monitoring

### 7.1 Logs
Monitor application logs for:
- Authentication errors
- Database connection issues
- Webhook failures

### 7.2 Performance
Monitor:
- Response times
- Database query performance
- Memory usage

### 7.3 Error Tracking
Consider integrating:
- Sentry for error tracking
- LogRocket for user session recording
- New Relic for performance monitoring

## 🔄 Step 8: Backup Strategy

### 8.1 Database Backups
Supabase automatically creates backups, but you can also:
```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 8.2 Code Backups
- Use Git for version control
- Tag releases
- Keep multiple deployment branches

## 🎯 Next Steps

After successful deployment:

1. **Custom Domain**: Configure your custom domain
2. **Email Setup**: Configure email notifications
3. **Analytics**: Add Google Analytics or similar
4. **CDN**: Configure CloudFlare for performance
5. **Monitoring**: Set up uptime monitoring
6. **Backup**: Implement automated backup strategy

## 📞 Support

If you encounter issues:

1. Check the server logs
2. Verify all environment variables
3. Test each component individually
4. Check Dynamic and Supabase dashboards for errors

---

## 🚨 Security Checklist

Before going live, ensure:

- [ ] All environment variables are set securely
- [ ] SSL certificate is valid
- [ ] Webhook signatures are verified
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Database access is restricted
- [ ] Sensitive data is encrypted
- [ ] Regular security updates are planned

---

*This setup creates a production-ready deployment of the Anonn platform with Dynamic authentication and Supabase database. The platform will handle user authentication, profile management, and all social features securely.*
