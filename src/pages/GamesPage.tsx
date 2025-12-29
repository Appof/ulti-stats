import { useEffect, useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { TournamentGuard } from '@/components/tournament'
import { useTournamentStore, useTeamStore, usePlayerStore, useGameStore } from '@/stores'
import type { Game, RosterPlayer, CreateGameData, GameStatus } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Plus, Play, Eye, Trash2, Loader2, Undo2, Trophy, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<GameStatus, 'secondary' | 'default' | 'outline'> = {
  scheduled: 'secondary',
  in_progress: 'default',
  completed: 'outline',
}

export const GamesPage = observer(function GamesPage() {
  const tournamentStore = useTournamentStore()
  const teamStore = useTeamStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()

  const location = useLocation()
  const [activeTab, setActiveTab] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeGameView, setActiveGameView] = useState<Game | null>(null)

  // Create game form state
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [homeRoster, setHomeRoster] = useState<string[]>([])
  const [awayRoster, setAwayRoster] = useState<string[]>([])

  // Scoring flow state
  const [scoringTeamId, setScoringTeamId] = useState<string | null>(null)
  const [assisterPlayerId, setAssisterPlayerId] = useState<string | null | 'none'>(null)

  // Load games function
  const loadGames = useCallback(() => {
    if (tournamentStore.currentTournament) {
      gameStore.loadGames(tournamentStore.currentTournament.id)
    }
  }, [tournamentStore.currentTournament, gameStore])

  // Load data
  useEffect(() => {
    if (!teamStore.isLoaded && !teamStore.isLoading) {
      teamStore.loadTeams()
    }
    if (!playerStore.isLoaded && !playerStore.isLoading) {
      playerStore.loadPlayers()
    }
  }, [teamStore, playerStore])

  // Load games every time page is visited or tournament changes
  useEffect(() => {
    gameStore.resetLoaded()
    loadGames()
  }, [loadGames, location.key, gameStore])

  // Get players for selected teams
  const homeTeamPlayers = playerStore.getPlayersByTeam(homeTeamId)
  const awayTeamPlayers = playerStore.getPlayersByTeam(awayTeamId)

  const filteredGames = gameStore.games.filter((game) => {
    if (activeTab === 'all') return true
    return game.status === activeTab
  })

  const resetCreateForm = () => {
    setHomeTeamId('')
    setAwayTeamId('')
    setHomeRoster([])
    setAwayRoster([])
  }

  const handleCreateGame = async () => {
    if (!tournamentStore.currentTournament || !homeTeamId || !awayTeamId) return

    const homeTeam = teamStore.teams.find((t) => t.id === homeTeamId)
    const awayTeam = teamStore.teams.find((t) => t.id === awayTeamId)
    if (!homeTeam || !awayTeam) return

    const homeRosterPlayers: RosterPlayer[] = homeTeamPlayers
      .filter((p) => homeRoster.includes(p.id))
      .map((p) => ({ playerId: p.id, playerName: p.name, number: p.number }))

    const awayRosterPlayers: RosterPlayer[] = awayTeamPlayers
      .filter((p) => awayRoster.includes(p.id))
      .map((p) => ({ playerId: p.id, playerName: p.name, number: p.number }))

    const gameData: CreateGameData = {
      tournamentId: tournamentStore.currentTournament.id,
      tournamentName: tournamentStore.currentTournament.name,
      homeTeamId,
      awayTeamId,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      homeRoster: homeRosterPlayers,
      awayRoster: awayRosterPlayers,
      date: Timestamp.now(),
      status: 'scheduled',
    }

    const game = await gameStore.createGame(gameData)
    if (game) {
      toast.success('Game created!')
      setIsCreateDialogOpen(false)
      resetCreateForm()
    } else {
      toast.error(gameStore.error || 'Failed to create game')
    }
  }

  const handleStartGame = async (game: Game) => {
    const success = await gameStore.updateGame(game.id, { status: 'in_progress' })
    if (success) {
      gameStore.setCurrentGame({ ...game, status: 'in_progress' })
      setActiveGameView({ ...game, status: 'in_progress' })
      toast.success('Game started!')
    }
  }

  const handleViewGame = (game: Game) => {
    gameStore.setCurrentGame(game)
    setActiveGameView(game)
  }

  const handleEndGame = async () => {
    if (!activeGameView) return
    const success = await gameStore.updateGame(activeGameView.id, { status: 'completed' })
    if (success) {
      toast.success('Game completed!')
      setActiveGameView(null)
      gameStore.setCurrentGame(null)
    }
  }

  const handleDeleteGame = async (game: Game) => {
    if (!confirm(`Delete game ${game.homeTeamName} vs ${game.awayTeamName}?`)) return
    const success = await gameStore.deleteGame(game.id)
    if (success) {
      toast.success('Game deleted!')
    }
  }

  const handleScorePoint = async (goalScorerPlayerId: string) => {
    if (!activeGameView || !scoringTeamId) return

    const isHomeTeam = scoringTeamId === activeGameView.homeTeamId
    const roster = isHomeTeam ? activeGameView.homeRoster : activeGameView.awayRoster
    const scorer = roster.find((p) => p.playerId === goalScorerPlayerId)
    const assister = assisterPlayerId && assisterPlayerId !== 'none' 
      ? roster.find((p) => p.playerId === assisterPlayerId) 
      : null

    if (!scorer) return

    const newHomeScore = isHomeTeam ? activeGameView.homeScore + 1 : activeGameView.homeScore
    const newAwayScore = !isHomeTeam ? activeGameView.awayScore + 1 : activeGameView.awayScore

    const event = await gameStore.addScoringEvent({
      gameId: activeGameView.id,
      tournamentId: activeGameView.tournamentId,
      teamId: scoringTeamId,
      scorerPlayerId: scorer.playerId,
      scorerNumber: scorer.number,
      scorerName: scorer.playerName,
      assisterPlayerId: assister?.playerId,
      assisterNumber: assister?.number,
      assisterName: assister?.playerName,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    })

    if (event) {
      toast.success(`Goal! ${scorer.playerName}${assister ? ` (assist: ${assister.playerName})` : ''}`)
      // Update local view
      setActiveGameView({
        ...activeGameView,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
      })
    }

    // Reset scoring flow
    setScoringTeamId(null)
    setAssisterPlayerId(null)
  }

  const handleUndo = async () => {
    const success = await gameStore.undoLastEvent()
    if (success) {
      toast.success('Last point undone!')
      // Update local view
      if (gameStore.currentGame) {
        setActiveGameView(gameStore.currentGame)
      }
    }
  }

  const isLoading = teamStore.isLoading || playerStore.isLoading || gameStore.isLoading

  // Active Game Scoring View
  if (activeGameView && activeGameView.status === 'in_progress') {
    const currentRoster = scoringTeamId === activeGameView.homeTeamId
      ? activeGameView.homeRoster
      : scoringTeamId === activeGameView.awayTeamId
        ? activeGameView.awayRoster
        : null

    return (
      <TournamentGuard>
        <div className="space-y-4">
          {/* Header with score */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setActiveGameView(null)}>
              ← Back to Games
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={gameStore.events.length === 0}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEndGame}>
                <CheckCircle className="mr-2 h-4 w-4" />
                End Game
              </Button>
            </div>
          </div>

          {/* Score Display */}
          <Card className="bg-gradient-to-r from-primary/10 via-background to-primary/10">
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center flex-1">
                  <p className="text-lg font-medium text-muted-foreground">{activeGameView.homeTeamName}</p>
                  <p className="text-6xl font-bold">{activeGameView.homeScore}</p>
                </div>
                <div className="text-2xl text-muted-foreground">vs</div>
                <div className="text-center flex-1">
                  <p className="text-lg font-medium text-muted-foreground">{activeGameView.awayTeamName}</p>
                  <p className="text-6xl font-bold">{activeGameView.awayScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Flow */}
          <Card>
            <CardHeader>
              <CardTitle>
                {!scoringTeamId
                  ? 'Which team scored?'
                  : assisterPlayerId === null
                    ? 'Who made the assist?'
                    : 'Who scored the goal?'}
              </CardTitle>
              <CardDescription>
                {!scoringTeamId
                  ? 'Select the team that scored'
                  : assisterPlayerId === null
                    ? 'Tap the player who assisted, or skip if no assist'
                    : 'Tap the player who scored'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Select Team */}
              {!scoringTeamId && (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 text-xl"
                    onClick={() => setScoringTeamId(activeGameView.homeTeamId)}
                  >
                    {activeGameView.homeTeamName}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 text-xl"
                    onClick={() => setScoringTeamId(activeGameView.awayTeamId)}
                  >
                    {activeGameView.awayTeamName}
                  </Button>
                </div>
              )}

              {/* Step 2: Select Assister */}
              {scoringTeamId && assisterPlayerId === null && currentRoster && (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScoringTeamId(null)}
                  >
                    ← Change team
                  </Button>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {currentRoster.map((player) => (
                      <Button
                        key={player.playerId}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                        onClick={() => setAssisterPlayerId(player.playerId)}
                      >
                        <span className="text-2xl font-bold">{player.number}</span>
                        <span className="text-xs truncate max-w-full">{player.playerName}</span>
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full h-14"
                    onClick={() => setAssisterPlayerId('none')}
                  >
                    No Assist (Skip)
                  </Button>
                </div>
              )}

              {/* Step 3: Select Scorer (Goal) */}
              {scoringTeamId && assisterPlayerId !== null && currentRoster && (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssisterPlayerId(null)}
                  >
                    ← Change assister
                  </Button>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {currentRoster
                      .filter((p) => assisterPlayerId === 'none' || p.playerId !== assisterPlayerId)
                      .map((player) => (
                        <Button
                          key={player.playerId}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center"
                          onClick={() => handleScorePoint(player.playerId)}
                        >
                          <span className="text-2xl font-bold">{player.number}</span>
                          <span className="text-xs truncate max-w-full">{player.playerName}</span>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Log */}
          {gameStore.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scoring Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...gameStore.events].reverse().map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span>
                        <span className="font-medium">#{event.scorerNumber} {event.scorerName}</span>
                        {event.assisterName && (
                          <span className="text-muted-foreground"> (assist: #{event.assisterNumber} {event.assisterName})</span>
                        )}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {event.homeScore} - {event.awayScore}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TournamentGuard>
    )
  }

  // View completed game
  if (activeGameView && activeGameView.status === 'completed') {
    return (
      <TournamentGuard>
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setActiveGameView(null)}>
            ← Back to Games
          </Button>

          {/* Final Score */}
          <Card className="bg-gradient-to-r from-primary/10 via-background to-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5" />
                Final Score
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center flex-1">
                  <p className="text-lg font-medium text-muted-foreground">{activeGameView.homeTeamName}</p>
                  <p className="text-6xl font-bold">{activeGameView.homeScore}</p>
                </div>
                <div className="text-2xl text-muted-foreground">vs</div>
                <div className="text-center flex-1">
                  <p className="text-lg font-medium text-muted-foreground">{activeGameView.awayTeamName}</p>
                  <p className="text-6xl font-bold">{activeGameView.awayScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Log */}
          {gameStore.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scoring History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Scorer</TableHead>
                      <TableHead>Assist</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameStore.events.map((event, index) => (
                      <TableRow key={event.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>#{event.scorerNumber} {event.scorerName}</TableCell>
                        <TableCell>
                          {event.assisterName
                            ? `#${event.assisterNumber} ${event.assisterName}`
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {event.homeScore} - {event.awayScore}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </TournamentGuard>
    )
  }

  // Games List View
  return (
    <TournamentGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Games</h1>
            <p className="text-muted-foreground">
              {tournamentStore.currentTournament?.name} — Track and manage game statistics
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Game
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Games</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'all' ? 'All Games' :
                    activeTab === 'in_progress' ? 'Games In Progress' :
                      activeTab === 'scheduled' ? 'Scheduled Games' : 'Completed Games'}
                </CardTitle>
                <CardDescription>
                  {filteredGames.length} games found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No games found. Create your first game!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Home Team</TableHead>
                        <TableHead>Away Team</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGames.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium">{game.homeTeamName}</TableCell>
                          <TableCell className="font-medium">{game.awayTeamName}</TableCell>
                          <TableCell>
                            <span className="font-mono">
                              {game.homeScore} - {game.awayScore}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[game.status]}>
                              {game.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {game.status === 'scheduled' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Start game"
                                  onClick={() => handleStartGame(game)}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {game.status === 'in_progress' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Continue tracking"
                                  onClick={() => handleViewGame(game)}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {game.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View results"
                                  onClick={() => handleViewGame(game)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete game"
                                onClick={() => handleDeleteGame(game)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Game Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) resetCreateForm()
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>
                Select teams and their active rosters for this game.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Team Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Team</Label>
                  <Select value={homeTeamId} onValueChange={(v) => {
                    setHomeTeamId(v)
                    setHomeRoster([])
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select home team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamStore.teams
                        .filter((t) => t.id !== awayTeamId)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Away Team</Label>
                  <Select value={awayTeamId} onValueChange={(v) => {
                    setAwayTeamId(v)
                    setAwayRoster([])
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select away team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamStore.teams
                        .filter((t) => t.id !== homeTeamId)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Roster Selection */}
              {homeTeamId && awayTeamId && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Home Roster ({homeRoster.length})</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHomeRoster(homeTeamPlayers.map((p) => p.id))}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {homeTeamPlayers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No players in this team</p>
                      ) : (
                        homeTeamPlayers.map((player) => (
                          <label
                            key={player.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={homeRoster.includes(player.id)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setHomeRoster([...homeRoster, player.id])
                                } else {
                                  setHomeRoster(homeRoster.filter((id) => id !== player.id))
                                }
                              }}
                            />
                            <span className="font-mono text-sm">#{player.number}</span>
                            <span className="text-sm">{player.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Away Roster ({awayRoster.length})</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAwayRoster(awayTeamPlayers.map((p) => p.id))}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {awayTeamPlayers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No players in this team</p>
                      ) : (
                        awayTeamPlayers.map((player) => (
                          <label
                            key={player.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={awayRoster.includes(player.id)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setAwayRoster([...awayRoster, player.id])
                                } else {
                                  setAwayRoster(awayRoster.filter((id) => id !== player.id))
                                }
                              }}
                            />
                            <span className="font-mono text-sm">#{player.number}</span>
                            <span className="text-sm">{player.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGame}
                disabled={!homeTeamId || !awayTeamId || homeRoster.length === 0 || awayRoster.length === 0 || gameStore.isLoading}
              >
                {gameStore.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Game'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TournamentGuard>
  )
})
