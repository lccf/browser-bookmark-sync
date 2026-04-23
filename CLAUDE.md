# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser bookmark sync plugin supporting Chrome and Safari. Bookmarks are stored locally via Chrome Storage API and can be synced to a self-hosted Node.js/Express server.

## Commands

```bash
# Server
cd server
tyarn install    # Install dependencies
tyarn start      # Start server on http://localhost:3000

# No build step required - load extensions directly
```

## Architecture

### Data Model
- **Groups**: Contain multiple bookmarks with `id`, `name`, `bookmarks[]`
- **Bookmarks**: `id`, `title`, `url`, `createdAt`
- **Storage**: Chrome `storage.local` for extension, JSON file (`server/data.json`) for server

### Sync Modes (in `popup.js`)
- `MERGE`: Merge local and server data by URL deduplication
- `LOCAL`: Upload local data to server (local overwrites server)
- `SERVER`: Download server data to local (server overwrites local)

### API Endpoints (`server/index.js`)
- `GET /api/bookmarks` - Fetch all groups and bookmarks
- `POST /api/bookmarks` - Save all groups (full overwrite)
- `POST /api/groups` - Create a new group
- `DELETE /api/groups/:id` - Delete a group
- `POST /api/groups/:groupId/bookmarks` - Add bookmark to group
- `DELETE /api/groups/:groupId/bookmarks/:bookmarkId` - Delete bookmark
- `PUT /api/groups/:groupId/bookmarks/reorder` - Reorder bookmarks

### Extension Structure
- `background.js` - Context menus (right-click to bookmark), handles `action.onClicked` to open popup.html in new tab
- `popup.js` - Full bookmark management UI (render, drag-drop, sync, import/export)
- `popup.html` - Opens as a tab (not a traditional popup), loads popup.js

## Environment

- Shell: fish
- Package manager: yarn (alias `tyarn`)
- Server port: 3000
