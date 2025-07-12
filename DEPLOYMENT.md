# LiveCoder Deployment Guide

## Overview
This guide will help you deploy LiveCoder to production using Vercel for the frontend and a backend service for the Node.js server.

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- Railway/Render account (for backend)

## Step 1: Deploy Backend (Railway/Render)

### Option A: Railway (Recommended)
1. Go to [Railway.app](https://railway.app) and sign up
2. Connect your GitHub repository
3. Create a new project from your repository
4. Set the root directory to `/server`
5. Add environment variables:
   ```
   jDoodle_clientId=your_jdoodle_client_id
   kDoodle_clientSecret=your_jdoodle_client_secret
   ```
6. Deploy and get your backend URL (e.g., `https://your-app.railway.app`)

### Option B: Render
1. Go to [Render.com](https://render.com) and sign up
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `/server`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add environment variables as above
8. Deploy and get your backend URL

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Import your GitHub repository
3. Configure the project:
   - Framework Preset: Create React App
   - Root Directory: `/client`
   - Build Command: `npm run build`
   - Output Directory: `build`
4. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   ```
5. Deploy

## Step 3: Update CORS Configuration

After getting your Vercel frontend URL, update the backend CORS configuration:

1. In `server/index.js`, replace `'https://your-frontend-domain.vercel.app'` with your actual Vercel domain
2. Redeploy the backend

## Step 4: Test the Deployment

1. Visit your Vercel frontend URL
2. Create a room and test the functionality
3. Check that Socket.IO connections work
4. Test code compilation and submission

## Environment Variables

### Backend (.env)
```
jDoodle_clientId=your_jdoodle_client_id
kDoodle_clientSecret=your_jdoodle_client_secret
PORT=5000
```

### Frontend (Vercel Environment Variables)
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## Troubleshooting

### Common Issues:
1. **CORS errors**: Make sure your backend CORS configuration includes your Vercel domain
2. **Socket.IO connection fails**: Check that your backend URL is correct in the frontend environment variables
3. **Build fails**: Ensure all dependencies are in package.json

### Debug Steps:
1. Check browser console for errors
2. Check backend logs for connection issues
3. Verify environment variables are set correctly
4. Test Socket.IO connection manually

## Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Railway**: Free tier includes $5 credit/month
- **Render**: Free tier available with limitations

## Security Notes

1. Never commit `.env` files to version control
2. Use environment variables for all sensitive data
3. Regularly update dependencies
4. Monitor your application logs for suspicious activity 