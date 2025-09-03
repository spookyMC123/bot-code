# Pterodactyl User Creator Bot (Discord)

## What it does
- Adds a slash command: `/usercreate username email password confirm_password [first] [last]`.
- Calls Pterodactyl Application API (`POST /api/application/users`) to create a panel user.
- Rotating Discord presence: **Made by Joy**, *Watching Pterodactyl users*, *Listening /usercreate*.
- Input validation, error handling, optional guild/channel restrictions.

## Quick start
1. Create a Discord Bot in Developer Portal and invite it with `applications.commands` and `bot` scopes.
2. Put files in a folder, then run:
   ```bash
   npm install
