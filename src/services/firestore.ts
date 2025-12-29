import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/config/firebase'

// Helper to wait for auth state to be ready
const waitForAuth = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // If already have a user, resolve immediately
    if (auth.currentUser) {
      resolve(true)
      return
    }
    // Otherwise wait for auth state to be determined
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(!!user)
    })
  })
}
import type {
  Tournament,
  CreateTournamentData,
  Team,
  CreateTeamData,
  Player,
  CreatePlayerData,
  Game,
  CreateGameData,
  ScoringEvent,
  CreateScoringEventData,
  HistoryEntry,
  CreateHistoryEntryData,
  HistoryAction,
  EntityType,
  PlayerStats,
} from '@/types'

// ============================================
// Collection References
// ============================================

const tournamentsRef = collection(db, 'tournaments')
const teamsRef = collection(db, 'teams')
const playersRef = collection(db, 'players')
const gamesRef = collection(db, 'games')
const eventsRef = collection(db, 'events')
const historyRef = collection(db, 'history')

// ============================================
// Helper: Add timestamps
// ============================================

const withTimestamps = <T extends object>(data: T) => ({
  ...data,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
})

const withUpdatedAt = <T extends object>(data: T) => ({
  ...data,
  updatedAt: Timestamp.now(),
})

// ============================================
// History Service
// ============================================

export async function createHistoryEntry(
  action: HistoryAction,
  entityType: EntityType,
  entityId: string,
  entityName: string,
  options?: {
    changes?: { field: string; oldValue: unknown; newValue: unknown }[]
    previousSnapshot?: Record<string, unknown>
    currentSnapshot?: Record<string, unknown>
  }
): Promise<void> {
  const user = auth.currentUser
  if (!user) return

  const historyData: CreateHistoryEntryData = {
    action,
    entityType,
    entityId,
    entityName,
    userId: user.uid,
    userEmail: user.email || 'unknown',
    timestamp: Timestamp.now(),
    ...options,
  }

  await addDoc(historyRef, withTimestamps(historyData))
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const q = query(historyRef, orderBy('timestamp', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HistoryEntry))
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const docRef = doc(historyRef, id)
  await deleteDoc(docRef)
}

// ============================================
// Tournament Service
// ============================================

export async function getTournaments(): Promise<Tournament[]> {
  // Wait for auth state to be ready (important on page reload)
  const isAuthenticated = await waitForAuth()
  if (!isAuthenticated) {
    return []
  }
  
  const snapshot = await getDocs(tournamentsRef)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Tournament))
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const docRef = doc(tournamentsRef, id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Tournament
}

export async function createTournament(data: CreateTournamentData): Promise<Tournament> {
  const docRef = await addDoc(tournamentsRef, withTimestamps(data))
  const created = { id: docRef.id, ...data } as Tournament

  // Don't await history - let it run in background
  createHistoryEntry('create', 'tournament', docRef.id, data.name, {
    currentSnapshot: data as unknown as Record<string, unknown>,
  }).catch(() => {})

  return created
}

export async function updateTournament(
  id: string,
  data: Partial<CreateTournamentData>,
  previousData: Tournament
): Promise<void> {
  const docRef = doc(tournamentsRef, id)
  await updateDoc(docRef, withUpdatedAt(data))

  const changes = Object.keys(data).map((field) => ({
    field,
    oldValue: previousData[field as keyof Tournament],
    newValue: data[field as keyof CreateTournamentData],
  }))

  await createHistoryEntry('update', 'tournament', id, previousData.name, {
    changes,
    previousSnapshot: previousData as unknown as Record<string, unknown>,
    currentSnapshot: { ...previousData, ...data } as unknown as Record<string, unknown>,
  })
}

export async function deleteTournament(tournament: Tournament): Promise<void> {
  const docRef = doc(tournamentsRef, tournament.id)
  await deleteDoc(docRef)

  await createHistoryEntry('delete', 'tournament', tournament.id, tournament.name, {
    previousSnapshot: tournament as unknown as Record<string, unknown>,
  })
}

// ============================================
// Team Service
// ============================================

export async function getTeams(): Promise<Team[]> {
  const q = query(teamsRef, orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Team))
}

export async function getTeam(id: string): Promise<Team | null> {
  const docRef = doc(teamsRef, id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Team
}

export async function createTeam(data: CreateTeamData): Promise<Team> {
  const docRef = await addDoc(teamsRef, withTimestamps(data))
  const created = { id: docRef.id, ...data } as Team

  await createHistoryEntry('create', 'team', docRef.id, data.name, {
    currentSnapshot: data as unknown as Record<string, unknown>,
  })

  return created
}

export async function updateTeam(
  id: string,
  data: Partial<CreateTeamData>,
  previousData: Team
): Promise<void> {
  const docRef = doc(teamsRef, id)
  await updateDoc(docRef, withUpdatedAt(data))

  const changes = Object.keys(data).map((field) => ({
    field,
    oldValue: previousData[field as keyof Team],
    newValue: data[field as keyof CreateTeamData],
  }))

  await createHistoryEntry('update', 'team', id, previousData.name, {
    changes,
    previousSnapshot: previousData as unknown as Record<string, unknown>,
    currentSnapshot: { ...previousData, ...data } as unknown as Record<string, unknown>,
  })
}

export async function deleteTeam(team: Team): Promise<void> {
  const docRef = doc(teamsRef, team.id)
  await deleteDoc(docRef)

  await createHistoryEntry('delete', 'team', team.id, team.name, {
    previousSnapshot: team as unknown as Record<string, unknown>,
  })
}

// ============================================
// Player Service
// ============================================

export async function getPlayers(): Promise<Player[]> {
  const q = query(playersRef, orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player))
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const q = query(playersRef, where('teamId', '==', teamId), orderBy('number'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player))
}

export async function createPlayer(data: CreatePlayerData): Promise<Player> {
  const docRef = await addDoc(playersRef, withTimestamps(data))
  const created = { id: docRef.id, ...data } as Player

  await createHistoryEntry('create', 'player', docRef.id, data.name, {
    currentSnapshot: data as unknown as Record<string, unknown>,
  })

  return created
}

export async function updatePlayer(
  id: string,
  data: Partial<CreatePlayerData>,
  previousData: Player
): Promise<void> {
  const docRef = doc(playersRef, id)
  await updateDoc(docRef, withUpdatedAt(data))

  const changes = Object.keys(data).map((field) => ({
    field,
    oldValue: previousData[field as keyof Player],
    newValue: data[field as keyof CreatePlayerData],
  }))

  await createHistoryEntry('update', 'player', id, previousData.name, {
    changes,
    previousSnapshot: previousData as unknown as Record<string, unknown>,
    currentSnapshot: { ...previousData, ...data } as unknown as Record<string, unknown>,
  })
}

export async function deletePlayer(player: Player): Promise<void> {
  const docRef = doc(playersRef, player.id)
  await deleteDoc(docRef)

  await createHistoryEntry('delete', 'player', player.id, player.name, {
    previousSnapshot: player as unknown as Record<string, unknown>,
  })
}

// ============================================
// Game Service
// ============================================

export async function getGames(): Promise<Game[]> {
  const q = query(gamesRef, orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Game))
}

export async function getGamesByTournament(tournamentId: string): Promise<Game[]> {
  // Simple query without orderBy to avoid needing composite index
  const q = query(gamesRef, where('tournamentId', '==', tournamentId))
  const snapshot = await getDocs(q)
  const games = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Game))
  // Sort in memory by date descending
  return games.sort((a, b) => b.date.toMillis() - a.date.toMillis())
}

export async function getGame(id: string): Promise<Game | null> {
  const docRef = doc(gamesRef, id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Game
}

export async function createGame(data: CreateGameData): Promise<Game> {
  const gameData = {
    ...data,
    homeScore: data.homeScore ?? 0,
    awayScore: data.awayScore ?? 0,
  }
  const docRef = await addDoc(gamesRef, withTimestamps(gameData))
  const created = { id: docRef.id, ...gameData } as Game

  const gameName = `${data.homeTeamName} vs ${data.awayTeamName}`
  await createHistoryEntry('create', 'game', docRef.id, gameName, {
    currentSnapshot: gameData as unknown as Record<string, unknown>,
  })

  return created
}

export async function updateGame(
  id: string,
  data: Partial<CreateGameData>,
  previousData: Game
): Promise<void> {
  const docRef = doc(gamesRef, id)
  await updateDoc(docRef, withUpdatedAt(data))

  const gameName = `${previousData.homeTeamName} vs ${previousData.awayTeamName}`
  const changes = Object.keys(data).map((field) => ({
    field,
    oldValue: previousData[field as keyof Game],
    newValue: data[field as keyof CreateGameData],
  }))

  await createHistoryEntry('update', 'game', id, gameName, {
    changes,
    previousSnapshot: previousData as unknown as Record<string, unknown>,
    currentSnapshot: { ...previousData, ...data } as unknown as Record<string, unknown>,
  })
}

export async function deleteGame(game: Game): Promise<void> {
  // Delete all events for this game first
  const eventsQuery = query(eventsRef, where('gameId', '==', game.id))
  const eventsSnapshot = await getDocs(eventsQuery)

  const batch = writeBatch(db)
  eventsSnapshot.docs.forEach((eventDoc) => {
    batch.delete(eventDoc.ref)
  })
  batch.delete(doc(gamesRef, game.id))
  await batch.commit()

  const gameName = `${game.homeTeamName} vs ${game.awayTeamName}`
  await createHistoryEntry('delete', 'game', game.id, gameName, {
    previousSnapshot: game as unknown as Record<string, unknown>,
  })
}

// ============================================
// Scoring Event Service
// ============================================

export async function getEventsByGame(gameId: string): Promise<ScoringEvent[]> {
  // Simple query without orderBy to avoid needing composite index
  const q = query(eventsRef, where('gameId', '==', gameId))
  const snapshot = await getDocs(q)
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ScoringEvent))
  // Sort in memory by createdAt ascending
  return events.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
}

export async function getEventsByTournament(tournamentId: string): Promise<ScoringEvent[]> {
  // Simple query without orderBy to avoid needing composite index
  const q = query(eventsRef, where('tournamentId', '==', tournamentId))
  const snapshot = await getDocs(q)
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ScoringEvent))
  // Sort in memory by createdAt ascending
  return events.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
}

export async function createScoringEvent(
  data: CreateScoringEventData,
  game: Game
): Promise<ScoringEvent> {
  const docRef = await addDoc(eventsRef, withTimestamps(data))
  const created = { id: docRef.id, ...data } as ScoringEvent

  // Update game score
  const isHomeTeam = data.teamId === game.homeTeamId
  await updateDoc(doc(gamesRef, game.id), {
    homeScore: isHomeTeam ? data.homeScore : game.homeScore,
    awayScore: !isHomeTeam ? data.awayScore : game.awayScore,
    updatedAt: Timestamp.now(),
  })

  const eventName = `${data.scorerName} goal${data.assisterName ? ` (assist: ${data.assisterName})` : ''}`
  await createHistoryEntry('create', 'event', docRef.id, eventName, {
    currentSnapshot: data as unknown as Record<string, unknown>,
  })

  return created
}

export async function deleteScoringEvent(
  event: ScoringEvent,
  game: Game
): Promise<void> {
  const docRef = doc(eventsRef, event.id)
  await deleteDoc(docRef)

  // Recalculate game score from remaining events
  const remainingEvents = await getEventsByGame(game.id)
  const homeScore = remainingEvents.filter((e) => e.teamId === game.homeTeamId).length
  const awayScore = remainingEvents.filter((e) => e.teamId === game.awayTeamId).length

  await updateDoc(doc(gamesRef, game.id), {
    homeScore,
    awayScore,
    updatedAt: Timestamp.now(),
  })

  const eventName = `${event.scorerName} goal${event.assisterName ? ` (assist: ${event.assisterName})` : ''}`
  await createHistoryEntry('delete', 'event', event.id, eventName, {
    previousSnapshot: event as unknown as Record<string, unknown>,
  })
}

// ============================================
// Stats Calculation (from events)
// ============================================

export function calculateStatsFromEvents(events: ScoringEvent[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>()

  events.forEach((event) => {
    // Scorer stats
    if (!statsMap.has(event.scorerPlayerId)) {
      statsMap.set(event.scorerPlayerId, {
        playerId: event.scorerPlayerId,
        playerName: event.scorerName,
        playerNumber: event.scorerNumber,
        teamId: event.teamId,
        goals: 0,
        assists: 0,
      })
    }
    const scorerStats = statsMap.get(event.scorerPlayerId)!
    scorerStats.goals++

    // Assister stats
    if (event.assisterPlayerId) {
      if (!statsMap.has(event.assisterPlayerId)) {
        statsMap.set(event.assisterPlayerId, {
          playerId: event.assisterPlayerId,
          playerName: event.assisterName!,
          playerNumber: event.assisterNumber!,
          teamId: event.teamId,
          goals: 0,
          assists: 0,
        })
      }
      const assisterStats = statsMap.get(event.assisterPlayerId)!
      assisterStats.assists++
    }
  })

  return Array.from(statsMap.values()).sort((a, b) => 
    (b.goals + b.assists) - (a.goals + a.assists)
  )
}

export async function getTournamentStats(tournamentId: string): Promise<PlayerStats[]> {
  const events = await getEventsByTournament(tournamentId)
  return calculateStatsFromEvents(events)
}

export async function getGameStats(gameId: string): Promise<PlayerStats[]> {
  const events = await getEventsByGame(gameId)
  return calculateStatsFromEvents(events)
}

