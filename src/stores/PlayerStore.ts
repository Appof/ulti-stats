import { makeAutoObservable, runInAction } from 'mobx'
import type { Player, CreatePlayerData } from '@/types'
import * as firestoreService from '@/services/firestore'

export class PlayerStore {
  players: Player[] = []
  isLoading = false
  isLoaded = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async loadPlayers(): Promise<void> {
    if (this.isLoading || this.isLoaded) {
      return
    }

    this.isLoading = true
    this.error = null

    try {
      const players = await firestoreService.getPlayers()
      runInAction(() => {
        this.players = players
        this.isLoaded = true
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load players'
        this.isLoaded = true
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async reloadPlayers(): Promise<void> {
    this.isLoaded = false
    await this.loadPlayers()
  }

  resetLoaded(): void {
    this.isLoaded = false
  }

  getPlayersByTeam(teamId: string): Player[] {
    return this.players.filter((p) => p.teamId === teamId).sort((a, b) => a.number - b.number)
  }

  async createPlayer(data: CreatePlayerData): Promise<Player | null> {
    this.isLoading = true
    this.error = null

    try {
      const player = await firestoreService.createPlayer(data)
      runInAction(() => {
        this.players.push(player)
      })
      return player
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create player'
      })
      return null
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updatePlayer(id: string, data: Partial<CreatePlayerData>): Promise<boolean> {
    const player = this.players.find((p) => p.id === id)
    if (!player) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.updatePlayer(id, data, player)
      runInAction(() => {
        const index = this.players.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.players[index] = { ...player, ...data } as Player
        }
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update player'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deletePlayer(id: string): Promise<boolean> {
    const player = this.players.find((p) => p.id === id)
    if (!player) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.deletePlayer(player)
      runInAction(() => {
        this.players = this.players.filter((p) => p.id !== id)
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to delete player'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  reset(): void {
    this.players = []
    this.isLoading = false
    this.isLoaded = false
    this.error = null
  }
}

