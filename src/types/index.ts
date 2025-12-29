import type { Timestamp } from 'firebase/firestore'

// ============================================
// Base Types
// ============================================

export interface BaseEntity {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================
// Tournament
// ============================================

export type TournamentStatus = 'upcoming' | 'active' | 'completed'

export interface Tournament extends BaseEntity {
  name: string
  startDate: Timestamp
  endDate?: Timestamp
  status: TournamentStatus
}

export type CreateTournamentData = Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>

// ============================================
// Team
// ============================================

export interface Team extends BaseEntity {
  name: string
  city: string
}

export type CreateTeamData = Omit<Team, 'id' | 'createdAt' | 'updatedAt'>

// ============================================
// Player
// ============================================

export type PlayerGender = 'male' | 'female'

export interface Player extends BaseEntity {
  name: string
  number: number
  teamId: string
  gender: PlayerGender
}

export type CreatePlayerData = Omit<Player, 'id' | 'createdAt' | 'updatedAt'>

// ============================================
// Game
// ============================================

export type GameStatus = 'scheduled' | 'in_progress' | 'completed'

export interface RosterPlayer {
  playerId: string
  playerName: string
  number: number
}

export interface Game extends BaseEntity {
  tournamentId: string
  tournamentName: string
  
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  
  // Active roster for this game
  homeRoster: RosterPlayer[]
  awayRoster: RosterPlayer[]
  
  homeScore: number
  awayScore: number
  
  date: Timestamp
  status: GameStatus
}

export type CreateGameData = Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'homeScore' | 'awayScore'> & {
  homeScore?: number
  awayScore?: number
}

// ============================================
// Scoring Event
// ============================================

export interface ScoringEvent extends BaseEntity {
  gameId: string
  tournamentId: string
  
  // Which team scored
  teamId: string
  
  // Who scored
  scorerPlayerId: string
  scorerNumber: number
  scorerName: string
  
  // Who assisted (optional)
  assisterPlayerId?: string
  assisterNumber?: number
  assisterName?: string
  
  // Score after this point
  homeScore: number
  awayScore: number
}

export type CreateScoringEventData = Omit<ScoringEvent, 'id' | 'createdAt' | 'updatedAt'>

// ============================================
// History (Audit Log)
// ============================================

export type HistoryAction = 'create' | 'update' | 'delete'
export type EntityType = 'player' | 'team' | 'game' | 'tournament' | 'event'

export interface HistoryChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface HistoryEntry extends BaseEntity {
  action: HistoryAction
  entityType: EntityType
  entityId: string
  entityName: string
  
  userId: string
  userEmail: string
  
  timestamp: Timestamp
  
  // For updates - what fields changed
  changes?: HistoryChange[]
  
  // Snapshots for undo/restore
  previousSnapshot?: Record<string, unknown>
  currentSnapshot?: Record<string, unknown>
}

export type CreateHistoryEntryData = Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt'>

// ============================================
// Calculated Stats (not stored, computed from events)
// ============================================

export interface PlayerStats {
  playerId: string
  playerName: string
  playerNumber: number
  teamId: string
  goals: number
  assists: number
}

export interface TournamentStats {
  tournamentId: string
  tournamentName: string
  playerStats: PlayerStats[]
}

export interface GameStats {
  gameId: string
  playerStats: PlayerStats[]
}

