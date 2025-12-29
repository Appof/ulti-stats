import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { useAuthStore, useTournamentStore, useTeamStore, usePlayerStore, useGameStore } from '@/stores'
import { TournamentGuard } from '@/components/tournament'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Users, Trophy, History, UserCircle, Flag, Loader2 } from 'lucide-react'
import * as firestoreService from '@/services/firestore'

export const HomePage = observer(function HomePage() {
  const authStore = useAuthStore()
  const tournamentStore = useTournamentStore()
  const teamStore = useTeamStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const [isFinishing, setIsFinishing] = useState(false)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [historyCount, setHistoryCount] = useState<number | null>(null)

  // Load data for the dashboard
  useEffect(() => {
    if (tournamentStore.currentTournament) {
      if (!teamStore.isLoaded && !teamStore.isLoading) {
        teamStore.loadTeams()
      }
      if (!playerStore.isLoaded && !playerStore.isLoading) {
        playerStore.loadPlayers()
      }
      if (!gameStore.isLoaded && !gameStore.isLoading) {
        gameStore.loadGames(tournamentStore.currentTournament.id)
      }
      // Load history count
      firestoreService.getHistory().then(history => {
        setHistoryCount(history.length)
      })
    }
  }, [tournamentStore.currentTournament, teamStore, playerStore, gameStore])

  const handleFinishTournament = async () => {
    if (!tournamentStore.currentTournament) return
    
    setIsFinishing(true)
    const success = await tournamentStore.updateTournament(
      tournamentStore.currentTournament.id,
      { status: 'completed' }
    )
    setIsFinishing(false)
    
    if (success) {
      setShowFinishDialog(false)
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
                  <Badge variant={
                    currentTournament.status === 'active' ? 'default' :
                    currentTournament.status === 'upcoming' ? 'secondary' : 'outline'
                  }>
                    {currentTournament.status}
                  </Badge>
                  {currentTournament.status !== 'completed' && (
                    <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors">
                          <Flag className="h-4 w-4" />
                          Finish Tournament
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Finish Tournament</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to mark "{currentTournament.name}" as completed?
                            This will change the tournament status to finished.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowFinishDialog(false)}
                            disabled={isFinishing}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleFinishTournament}
                            disabled={isFinishing}
                            className="gap-2"
                          >
                            {isFinishing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Finishing...
                              </>
                            ) : (
                              <>
                                <Flag className="h-4 w-4" />
                                Finish Tournament
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
