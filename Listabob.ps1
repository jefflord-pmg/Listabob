# Listabob PWA Launcher - Single Instance
# Brings existing window to front if running, otherwise launches new instance

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@

$appId = "hobplekbnbfhfihbofbaldmcoejpaleg"
$appUrl = "https://listabob.jefflord.com/"

# Find existing Listabob PWA process
$existing = Get-Process -Name "msedge" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*Listabob*"
}

if ($existing) {
    # Bring existing window to front
    $hwnd = $existing[0].MainWindowHandle
    if ([Win32]::IsIconic($hwnd)) {
        [Win32]::ShowWindow($hwnd, 9)  # SW_RESTORE
    }
    [Win32]::SetForegroundWindow($hwnd)
} else {
    # Launch new instance
    Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe" -ArgumentList @(
        "--profile-directory=Default",
        "--app-id=$appId",
        "--app-url=$appUrl",
        "--app-launch-source=4"
    )
}
