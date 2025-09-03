@echo off
echo 🚀 Restructuring repository for Netlify deployment...
echo.

echo 📁 Current structure has pizzalab files in subdirectory
echo 📁 Netlify needs React app files at root level
echo.

echo 🔄 Step 1: Creating backup of current structure...
if exist backup_original (
    rmdir /s /q backup_original
)
mkdir backup_original
xcopy /e /i /h /y pizzalab backup_original\pizzalab
xcopy /y *.js backup_original\
xcopy /y *.json backup_original\
xcopy /y *.txt backup_original\
xcopy /y *.bat backup_original\
xcopy /y .gitignore backup_original\
echo ✅ Backup created in backup_original\

echo.
echo 🔄 Step 2: Moving pizzalab files to root level...

REM Move all pizzalab files to root, excluding some that should stay in root
for /d %%i in (pizzalab\*) do (
    if /i not "%%~ni"=="node_modules" (
        if exist "%%~ni" (
            rmdir /s /q "%%~ni"
        )
        move "%%i" .
    )
)

REM Move all pizzalab files (non-directories) to root
for %%i in (pizzalab\*) do (
    if not exist "%%~ni" (
        move "%%i" .
    )
)

echo ✅ Files moved to root level

echo.
echo 🔄 Step 3: Updating package.json scripts for root level...

REM The package.json is now at root level, update any scripts if needed
echo ✅ Package.json is now at root level

echo.
echo 🔄 Step 4: Cleaning up empty pizzalab directory...
if exist pizzalab (
    rmdir /s /q pizzalab
)
echo ✅ Cleaned up pizzalab directory

echo.
echo 🔄 Step 5: Updating .gitignore for root level structure...
echo # Root level gitignore for Netlify deployment > .gitignore
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
echo backup_original/ >> .gitignore
echo # Keep MongoDB scripts >> .gitignore
echo !api-server.js >> .gitignore
echo !setup-hero-mongodb.js >> .gitignore
echo !sync-hero-to-frontend.js >> .gitignore
echo ✅ Updated .gitignore

echo.
echo 🔄 Step 6: Creating netlify.toml for proper deployment...
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
echo ✅ Created netlify.toml

echo.
echo 🎉 Repository restructured for Netlify deployment!
echo.
echo 📋 Summary of changes:
echo   ✅ All React app files moved to root level
echo   ✅ package.json, index.html, src/, public/ now at root
echo   ✅ MongoDB scripts preserved at root level
echo   ✅ Updated .gitignore for new structure
echo   ✅ Created netlify.toml for deployment
echo   ✅ Backup of original structure in backup_original/
echo.
echo 🚀 Ready for Netlify deployment!
echo 📝 Next steps:
echo   1. git add .
echo   2. git commit -m "feat: Restructure for Netlify deployment"
echo   3. git push origin main
echo   4. Connect repository to Netlify
echo.
pause
