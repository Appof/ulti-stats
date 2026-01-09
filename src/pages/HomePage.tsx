import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { useAuthStore, useTournamentStore, useTeamStore, usePlayerStore, useGameStore } from '@/stores'
import { TournamentGuard } from '@/components/tournament'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Trophy, History, UserCircle, Loader2, Play, CheckCircle, Clock } from 'lucide-react'
import type { TournamentStatus } from '@/types'
import * as firestoreService from '@/services/firestore'

export const HomePage = observer(function HomePage() {
  const authStore = useAuthStore()
  const tournamentStore = useTournamentStore()
  const teamStore = useTeamStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TournamentStatus | null>(null)
  const [historyCount, setHistoryCount] = useState<number | null>(null)

  // Load data for the dashboard when tournament changes
  useEffect(() => {
    if (tournamentStore.currentTournament) {
      // Reset and reload data for the new tournament
      teamStore.resetLoaded()
      playerStore.resetLoaded()
      gameStore.resetLoaded()
      
      teamStore.loadTeams()
      playerStore.loadPlayers()
      gameStore.loadGames(tournamentStore.currentTournament.id)
      
      // Load history count
      firestoreService.getHistory().then(history => {
        setHistoryCount(history.length)
      })
    }
  }, [tournamentStore.currentTournament?.id]) // Only depend on tournament ID

  const handleStatusChange = (newStatus: TournamentStatus) => {
    if (!tournamentStore.currentTournament || newStatus === tournamentStore.currentTournament.status) return
    setPendingStatus(newStatus)
    setShowStatusDialog(true)
  }

  const confirmStatusChange = async () => {
    if (!tournamentStore.currentTournament || !pendingStatus) return
    
    setIsUpdatingStatus(true)
    const success = await tournamentStore.updateTournament(
      tournamentStore.currentTournament.id,
      { status: pendingStatus }
    )
    setIsUpdatingStatus(false)
    
    if (success) {
      setShowStatusDialog(false)
      setPendingStatus(null)
    }
  }

  const getStatusLabel = (status: TournamentStatus) => {
    switch (status) {
      case 'upcoming': return 'Upcoming'
      case 'active': return 'Active'
      case 'completed': return 'Completed'
    }
  }

  const getStatusIcon = (status: TournamentStatus) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-4 w-4" />
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
    }
  }

  if (!authStore.isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 text-6xl">🥏</div>
            <CardTitle className="text-3xl">Ulti Stats</CardTitle>
            <CardDescription>
              Track your ultimate frisbee games and team statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authStore.error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-center">
                <p className="text-sm text-destructive font-medium">
                  {authStore.error}
                </p>
              </div>
            )}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  authStore.clearError()
                  authStore.signInWithGoogle()
                }}
                disabled={authStore.isLoading}
              >
                {authStore.isLoading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentTournament = tournamentStore.currentTournament

  return (
    <TournamentGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome, {authStore.user?.displayName}!</h1>
        </div>

        {currentTournament && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {currentTournament.name}
                  </CardTitle>
                  <CardDescription>
                    Current tournament
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={currentTournament.status}
                    onValueChange={(value) => handleStatusChange(value as TournamentStatus)}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(currentTournament.status)}
                          <span>{getStatusLabel(currentTournament.status)}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Upcoming</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          <span>Active</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Change Confirmation Dialog */}
                  <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Tournament Status</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to change "{currentTournament.name}" status from{' '}
                          <strong>{getStatusLabel(currentTournament.status)}</strong> to{' '}
                          <strong>{pendingStatus ? getStatusLabel(pendingStatus) : ''}</strong>?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowStatusDialog(false)
                            setPendingStatus(null)
                          }}
                          disabled={isUpdatingStatus}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={confirmStatusChange}
                          disabled={isUpdatingStatus}
                          className="gap-2"
                        >
                          {isUpdatingStatus ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              {pendingStatus && getStatusIcon(pendingStatus)}
                              Change Status
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/teams">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams
                </CardTitle>
                <CardDescription>Manage your teams</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {teamStore.isLoading ? '...' : teamStore.teams.length}
                </p>
                <p className="text-sm text-muted-foreground">registered teams</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/games">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Games
                </CardTitle>
                <CardDescription>Track game statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {gameStore.isLoading ? '...' : gameStore.games.length}
                </p>
                <p className="text-sm text-muted-foreground">games recorded</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/players">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Players
                </CardTitle>
                <CardDescription>View player stats</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {playerStore.isLoading ? '...' : playerStore.players.length}
                </p>
                <p className="text-sm text-muted-foreground">players listed</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/history">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History
                </CardTitle>
                <CardDescription>View all changes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {historyCount === null ? '...' : historyCount}
                </p>
                <p className="text-sm text-muted-foreground">actions logged</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </TournamentGuard>
  )
})
