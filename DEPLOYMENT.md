# Zentrix AI - Deployment Guide

## Quick Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel --prod
```

## Environment Variables

### Required Environment Variables

#### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

#### OpenAI Configuration
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - OpenAI model (default: gpt-4o-mini)

#### Authentication
- `NEXTAUTH_URL` - Your deployed app URL
- `NEXTAUTH_SECRET` - Random secret string

#### Application
- `NODE_ENV` - Set to "production"
- `ALLOWED_ORIGIN` - Your deployed app URL
- `LOG_LEVEL` - Set to "info"

### Setup Environment Variables in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all required variables

## Deploy with GitHub

### 1. Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit: Zentrix AI Platform"
git branch -M main
git remote add origin https://github.com/yourusername/zentrix-ai.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Configure environment variables
6. Deploy

## Build Verification

After deployment, verify:

1. **Health Check**: `https://your-domain.com/api/health`
2. **Authentication Flow**: Visit `https://your-domain.com/login`
3. **API Endpoints**: Check `https://your-domain.com/api/workspace`
4. **Static Assets**: Verify icon and branding

## Production Checklist

- [ ] All environment variables set
- [ ] Supabase database migrations applied
- [ ] OpenAI API quota available
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring dashboard accessible
- [ ] Error logging working

## Troubleshooting

### Common Issues

1. **Build Failures**: Check `package.json` and dependencies
2. **Environment Variables**: Verify all required variables are set
3. **Database Connection**: Test Supabase connection
4. **API Errors**: Check OpenAI quota and configuration

### Debug Commands

```bash
# Check build locally
npm run build

# Test environment variables
npm run dev

# Verify API endpoints
curl https://your-domain.com/api/health
```

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Review environment variables
3. Test locally with production settings
4. Check this guide for common solutions
