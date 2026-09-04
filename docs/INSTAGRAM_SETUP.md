# Instagram Setup Guide for TechGig Radar

## Overview
Instagram automation requires:
1. Instagram Business/Creator Account
2. Facebook Page (linked to Instagram)
3. Meta Developer App with permissions
4. Long-lived access token

## Step 1: Create Instagram Business Account

1. **Download Instagram app** on your phone
2. **Create a new account** (or use existing):
   - Username suggestion: `techgigradar` or `tech.gig.radar`
   - Bio: "⚡ Real Tech News. Real Global Opportunities. 🌍 Remote Jobs for Indian Developers"
3. **Go to Settings → Account → Switch to Professional Account**
4. **Choose "Creator" or "Business"**
5. **Select category**: "News & Media Website" or "Tech Company"

## Step 2: Create Facebook Page

1. Go to https://www.facebook.com/pages/create
2. Create a page:
   - Name: TechGig Radar
   - Category: News & Media Website
3. Add profile/cover photos

## Step 3: Link Instagram to Facebook Page

1. On Instagram app: Settings → Account → Sharing to other apps → Facebook
2. Or on Facebook Page: Settings → Instagram → Connect account

## Step 4: Create Meta Developer App

1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Choose "Business" app type
4. App name: "TechGig Radar Publisher"
5. Add these products:
   - Instagram Graph API
   - Facebook Login

## Step 5: Configure Permissions

In your app, go to App Review → Permissions and Features:

Request these permissions:
- `instagram_basic` - Read account info
- `instagram_content_publish` - Publish posts
- `pages_show_list` - Access pages
- `pages_read_engagement` - Read page data

## Step 6: Generate Access Token

### Option A: Graph API Explorer (for testing)
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Add permissions: instagram_basic, instagram_content_publish, pages_show_list
4. Generate token
5. Exchange for long-lived token (60 days)

### Option B: OAuth Flow (for production)
Implement OAuth flow in your app for user authentication.

## Step 7: Get Instagram Account ID

Using the access token, call:
```
GET https://graph.facebook.com/v18.0/me/accounts?access_token={TOKEN}
```

This returns your Facebook Pages. For each page, get the Instagram account:
```
GET https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}
```

The `instagram_business_account.id` is your INSTAGRAM_ACCOUNT_ID.

## Step 8: Configure Environment Variables

Add to your `.env` file:
```
# Instagram Configuration
INSTAGRAM_ENABLED=true
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id
```

## Step 9: Refresh Token (Every 60 days)

Long-lived tokens expire in 60 days. Refresh before expiry:
```
GET https://graph.facebook.com/v18.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={CURRENT_TOKEN}
```

## Troubleshooting

### "Invalid OAuth access token"
- Token expired - generate new one
- Wrong permissions - check app permissions

### "Media not ready"
- Image URL not publicly accessible
- Image too large (max 8MB)
- Wrong format (use JPG or PNG)

### "Application does not have permission"
- App review not completed
- Missing permissions

## Image Requirements

- **Feed posts**: 1080x1080px (square), 1080x1350px (portrait), 1080x608px (landscape)
- **Reels**: 1080x1920px (9:16 vertical)
- **Format**: JPG or PNG
- **Max size**: 8MB

## Rate Limits

- 25 API calls per user per hour
- 200 posts per day per account
- Wait 3+ seconds between posts

## Need Help?

Meta Developer Documentation:
https://developers.facebook.com/docs/instagram-api/guides/content-publishing
