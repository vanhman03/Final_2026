# Deployment Guide

## Prerequisites

- Supabase account
- Supabase CLI installed (`npm install -g supabase`)
- Project linked to Supabase
- Environment secrets configured

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Link to Supabase Project

```bash
supabase link --project-ref lhygwavdwdpvqplevepp
```

### 3. Start Local Supabase

```bash
supabase start
```

This starts:
- PostgreSQL database (localhost:54322)
- API server (localhost:54321)
- Studio UI (localhost:54323)
- Edge Functions runtime

### 4. Apply Migrations

```bash
npm run migrate
# or
supabase db push
```

### 5. Seed Database

```bash
npm run db:seed
# or
supabase db reset
```

### 6. Test Edge Functions Locally

```bash
npm run functions:serve
# or
supabase functions serve
```

Functions available at: `http://localhost:54321/functions/v1/{function-name}`

---

## Production Deployment

### 1. Set Production Secrets

Configure secrets in Supabase Dashboard or via CLI:

```bash
# VNPay Configuration
supabase secrets set --project-ref lhygwavdwdpvqplevepp \
  VNPAY_TMN_CODE=your-production-code \
  VNPAY_HASH_SECRET=your-production-secret \
  VNPAY_URL=https://pay.vnpay.vn/vpcpay.html

# Email Service
supabase secrets set --project-ref lhygwavdwdpvqplevepp \
  EMAIL_API_KEY=your-production-key \
  EMAIL_FROM=noreply@brightspark-kids.com

# Frontend URLs
supabase secrets set --project-ref lhygwavdwdpvqplevepp \
  FRONTEND_URL=https://www.brightspark-kids.com
```

### 2. Deploy Database Migrations

```bash
supabase db push --project-ref lhygwavdwdpvqplevepp
```

**Important:** Test migrations on staging environment first!

### 3. Deploy Edge Functions

Deploy all functions:
```bash
npm run functions:deploy:all
```

Or deploy individually:
```bash
supabase functions deploy payment-webhook --project-ref lhygwavdwdpvqplevepp
supabase functions deploy send-email --project-ref lhygwavdwdpvqplevepp
supabase functions deploy analytics --project-ref lhygwavdwdpvqplevepp
supabase functions deploy admin-tools --project-ref lhygwavdwdpvqplevepp
```

### 4. Verify Deployment

Check function logs:
```bash
supabase functions logs payment-webhook --project-ref lhygwavdwdpvqplevepp
```

Test endpoints:
```bash
curl -X POST https://lhygwavdwdpvqplevepp.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"vnp_TxnRef":"TEST","vnp_ResponseCode":"00"}'
```

---

## Environment-Specific Configuration

### Development
```env
SUPABASE_URL=http://localhost:54321
FRONTEND_URL=http://localhost:5173
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### Staging
```env
SUPABASE_URL=https://staging-project.supabase.co
FRONTEND_URL=https://staging.brightspark-kids.com
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### Production
```env
SUPABASE_URL=https://lhygwavdwdpvqplevepp.supabase.co
FRONTEND_URL=https://www.brightspark-kids.com
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
```

---

## Database Migrations Workflow

### Creating a New Migration

```bash
supabase migration new migration_name
```

Edit the generated SQL file in `supabase/migrations/`

### Testing Migration

Test locally:
```bash
supabase db reset
```

This will:
1. Drop local database
2. Apply all migrations
3. Run seed.sql

### Deploying Migration

```bash
supabase db push --project-ref lhygwavdwdpvqplevepp
```

---

## Edge Functions Workflow

### Creating a New Function

```bash
supabase functions new function-name
```

### Testing Locally

```bash
supabase functions serve function-name
```

### Deploying Function

```bash
supabase functions deploy function-name --project-ref lhygwavdwdpvqplevepp
```

### Viewing Logs

```bash
supabase functions logs function-name --project-ref lhygwavdwdpvqplevepp
```

---

## Rollback Procedures

### Rolling Back a Migration

Not directly supported by Supabase. Best practices:

1. **Backup before migration:**
   ```bash
   # Use Supabase dashboard to create backup
   ```

2. **Create reverse migration:**
   ```bash
   supabase migration new rollback_previous_change
   ```

3. **Manual rollback if needed:**
   - Restore from backup in Supabase Dashboard
   - Manually run reverse SQL statements

### Rolling Back an Edge Function

Deploy previous version:
```bash
git checkout previous-commit
supabase functions deploy function-name
```

---

## Monitoring & Maintenance

### Check Database Health

```bash
supabase db status --project-ref lhygwavdwdpvqplevepp
```

### View Edge Function Metrics

Visit Supabase Dashboard:
- `Functions > [Function Name] > Metrics`

Monitor:
- Invocations per hour
- Error rate
- Average execution time

### Database Backups

Supabase automatically backs up production databases.

Manual backup:
- Supabase Dashboard > Database > Backups > Create Backup

### Performance Optimization

1. **Monitor slow queries:**
   - Dashboard > Database > Query Performance

2. **Add indexes as needed:**
   - Create migration with new indexes

3. **Optimize RLS policies:**
   - Simplify complex EXISTS queries

---

## Troubleshooting

### Edge Function Fails to Deploy

**Error:** "Function size too large"
- **Solution:** Remove unused dependencies, optimize code

**Error:** "Invalid configuration"
- **Solution:** Check `supabase/config.toml` syntax

### Migration Fails

**Error:** "Constraint violation"
- **Solution:** Check data integrity, add data migration step

**Error:** "Permission denied"
- **Solution:** Ensure you're linked to correct project

### Function Returns 500 Error

1. Check function logs:
   ```bash
   supabase functions logs function-name
   ```

2. Verify environment secrets are set

3. Test locally with same data

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Deploy migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy Edge Functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Security Checklist

Before production deployment:

- [ ] All RLS policies enabled and tested
- [ ] Edge Function authentication verified
- [ ] Environment secrets configured (not hardcoded)
- [ ] VNPay signature verification working
- [ ] Email service credentials valid
- [ ] Admin access restricted to admin users only
- [ ] Rate limiting reviewed
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Frontend CORS configured correctly

---

## Support

For issues:
1. Check Supabase status: https://status.supabase.com
2. Review function logs
3. Consult Supabase documentation: https://supabase.com/docs
4. Check GitHub issues in repository
