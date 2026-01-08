import { makeAutoObservable, runInAction } from 'mobx'
import type { Game, CreateGameData, ScoringEvent, CreateScoringEventData } from '@/types'
import * as firestoreService from '@/services/firestore'

export class GameStore {
  games: Game[] = []
  currentGame: Game | null = null
  events: ScoringEvent[] = []
  isLoading = false
  isLoaded = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async loadGames(tournamentId: string): Promise<void> {
    if (this.isLoading) return

    this.isLoading = true
    this.error = null

    try {
      const games = await firestoreService.getGamesByTournament(tournamentId)
      runInAction(() => {
        this.games = games
        this.isLoaded = true
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load games'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async loadGame(gameId: string): Promise<Game | null> {
    this.isLoading = true
    this.error = null

    try {
      const game = await firestoreService.getGame(gameId)
      runInAction(() => {
        this.currentGame = game
      })
      return game
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load game'
      })
      return null
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async loadEvents(gameId: string): Promise<void> {
    try {
      const events = await firestoreService.getEventsByGame(gameId)
      runInAction(() => {
        this.events = events
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load events'
      })
    }
  }

  setCurrentGame(game: Game | null): void {
    this.currentGame = game
    if (game) {
      this.loadEvents(game.id)
    } else {
      this.events = []
    }
  }

  async createGame(data: CreateGameData): Promise<Game | null> {
    this.isLoading = true
    this.error = null

    try {
      const game = await firestoreService.createGame(data)
      runInAction(() => {
        this.games.unshift(game)
      })
      return game
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create game'
      })
      return null
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateGame(id: string, data: Partial<Game>): Promise<boolean> {
    const game = this.games.find((g) => g.id === id)
    if (!game) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.updateGame(id, data, game)
      runInAction(() => {
        const index = this.games.findIndex((g) => g.id === id)
        if (index !== -1) {
          this.games[index] = { ...game, ...data } as Game
        }
        if (this.currentGame?.id === id) {
          this.currentGame = { ...this.currentGame, ...data } as Game
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update game'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteGame(id: string): Promise<boolean> {
    const game = this.games.find((g) => g.id === id)
    if (!game) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.deleteGame(game)
      runInAction(() => {
        this.games = this.games.filter((g) => g.id !== id)
        if (this.currentGame?.id === id) {
          this.currentGame = null
          this.events = []
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to delete game'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async addScoringEvent(data: CreateScoringEventData): Promise<ScoringEvent | null> {
    if (!this.currentGame) return null

    try {
      const event = await firestoreService.createScoringEvent(data, this.currentGame)
      runInAction(() => {
        this.events.push(event)
        // Update local game score
        if (this.currentGame) {
          this.currentGame = {
            ...this.currentGame,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
          }
          // Update in games list too
          const index = this.games.findIndex((g) => g.id === this.currentGame!.id)
          if (index !== -1) {
            this.games[index] = this.currentGame
          }
        }
      })
      return event
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to add scoring event'
      })
      return null
    }
  }

  async undoLastEvent(): Promise<boolean> {
    if (!this.currentGame || this.events.length === 0) return false

    const lastEvent = this.events[this.events.length - 1]

    try {
      await firestoreService.deleteScoringEvent(lastEvent, this.currentGame)
      runInAction(() => {
        this.events.pop()
        // Update local game score
        if (this.currentGame) {
          const homeScore = this.events.filter((e) => e.teamId === this.currentGame!.homeTeamId).length
          const awayScore = this.events.filter((e) => e.teamId === this.currentGame!.awayTeamId).length
          this.currentGame = {
            ...this.currentGame,
            homeScore,
            awayScore,
          }
          // Update in games list too
          const index = this.games.findIndex((g) => g.id === this.currentGame!.id)
          if (index !== -1) {
            this.games[index] = this.currentGame
          }
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to undo event'
      })
      return false
    }
  }

  getGamesByStatus(status: Game['status']): Game[] {
    return this.games.filter((g) => g.status === status)
  }

  resetLoaded(): void {
    this.isLoaded = false
  }

  reset(): void {
    this.games = []
    this.currentGame = null
    this.events = []
    this.isLoading = false
    this.isLoaded = false
    this.error = null
  }
}

