@echo off
echo 🚀 Restructuring PizzaLab repository for Netlify deployment...
echo.

echo 📋 Current issue: React app is in pizzalab/ subdirectory
echo 📋 Netlify needs: React app files at root level
echo.

echo 🔄 Step 1: Creating backup of current structure...
if exist backup_before_restructure (
    rmdir /s /q backup_before_restructure
)
mkdir backup_before_restructure
xcopy /e /i /h /y . backup_before_restructure\
echo ✅ Backup created in backup_before_restructure\

echo.
echo 🔄 Step 2: Creating mongodb-scripts folder for backend files...
if not exist mongodb-scripts (
    mkdir mongodb-scripts
)

echo.
echo 🔄 Step 3: Moving MongoDB scripts to mongodb-scripts folder...
move api-server.js mongodb-scripts\ 2>nul
move setup-hero-mongodb.js mongodb-scripts\ 2>nul
move sync-hero-to-frontend.js mongodb-scripts\ 2>nul
move test-api.js mongodb-scripts\ 2>nul
move test-mongodb.js mongodb-scripts\ 2>nul
move simple-test-api.js mongodb-scripts\ 2>nul

REM Move the root package.json (MongoDB scripts) to mongodb-scripts
move package.json mongodb-scripts\package.json 2>nul
move package-lock.json mongodb-scripts\package-lock.json 2>nul

echo ✅ MongoDB scripts moved to mongodb-scripts\

echo.
echo 🔄 Step 4: Moving React app files from pizzalab\ to root level...

REM Move all directories from pizzalab to root
for /d %%i in (pizzalab\*) do (
    if /i not "%%~ni"=="node_modules" (
        if /i not "%%~ni"=="dist" (
            if exist "%%~ni" (
                rmdir /s /q "%%~ni"
            )
            move "%%i" .
        )
    )
)

REM Move all files from pizzalab to root
for %%i in (pizzalab\*) do (
    if exist "%%~ni" (
        del "%%~ni"
    )
    move "%%i" .
)

echo ✅ React app files moved to root level

echo.
echo 🔄 Step 5: Cleaning up empty pizzalab directory...
if exist pizzalab\node_modules (
    rmdir /s /q pizzalab\node_modules
)
if exist pizzalab\dist (
    rmdir /s /q pizzalab\dist
)
if exist pizzalab (
    rmdir /s /q pizzalab
)
echo ✅ Cleaned up pizzalab directory

echo.
echo 🔄 Step 6: Creating root-level .gitignore for React app...
echo # React app gitignore > .gitignore
echo node_modules/ >> .gitignore
echo dist/ >> .gitignore
echo build/ >> .gitignore
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.development.local >> .gitignore
echo .env.test.local >> .gitignore
echo .env.production.local >> .gitignore
echo *.log >> .gitignore
echo .DS_Store >> .gitignore
echo Thumbs.db >> .gitignore
echo backup_before_restructure/ >> .gitignore
echo backup_original/ >> .gitignore
echo *.bat >> .gitignore
echo.>> .gitignore
echo # Keep MongoDB scripts accessible >> .gitignore
echo !mongodb-scripts/ >> .gitignore
echo ✅ Updated .gitignore for root level React app

echo.
echo 🔄 Step 7: Creating netlify.toml for deployment...
echo [build] > netlify.toml
echo   publish = "dist" >> netlify.toml
echo   command = "npm run build" >> netlify.toml
echo. >> netlify.toml
echo [build.environment] >> netlify.toml
echo   NODE_VERSION = "18" >> netlify.toml
echo. >> netlify.toml
echo [[redirects]] >> netlify.toml
echo   from = "/*" >> netlify.toml
echo   to = "/index.html" >> netlify.toml
echo   status = 200 >> netlify.toml
echo ✅ Created netlify.toml for SPA routing

echo.
echo 🔄 Step 8: Creating README for new structure...
echo # PizzaLab - Complete Pizzeria Management System > README.md
echo. >> README.md
echo A modern React/TypeScript pizzeria application with MongoDB integration. >> README.md
echo. >> README.md
echo ## 🚀 Quick Start >> README.md
echo. >> README.md
echo ```bash >> README.md
echo # Install dependencies >> README.md
echo npm install >> README.md
echo. >> README.md
echo # Start development server >> README.md
echo npm run dev >> README.md
echo. >> README.md
echo # Build for production >> README.md
echo npm run build >> README.md
echo ``` >> README.md
echo. >> README.md
echo ## 📁 Project Structure >> README.md
echo. >> README.md
echo - `/src/` - React application source code >> README.md
echo - `/public/` - Static assets >> README.md
echo - `/mongodb-scripts/` - MongoDB integration scripts >> README.md
echo - `netlify.toml` - Netlify deployment configuration >> README.md
echo. >> README.md
echo ## 🔧 MongoDB Integration >> README.md
echo. >> README.md
echo MongoDB scripts are located in `/mongodb-scripts/`: >> README.md
echo - `api-server.js` - Express API server >> README.md
echo - `setup-hero-mongodb.js` - Database setup >> README.md
echo - `sync-hero-to-frontend.js` - Data synchronization >> README.md
echo. >> README.md
echo ## 🌐 Deployment >> README.md
echo. >> README.md
echo This project is configured for Netlify deployment: >> README.md
echo 1. Connect your GitHub repository to Netlify >> README.md
echo 2. Netlify will automatically detect the build settings >> README.md
echo 3. Your app will be deployed with SPA routing support >> README.md
echo ✅ Created comprehensive README.md

echo.
echo 🎉 Repository restructured for Netlify deployment!
echo.
echo 📋 Summary of changes:
echo   ✅ React app files moved to root level
echo   ✅ MongoDB scripts organized in mongodb-scripts/
echo   ✅ Root-level package.json now for React app
echo   ✅ Updated .gitignore for new structure
echo   ✅ Created netlify.toml for deployment
echo   ✅ Created comprehensive README.md
echo   ✅ Backup saved in backup_before_restructure/
echo.
echo 🚀 Ready for Netlify deployment!
echo 📝 Next steps:
echo   1. git add .
echo   2. git commit -m "feat: Restructure for Netlify deployment - Move React app to root"
echo   3. git push origin main
echo   4. Connect repository to Netlify
echo   5. Deploy automatically!
echo.
pause
