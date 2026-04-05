# Complete Fix for basePrice Issue
# This script will:
# 1. Run migration to add basePrice column
# 2. Update existing fields with default price
# 3. Restart the server
# 4. Test the endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix basePrice Issue - Complete Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Run Migration
Write-Host "Step 1: Running Prisma Migration..." -ForegroundColor Yellow
Write-Host "Command: npx prisma migrate dev --name add_base_price_to_field" -ForegroundColor Gray
Write-Host ""

try {
    npx prisma migrate dev --name add_base_price_to_field
    Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Migration failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. Database is running" -ForegroundColor White
    Write-Host "2. DATABASE_URL in .env is correct" -ForegroundColor White
    Write-Host "3. You have write permissions" -ForegroundColor White
    exit
}

# Step 2: Update Existing Fields
Write-Host "Step 2: Updating existing fields with default basePrice..." -ForegroundColor Yellow
Write-Host ""

$defaultPrice = Read-Host "Enter default price for existing fields (press Enter for 300.00)"
if ([string]::IsNullOrWhiteSpace($defaultPrice)) {
    $defaultPrice = "300.00"
}

Write-Host "Setting basePrice = $defaultPrice for all fields where basePrice IS NULL" -ForegroundColor Gray
Write-Host ""

# You need to run this SQL manually or through Prisma Studio
Write-Host "SQL Command to run:" -ForegroundColor Cyan
Write-Host "UPDATE `"Field`" SET `"basePrice`" = $defaultPrice WHERE `"basePrice`" IS NULL;" -ForegroundColor White
Write-Host ""

$runSql = Read-Host "Do you want to run this SQL now? (y/n)"
if ($runSql -eq "y" -or $runSql -eq "Y") {
    try {
        # Using psql to run the SQL
        $env:PGPASSWORD = ""
        
        # Get database connection details from .env
        if (Test-Path ".env") {
            $envContent = Get-Content ".env"
            $dbUrl = ($envContent | Select-String "DATABASE_URL").ToString()
            
            if ($dbUrl) {
                Write-Host "Found DATABASE_URL in .env" -ForegroundColor Green
                Write-Host ""
                Write-Host "Running SQL update..." -ForegroundColor Yellow
                
                # Execute raw SQL using Prisma
                $sqlCommand = "UPDATE \`"Field\`" SET \`"basePrice\`" = $defaultPrice WHERE \`"basePrice\`" IS NULL;"
                
                # Create a temporary SQL file
                $sqlCommand | Out-File -FilePath "temp_update.sql" -Encoding UTF8
                
                # Run using npx prisma db execute
                npx prisma db execute --file temp_update.sql --schema prisma/schema.prisma
                
                # Clean up
                Remove-Item "temp_update.sql" -ErrorAction SilentlyContinue
                
                Write-Host "✓ Fields updated successfully!" -ForegroundColor Green
                Write-Host ""
            } else {
                Write-Host "⚠ Could not find DATABASE_URL" -ForegroundColor Yellow
                Write-Host "Please run the SQL manually in your database client" -ForegroundColor Yellow
                Write-Host ""
            }
        }
    } catch {
        Write-Host "⚠ Could not run SQL automatically" -ForegroundColor Yellow
        Write-Host "Please run this SQL manually:" -ForegroundColor Yellow
        Write-Host "UPDATE `"Field`" SET `"basePrice`" = $defaultPrice WHERE `"basePrice`" IS NULL;" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "⚠ Skipped SQL update" -ForegroundColor Yellow
    Write-Host "Remember to run this SQL manually later!" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Generate Prisma Client
Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
Write-Host ""

try {
    npx prisma generate
    Write-Host "✓ Prisma Client generated!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠ Warning: Could not generate Prisma Client" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Restart Server
Write-Host "Step 4: Server Restart Required" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please restart your NestJS server:" -ForegroundColor Cyan
Write-Host "  npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "Or if running in Docker:" -ForegroundColor Cyan
Write-Host "  docker-compose restart" -ForegroundColor White
Write-Host ""

$continueTest = Read-Host "Press Enter when server is restarted to continue with testing..."

# Step 5: Test the Endpoints
Write-Host ""
Write-Host "Step 5: Testing Endpoints..." -ForegroundColor Yellow
Write-Host ""

$baseUrl = "http://localhost:3000"

# Login first
Write-Host "Logging in to get token..." -ForegroundColor Gray
$email = Read-Host "Enter email (or press Enter for test@example.com)"
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = "test@example.com"
}

$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host ""
    
    # Test GET /fields
    Write-Host "Testing GET /fields..." -ForegroundColor Gray
    $headers = @{Authorization = "Bearer $token"}
    
    $fieldsResponse = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get -Headers $headers
    
    Write-Host "✓ GET /fields successful!" -ForegroundColor Green
    Write-Host ""
    
    if ($fieldsResponse.data.Count -gt 0) {
        $firstField = $fieldsResponse.data[0]
        
        Write-Host "=== First Field Details ===" -ForegroundColor Cyan
        Write-Host "ID: $($firstField.id)" -ForegroundColor White
        Write-Host "Name: $($firstField.name)" -ForegroundColor White
        Write-Host "Address: $($firstField.address)" -ForegroundColor White
        
        if ($firstField.basePrice) {
            Write-Host "basePrice: $($firstField.basePrice) ✅" -ForegroundColor Green
            Write-Host ""
            Write-Host "SUCCESS! basePrice is now available!" -ForegroundColor Green
            Write-Host "Flutter app should now display the price correctly" -ForegroundColor Green
        } else {
            Write-Host "basePrice: NULL ❌" -ForegroundColor Red
            Write-Host ""
            Write-Host "WARNING: basePrice is still NULL!" -ForegroundColor Red
            Write-Host "Please run the SQL update manually:" -ForegroundColor Yellow
            Write-Host "UPDATE `"Field`" SET `"basePrice`" = $defaultPrice WHERE id = '$($firstField.id)';" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "Full Field Object:" -ForegroundColor Cyan
        Write-Host ($firstField | ConvertTo-Json -Depth 5) -ForegroundColor Gray
        
    } else {
        Write-Host "⚠ No fields found" -ForegroundColor Yellow
        Write-Host "Create a field first with basePrice" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps for Flutter App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Logout and Login again in Flutter app" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   Do Hot Restart (Ctrl+Shift+F5)" -ForegroundColor White
Write-Host ""
Write-Host "2. Pull to refresh on home page" -ForegroundColor White
Write-Host ""
Write-Host "3. Open field details again" -ForegroundColor White
Write-Host ""
Write-Host "4. Price should now show: '400 EGP/hr' instead of '—'" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
