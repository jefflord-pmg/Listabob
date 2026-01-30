# Listabob

A simple and flexible list management application.

## Quick Start

1. **Run `Listabob.exe`** - The application will start and open your browser automatically
2. **Login** - Default password is `listabob` (change it in System Settings!)
3. **Create lists** - Click "+ New List" to get started

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
  "port": 8000
}
```

- **password**: Login password (change this!)
- **port**: Port number for the web server (default: 8000)

## Data Location

Your data is stored in the `data` folder next to the executable:
- `data/listabob.db` - Your lists and data
- `config.json` - Settings and password

## Backup

Use System Settings to configure automatic backups to a folder of your choice.

## Troubleshooting

- **App won't start**: Make sure no other program is using the configured port
- **Can't connect**: Try http://localhost:8000 (or your configured port) in your browser
- **Port in use**: Change the port in config.json and restart
- **Forgot password**: Delete `config.json` and restart (default password will be reset)

## Support

Visit: https://github.com/yourusername/Listabob
