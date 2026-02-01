# Listabob

A simple and flexible list management application.

## Installation & Quick Start

### Option 1: Manual Launch
1. **Run `Listabob.exe`** - The application will start and open your browser automatically
2. **Login** - Default password is `listabob` (change it in System Settings!)
3. **Create lists** - Click "+ New List" to get started

### Option 2: Auto-Start on Login (Windows Task Scheduler)

1. **Install to a permanent location:**
   ```
   C:\Users\<YourUsername>\AppData\Local\Listabob\Listabob.exe
   ```

2. **Open Task Scheduler:**
   - Press `Win + R`, type `taskschd.msc`, and press Enter
   - Or search for "Task Scheduler" in Windows Start menu

3. **Create a new task:**
   - Click "Create Task" in the right panel
   - **General tab:**
     - Name: `Listabob`
     - Check: "Run whether user is logged in or not"
     - Check: "Run with highest privileges"
   - **Triggers tab:**
     - Click "New"
     - Begin the task: "At log on"
     - Click OK
   - **Actions tab:**
     - Click "New"
     - Action: "Start a program"
     - Program/script: `C:\Users\<YourUsername>\AppData\Local\Listabob\Listabob.exe`
     - Click OK
   - **Settings tab:**
     - Uncheck: "Stop the task if it runs longer than..." (or set a high value)
     - Check: "If the task fails, restart every: 1 minute"
     - Click OK

4. **Verify it works:**
   - Restart your computer
   - Listabob should start automatically without showing a console window
   - Open your browser and go to `http://localhost:8000`

## Features

- Create custom lists with multiple column types (text, numbers, dates, checkboxes, etc.)
- Filter and sort your data
- Save favorite filter combinations
- Import/Export CSV files
- Dark/Light mode
- Backup your data

## First Time Setup

On first run, a `config.json` file will be created with a default password.
**Change the password immediately** in System Settings!

## Configuration

Edit `config.json` to change settings:

```json
{
  "password": "your-password-here",
  "port": 8000,
  "revoke_timestamp": "2026-01-01T00:00:00Z",
  "backup_path": ""
}
```

- **password**: Login password (change this!)
- **port**: Port number for the web server (default: 8000)
- **revoke_timestamp**: Change this to log out all currently authenticated users
- **backup_path**: Optional path for automatic backups

## Data & Logs Location

Your data is stored in the folder where `Listabob.exe` is located:
- `data/listabob.db` - Your lists and data
- `data/listabob.log` - Application logs (when running without console)
- `config.json` - Settings and password

If installed at `C:\Users\<YourUsername>\AppData\Local\Listabob\`:
- Data: `C:\Users\<YourUsername>\AppData\Local\Listabob\data\`
- Logs: `C:\Users\<YourUsername>\AppData\Local\Listabob\data\listabob.log`

## Backup

Use System Settings to configure automatic backups to a folder of your choice.

## Troubleshooting

- **App won't start**: Make sure no other program is using port 8000 (see Configuration)
- **Can't connect**: Try http://localhost:8000 in your browser
- **Port in use**: Edit `config.json` and change the port, then restart
- **Forgot password**: Delete `config.json` and restart (default password will be reset)
- **Task Scheduler issues**: Check `data/listabob.log` for error details
- **Console window appears despite no-console build**: This may happen on first startup - it should disappear after the app fully loads

## Support

Visit: https://github.com/jefflord-pmg/Listabob
