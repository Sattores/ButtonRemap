# Windows UI Automation Test for Tauri App
# Uses Windows Accessibility API to interact with the app

param(
    [string]$AppPath = ".\src-tauri\target\release\usb-configurator.exe"
)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$ErrorActionPreference = "Stop"

Write-Host "`n========================================"
Write-Host "  USB Configurator - UI Automation Test"
Write-Host "========================================`n"

# Kill existing processes
Write-Host "Cleaning up existing processes..."
Get-Process -Name "usb-configurator" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Start the application
Write-Host "Starting application..."
$process = Start-Process -FilePath $AppPath -PassThru
Start-Sleep -Seconds 3

if ($process.HasExited) {
    Write-Host "ERROR: Application exited immediately"
    exit 1
}

Write-Host "Application started (PID: $($process.Id))"

# Get UI Automation root
$automation = [System.Windows.Automation.AutomationElement]::RootElement

# Find our window
Write-Host "`nSearching for application window..."
$condition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
    $process.Id
)

$attempts = 0
$window = $null
while ($attempts -lt 10 -and $window -eq $null) {
    $window = $automation.FindFirst(
        [System.Windows.Automation.TreeScope]::Children,
        $condition
    )
    if ($window -eq $null) {
        Start-Sleep -Milliseconds 500
        $attempts++
    }
}

if ($window -eq $null) {
    Write-Host "ERROR: Could not find application window"
    $process.Kill()
    exit 1
}

Write-Host "Found window: $($window.Current.Name)"

# Test 1: Window title
Write-Host "`nTest 1: Window Title"
if ($window.Current.Name -like "*USB Configurator*") {
    Write-Host "  PASS: Title contains 'USB Configurator'"
} else {
    Write-Host "  FAIL: Title is '$($window.Current.Name)'"
}

# Test 2: Find buttons
Write-Host "`nTest 2: Finding Buttons"
$buttonCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
)
$buttons = $window.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    $buttonCondition
)
Write-Host "  Found $($buttons.Count) buttons"

if ($buttons.Count -gt 0) {
    Write-Host "  PASS: Buttons found"
    Write-Host "  Button names:"
    foreach ($btn in $buttons) {
        $name = $btn.Current.Name
        if ($name) {
            Write-Host "    - $name"
        }
    }
} else {
    Write-Host "  FAIL: No buttons found"
}

# Test 3: Find text elements
Write-Host "`nTest 3: Finding Text Elements"
$textCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Text
)
$textElements = $window.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    $textCondition
)
Write-Host "  Found $($textElements.Count) text elements"

# Test 4: Try to click a button (if any exist)
Write-Host "`nTest 4: Button Interaction"
if ($buttons.Count -gt 0) {
    $firstButton = $buttons[0]
    $invokePattern = $firstButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)

    if ($invokePattern) {
        Write-Host "  Clicking first button: '$($firstButton.Current.Name)'..."
        try {
            $invokePattern.Invoke()
            Write-Host "  PASS: Button clicked successfully"
            Start-Sleep -Seconds 1
        } catch {
            Write-Host "  FAIL: Could not click button - $_"
        }
    } else {
        Write-Host "  SKIP: Button does not support Invoke pattern"
    }
} else {
    Write-Host "  SKIP: No buttons to click"
}

# Test 5: Take screenshot
Write-Host "`nTest 5: Screenshot"
try {
    $bounds = $window.Current.BoundingRectangle
    $bitmap = New-Object System.Drawing.Bitmap([int]$bounds.Width, [int]$bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen([int]$bounds.X, [int]$bounds.Y, 0, 0, $bitmap.Size)
    $screenshotPath = ".\tests\tauri\screenshot-automation.png"
    $bitmap.Save($screenshotPath)
    Write-Host "  PASS: Screenshot saved to $screenshotPath"
    $graphics.Dispose()
    $bitmap.Dispose()
} catch {
    Write-Host "  FAIL: Could not take screenshot - $_"
}

# Cleanup
Write-Host "`nCleaning up..."
$process.Kill()
$process.WaitForExit(5000)
Write-Host "Application closed"

Write-Host "`n========================================"
Write-Host "  Test Complete"
Write-Host "========================================`n"
