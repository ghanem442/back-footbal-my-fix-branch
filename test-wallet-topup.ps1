# Test Admin Wallet Topup Endpoint

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Admin Wallet Topup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin
Write-Host "Step 1: Login as admin..." -ForegroundColor Yellow

$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
  -Method Post `
  -Body (@{email="admin@test.com"; password="Test@123"} | ConvertTo-Json) `
  -ContentType "application/json"

$adminToken = $adminLogin.data.accessToken
Write-Host "✓ Admin logged in" -ForegroundColor Green
Write-Host ""

# Step 2: Get player user ID
Write-Host "Step 2: Getting player user ID..." -ForegroundColor Yellow

$playerLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
  -Method Post `
  -Body (@{email="player@test.com"; password="Test@123"} | ConvertTo-Json) `
  -ContentType "application/json"

$playerId = $playerLogin.data.user.id
Write-Host "Player ID: $playerId" -ForegroundColor Gray
Write-Host ""

# Step 3: Check current balance
Write-Host "Step 3: Checking current wallet balance..." -ForegroundColor Yellow

$playerToken = $playerLogin.data.accessToken
$walletBefore = Invoke-RestMethod -Uri "$baseUrl/wallet" `
  -Method Get `
  -Headers @{Authorization = "Bearer $playerToken"}

Write-Host "Current Balance: $($walletBefore.data.balance) EGP" -ForegroundColor Gray
Write-Host ""

# Step 4: Topup wallet
Write-Host "Step 4: Topping up wallet..." -ForegroundColor Yellow

$topupAmount = 1000
$topupBody = @{
  userId = $playerId
  amount = $topupAmount
  description = "Test topup via admin endpoint"
} | ConvertTo-Json

try {
  $topupResponse = Invoke-RestMethod -Uri "$baseUrl/admin/wallet/topup" `
    -Method Post `
    -Headers @{Authorization = "Bearer $adminToken"} `
    -Body $topupBody `
    -ContentType "application/json"

  Write-Host "✓ Topup successful!" -ForegroundColor Green
  Write-Host ""
  Write-Host "=== TOPUP RESPONSE ===" -ForegroundColor Cyan
  Write-Host "Transaction ID: $($topupResponse.data.transactionId)" -ForegroundColor White
  Write-Host "User ID: $($topupResponse.data.userId)" -ForegroundColor White
  Write-Host "Amount: $($topupResponse.data.amount) EGP" -ForegroundColor White
  Write-Host "Previous Balance: $($topupResponse.data.previousBalance) EGP" -ForegroundColor White
  Write-Host "New Balance: $($topupResponse.data.newBalance) EGP" -ForegroundColor Green
  Write-Host ""
  Write-Host "Message (EN): $($topupResponse.message.en)" -ForegroundColor Gray
  Write-Host "Message (AR): $($topupResponse.message.ar)" -ForegroundColor Gray
  Write-Host ""

  # Step 5: Verify new balance
  Write-Host "Step 5: Verifying new balance..." -ForegroundColor Yellow

  $walletAfter = Invoke-RestMethod -Uri "$baseUrl/wallet" `
    -Method Get `
    -Headers @{Authorization = "Bearer $playerToken"}

  Write-Host "New Balance: $($walletAfter.data.balance) EGP" -ForegroundColor Green
  Write-Host ""

  # Step 6: Check transactions
  Write-Host "Step 6: Checking wallet transactions..." -ForegroundColor Yellow

  $transactions = Invoke-RestMethod -Uri "$baseUrl/wallet/transactions?limit=5" `
    -Method Get `
    -Headers @{Authorization = "Bearer $playerToken"}

  Write-Host "Recent Transactions:" -ForegroundColor Cyan
  foreach ($tx in $transactions.data.transactions) {
    Write-Host "  - $($tx.type): $($tx.amount) EGP" -ForegroundColor White
    Write-Host "    Balance: $($tx.balanceBefore) → $($tx.balanceAfter)" -ForegroundColor Gray
    Write-Host "    Description: $($tx.description)" -ForegroundColor Gray
    Write-Host "    Date: $($tx.createdAt)" -ForegroundColor Gray
    Write-Host ""
  }

  Write-Host "=== SUCCESS ===" -ForegroundColor Green
  Write-Host "Wallet topup completed successfully!" -ForegroundColor Green
  Write-Host "Player can now use this balance for bookings" -ForegroundColor Green

} catch {
  Write-Host "✗ Error!" -ForegroundColor Red
  Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  
  if ($_.ErrorDetails.Message) {
    Write-Host ""
    Write-Host "Response Body:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
