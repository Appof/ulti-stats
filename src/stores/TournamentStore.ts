import { makeAutoObservable, runInAction } from 'mobx'
import type { Tournament, CreateTournamentData } from '@/types'
import * as firestoreService from '@/services/firestore'

const STORAGE_KEY = 'ulti-stats-current-tournament'

export class TournamentStore {
  tournaments: Tournament[] = []
  currentTournament: Tournament | null = null
  isLoading = false
  isLoaded = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  private saveToStorage(tournamentId: string | null): void {
    if (tournamentId) {
      localStorage.setItem(STORAGE_KEY, tournamentId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  private getStoredTournamentId(): string | null {
    return localStorage.getItem(STORAGE_KEY)
  }

  async loadTournaments(): Promise<void> {
    if (this.isLoading || this.isLoaded) {
      return
    }

    this.isLoading = true
    this.error = null

    try {
      const tournaments = await firestoreService.getTournaments()
      runInAction(() => {
        this.tournaments = tournaments
        this.isLoaded = true
        
        // Restore tournament from localStorage if not already set
        if (!this.currentTournament && tournaments.length > 0) {
          const storedId = this.getStoredTournamentId()
          if (storedId) {
            const stored = tournaments.find((t) => t.id === storedId)
            if (stored) {
              this.currentTournament = stored
            }
          }
        }
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load tournaments'
        this.isLoaded = true
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async reloadTournaments(): Promise<void> {
    this.isLoaded = false
    await this.loadTournaments()
  }

  setCurrentTournament(tournament: Tournament | null): void {
    this.currentTournament = tournament
    this.saveToStorage(tournament?.id || null)
  }

  async createTournament(data: CreateTournamentData): Promise<Tournament | null> {
    this.isLoading = true
    this.error = null

    try {
      const tournament = await firestoreService.createTournament(data)
      runInAction(() => {
        this.tournaments.unshift(tournament)
        this.currentTournament = tournament
        this.saveToStorage(tournament.id)
      })
      return tournament
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create tournament'
      })
      return null
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateTournament(id: string, data: Partial<CreateTournamentData>): Promise<boolean> {
    const tournament = this.tournaments.find((t) => t.id === id)
    if (!tournament) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.updateTournament(id, data, tournament)
      runInAction(() => {
        const index = this.tournaments.findIndex((t) => t.id === id)
        if (index !== -1) {
          this.tournaments[index] = { ...tournament, ...data } as Tournament
        }
        if (this.currentTournament?.id === id) {
          this.currentTournament = { ...this.currentTournament, ...data } as Tournament
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update tournament'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteTournament(id: string): Promise<boolean> {
    const tournament = this.tournaments.find((t) => t.id === id)
    if (!tournament) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.deleteTournament(tournament)
      runInAction(() => {
        this.tournaments = this.tournaments.filter((t) => t.id !== id)
        if (this.currentTournament?.id === id) {
          this.currentTournament = null
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to delete tournament'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  reset(): void {
    this.tournaments = []
    this.currentTournament = null
    this.isLoading = false
    this.isLoaded = false
    this.error = null
    this.saveToStorage(null) // Clear localStorage on reset/logout
  }
}
