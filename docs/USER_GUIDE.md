# Ulti Stats - User Guide

A comprehensive web application for tracking Ultimate Frisbee tournament statistics in real-time.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Application Flow](#application-flow)
4. [Features](#features)
   - [Authentication](#authentication)
   - [Tournament Management](#tournament-management)
   - [Team Management](#team-management)
   - [Player Management](#player-management)
   - [Game Tracking](#game-tracking)
   - [Statistics & MVP](#statistics--mvp)
   - [History & Audit Log](#history--audit-log)
5. [Data Model](#data-model)

---

## Overview

Ulti Stats is designed for tournament organizers and statisticians to:
- Track live game scores during Ultimate Frisbee tournaments
- Record individual player statistics (goals and assists)
- Automatically calculate MVPs by gender
- Maintain a complete audit history of all changes
- Export statistics to Excel

---

## Getting Started

### Sign In

1. Navigate to the application URL
2. Click **"Sign in with Google"**
3. Only pre-approved email addresses can access the app (managed via Firebase `allowedEmails` collection)

### Select a Tournament

After signing in, you'll see the tournament selector:
- **Create New Tournament**: Enter name and start date
- **Select Existing**: Choose from dropdown to switch between tournaments

> ⚠️ All data (teams, games, stats) is scoped to the selected tournament

---

## Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        SIGN IN                               │
│                   (Google Auth + Allowlist)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SELECT/CREATE TOURNAMENT                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│   TEAMS   │  │   GAMES   │  │  PLAYERS  │  │  HISTORY  │
│  (Setup)  │  │ (Tracking)│  │  (Stats)  │  │  (Audit)  │
└─────┬─────┘  └─────┬─────┘  └───────────┘  └───────────┘
      │              │
      ▼              ▼
┌───────────┐  ┌───────────────────────────────────────┐
│  PLAYERS  │  │           LIVE GAME TRACKING          │
│  (Roster) │  │  1. Select Team → 2. Assist → 3. Goal │
└───────────┘  └───────────────────────────────────────┘
```

### Typical Workflow

1. **Before Tournament**: Create teams and add players with jersey numbers
2. **Start Game**: Create a game, select rosters, start tracking
3. **During Game**: Record each point (assist → goal flow)
4. **After Game**: Mark as complete, view statistics
5. **End of Tournament**: Export stats, view MVPs

---

## Features

### Authentication

- **Google Sign-In**: Secure authentication via Firebase
- **Email Allowlist**: Only pre-approved emails can access
- **Persistent Session**: Stay logged in across browser sessions

### Tournament Management

| Action | Description |
|--------|-------------|
| Create | New tournament with name and start date |
| Select | Switch between tournaments via dropdown |
| Edit | Modify tournament name/dates |
| Complete | Mark tournament as finished |

> All teams, players, games, and stats are tournament-scoped

### Team Management

**Location**: `/teams`

| Action | Description |
|--------|-------------|
| Add Team | Create team with name and city |
| Edit Team | Modify team details |
| Delete Team | Remove team (with confirmation) |
| Manage Players | Click player count to manage roster |

**Team Fields**:
- Name (required)
- City (required)

### Player Management

**Location**: Accessed via Teams page → Player count button

| Action | Description |
|--------|-------------|
| Add Player | Name, jersey number, gender |
| Edit Player | Modify player details |
| Delete Player | Remove from roster |

**Player Fields**:
- Name (required)
- Jersey Number (required, unique per team)
- Gender (Male/Female - used for MVP calculation)

### Game Tracking

**Location**: `/games`

#### Creating a Game

1. Click **"New Game"**
2. Select home and away teams
3. Choose active roster for each team (players who will play)
4. Click **"Create Game"**

#### Live Scoring Flow

When tracking a game in progress:

```
Step 1: Which team scored?
        [Home Team]  [Away Team]

Step 2: Who made the assist?
        [Player Grid]  [No Assist (Skip)]

Step 3: Who scored the goal?
        [Player Grid - excludes assister]
```

#### Game Actions

| Action | Description |
|--------|-------------|
| Start | Begin tracking (scheduled → in_progress) |
| Continue | Resume tracking an active game |
| View | See completed game stats |
| End Game | Mark as completed |
| Undo | Remove last scoring event |
| Delete | Remove entire game |

#### Game Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Scheduled | Gray | Created but not started |
| In Progress | Blue | Currently being played |
| Completed | Outline | Game finished |

### Statistics & MVP

**Location**: `/players`

#### Player Statistics Table

Displays all players with:
- Rank (by total points)
- Name, Number, Gender, Team
- Goals scored
- Assists made
- Total points (goals + assists)

#### MVP Display

Automatically calculated MVPs:
- 🏆 **Male MVP**: Male player with highest total points
- 👑 **Female MVP**: Female player with highest total points

> Tiebreaker: Goals → Alphabetical name

#### Export to Excel

Click **"View Full Stats"** → **"Export to Excel"**

Exports include:
- Player rankings
- Individual statistics
- Tournament summary

### History & Audit Log

**Location**: `/history`

Complete audit trail of all changes:

#### Tracked Actions

| Action | Description |
|--------|-------------|
| Create | New entity created |
| Update | Entity modified (shows before/after) |
| Delete | Entity removed |

#### Tracked Entities

- 🏆 Tournaments
- 👥 Teams
- 🏃 Players
- 🎮 Games
- 🥏 Scoring Events

#### History Features

| Feature | Description |
|---------|-------------|
| Filter by Type | Show only specific entity types |
| Filter by Action | Show only create/update/delete |
| View Details | See what exactly changed |
| Undo | Restore deleted items |
| Permanent Delete | Remove history entry |

---

## Data Model

### Entities

```
Tournament
├── id, name, startDate, endDate, status
│
├── Teams
│   ├── id, name, city
│   │
│   └── Players
│       └── id, name, number, gender
│
└── Games
    ├── id, homeTeam, awayTeam, status
    ├── homeRoster[], awayRoster[]
    ├── homeScore, awayScore
    │
    └── ScoringEvents
        └── id, scorer, assister, scores
```

### Firestore Collections

| Collection | Description |
|------------|-------------|
| `tournaments` | Tournament definitions |
| `teams` | Team records |
| `players` | Player records |
| `games` | Game records with rosters |
| `events` | Individual scoring events |
| `history` | Audit log entries |
| `allowedEmails` | Auth allowlist |

---

## Tips & Best Practices

1. **Set up teams and players before the tournament** - Makes game creation faster
2. **Use consistent jersey numbers** - Helps with quick identification during live tracking
3. **Track assists accurately** - They count toward MVP totals
4. **Use "No Assist" when appropriate** - Not every goal has an assist
5. **Review history** - You can undo mistakes
6. **Export stats regularly** - Keep backups of important data

---

## Keyboard Shortcuts

Currently, the app is optimized for touch/click interaction during live games. Keyboard shortcuts may be added in future updates.

---

## Support

For issues or feature requests, contact the tournament administrator or create an issue in the project repository.

