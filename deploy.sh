#!/bin/bash

echo "🚀 LiveCoder Deployment Script"
echo "=============================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    exit 1
fi

echo "✅ Git repository found"

# Build frontend
echo "📦 Building frontend..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

echo "✅ Frontend built successfully"

# Check for environment variables
echo "🔧 Checking environment variables..."

if [ ! -f "server/.env" ]; then
    echo "⚠️  No .env file found in server directory"
    echo "   Please create server/.env with:"
    echo "   jDoodle_clientId=your_client_id"
    echo "   kDoodle_clientSecret=your_client_secret"
    echo "   PORT=5000"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for deployment'"
echo "   git push origin main"
echo ""
echo "2. Deploy Backend:"
echo "   - Go to Railway.app or Render.com"
echo "   - Connect your GitHub repository"
echo "   - Set root directory to '/server'"
echo "   - Add environment variables"
echo "   - Deploy and get your backend URL"
echo ""
echo "3. Deploy Frontend:"
echo "   - Go to Vercel.com"
echo "   - Import your GitHub repository"
echo "   - Set root directory to '/client'"
echo "   - Add REACT_APP_BACKEND_URL environment variable"
echo "   - Deploy"
echo ""
echo "4. Update CORS:"
echo "   - Update server/index.js with your Vercel domain"
echo "   - Redeploy backend"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions" 