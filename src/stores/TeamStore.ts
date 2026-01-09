import { makeAutoObservable, runInAction } from 'mobx'
import type { Team, CreateTeamData } from '@/types'
import * as firestoreService from '@/services/firestore'

export class TeamStore {
  teams: Team[] = []
  isLoading = false
  isLoaded = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async loadTeams(): Promise<void> {
    if (this.isLoading || this.isLoaded) {
      return
    }

    this.isLoading = true
    this.error = null

    try {
      const teams = await firestoreService.getTeams()
      runInAction(() => {
        this.teams = teams
        this.isLoaded = true
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load teams'
        this.isLoaded = true
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async reloadTeams(): Promise<void> {
    this.isLoaded = false
    await this.loadTeams()
  }

  resetLoaded(): void {
    this.isLoaded = false
  }

  async createTeam(data: CreateTeamData): Promise<Team | null> {
    this.isLoading = true
    this.error = null

    try {
      const team = await firestoreService.createTeam(data)
      runInAction(() => {
        this.teams.push(team)
        this.teams.sort((a, b) => a.name.localeCompare(b.name))
      })
      return team
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create team'
      })
      return null
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateTeam(id: string, data: Partial<CreateTeamData>): Promise<boolean> {
    const team = this.teams.find((t) => t.id === id)
    if (!team) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.updateTeam(id, data, team)
      runInAction(() => {
        const index = this.teams.findIndex((t) => t.id === id)
        if (index !== -1) {
          this.teams[index] = { ...team, ...data } as Team
        }
        this.teams.sort((a, b) => a.name.localeCompare(b.name))
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update team'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteTeam(id: string): Promise<boolean> {
    const team = this.teams.find((t) => t.id === id)
    if (!team) return false

    this.isLoading = true
    this.error = null

    try {
      await firestoreService.deleteTeam(team)
      runInAction(() => {
        this.teams = this.teams.filter((t) => t.id !== id)
      })
      return true
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to delete team'
      })
      return false
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  getTeamById(id: string): Team | undefined {
    return this.teams.find((t) => t.id === id)
  }

  reset(): void {
    this.teams = []
    this.isLoading = false
    this.isLoaded = false
    this.error = null
  }
}

