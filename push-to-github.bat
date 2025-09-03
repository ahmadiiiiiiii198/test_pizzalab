@echo off
echo 🚀 Pushing MongoDB Hero Integration to GitHub...
echo.

echo 📁 Initializing git repository...
git init
if %errorlevel% neq 0 (
    echo ❌ Git init failed
    pause
    exit /b 1
)

echo 📝 Adding remote repository...
git remote add origin https://github.com/ahmadiiiiiiii198/test_pizzalab.git
if %errorlevel% neq 0 (
    echo ⚠️ Remote might already exist, continuing...
)

echo 📦 Adding all files...
git add .
if %errorlevel% neq 0 (
    echo ❌ Git add failed
    pause
    exit /b 1
)

echo 💬 Creating commit...
git commit -m "feat: MongoDB Hero Section Integration

✅ Complete migration from Supabase to MongoDB for hero section
✅ Added MongoDB API server with Express.js
✅ Created sync system for frontend data access
✅ Implemented caching and fallback strategies
✅ Added comprehensive testing tools

Features:
- MongoDB Atlas integration
- Express API server (port 3001)
- Frontend JSON sync system
- localStorage caching
- Multiple fallback strategies
- Test page for validation

Files added:
- api-server.js - Express MongoDB API
- setup-hero-mongodb.js - MongoDB setup script
- sync-hero-to-frontend.js - Data sync script
- pizzalab/src/services/mongoHeroService.ts - MongoDB service
- pizzalab/src/hooks/use-mongo-hero.tsx - MongoDB hook
- pizzalab/public/hero-content.json - Synced data
- pizzalab/public/test-mongo-hero.html - Test page

Files modified:
- pizzalab/src/components/Hero.tsx - Updated to use MongoDB
- pizzalab/package.json - Added sync scripts"

if %errorlevel% neq 0 (
    echo ❌ Git commit failed
    pause
    exit /b 1
)

echo 🌐 Pushing to GitHub...
git branch -M main
git push -u origin main
if %errorlevel% neq 0 (
    echo ❌ Git push failed
    echo.
    echo 💡 You might need to authenticate with GitHub
    echo 💡 Or the repository might not exist yet
    pause
    exit /b 1
)

echo.
echo ✅ Successfully pushed to GitHub!
echo 🔗 Repository: https://github.com/ahmadiiiiiiii198/test_pizzalab.git
echo.
echo 📋 Summary of changes:
echo   - Hero section now uses MongoDB instead of Supabase
echo   - Complete API server for MongoDB operations
echo   - Sync system for frontend data access
echo   - Comprehensive testing and fallback strategies
echo.
pause
