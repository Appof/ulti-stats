import { createContext, useContext } from 'react'
import { AuthStore } from './AuthStore'
import { TournamentStore } from './TournamentStore'
import { TeamStore } from './TeamStore'
import { PlayerStore } from './PlayerStore'
import { GameStore } from './GameStore'

export class RootStore {
  authStore: AuthStore
  tournamentStore: TournamentStore
  teamStore: TeamStore
  playerStore: PlayerStore
  gameStore: GameStore

  constructor() {
    this.authStore = new AuthStore()
    this.tournamentStore = new TournamentStore()
    this.teamStore = new TeamStore()
    this.playerStore = new PlayerStore()
    this.gameStore = new GameStore()
  }

  async logout(): Promise<void> {
    await this.authStore.logout()
    // Reset all stores on logout
    this.tournamentStore.reset()
    this.teamStore.reset()
    this.playerStore.reset()
    this.gameStore.reset()
  }
}

// Create a single instance of the root store
export const rootStore = new RootStore()

// Create React context
export const StoreContext = createContext<RootStore>(rootStore)

// Custom hook to use the store
export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

// Convenience hooks for individual stores
export const useAuthStore = () => useStore().authStore
export const useTournamentStore = () => useStore().tournamentStore
export const useTeamStore = () => useStore().teamStore
export const usePlayerStore = () => useStore().playerStore
export const useGameStore = () => useStore().gameStore
