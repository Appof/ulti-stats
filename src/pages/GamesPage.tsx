import { useEffect, useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/config/firebase'
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
import { Input } from '@/components/ui/input'
import { Plus, Play, Eye, Trash2, Loader2, Undo2, Trophy, CheckCircle, Printer, PenTool, Clock, Heart, Timer, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { SignaturePad } from '@/components/ui/signature-pad'
import { openGameScoresheet } from '@/components/game'

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
  const [gameField, setGameField] = useState('')
  const [gameDivision, setGameDivision] = useState('')
  const [gamePoolOrBracket, setGamePoolOrBracket] = useState('')
  const [gameNumber, setGameNumber] = useState('')

  // Scoring flow state
  const [scoringTeamId, setScoringTeamId] = useState<string | null>(null)
  const [assisterPlayerId, setAssisterPlayerId] = useState<string | null | 'none'>(null)

  // Game setup modal state
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [pendingStartGame, setPendingStartGame] = useState<Game | null>(null)
  const [setupOffenseTeamId, setSetupOffenseTeamId] = useState<string>('')
  const [setupHomeStartsLeft, setSetupHomeStartsLeft] = useState<boolean>(true)
  const [setupGenderRatio, setSetupGenderRatio] = useState<'3M/2F' | '2M/3F' | ''>('')

  // Edit game settings modal state
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false)
  const [editField, setEditField] = useState('')
  const [editDivision, setEditDivision] = useState('')
  const [editPoolOrBracket, setEditPoolOrBracket] = useState('')
  const [editGameNumber, setEditGameNumber] = useState('')
  const [editOffenseTeamId, setEditOffenseTeamId] = useState<string>('')
  const [editHomeStartsLeft, setEditHomeStartsLeft] = useState<boolean>(true)
  const [editGenderRatio, setEditGenderRatio] = useState<'3M/2F' | '2M/3F' | ''>('')

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
    setGameField('')
    setGameDivision('')
    setGamePoolOrBracket('')
    setGameNumber('')
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
    
    // Only add optional fields if they have values
    if (gameField) gameData.field = gameField
    if (gameDivision) gameData.division = gameDivision
    if (gamePoolOrBracket) gameData.poolOrBracket = gamePoolOrBracket
    if (gameNumber) gameData.gameNumber = gameNumber

    const game = await gameStore.createGame(gameData)
    if (game) {
      toast.success('Game created!')
      setIsCreateDialogOpen(false)
      resetCreateForm()
    } else {
      toast.error(gameStore.error || 'Failed to create game')
    }
  }

  const handleStartGame = (game: Game) => {
    // Open setup modal instead of directly starting
    setPendingStartGame(game)
    setSetupOffenseTeamId(game.homeTeamId) // Default to home team
    setSetupHomeStartsLeft(true)
    setSetupGenderRatio('')
    setIsSetupModalOpen(true)
  }

  const handleConfirmStartGame = async () => {
    if (!pendingStartGame) return
    
    const startTime = Timestamp.now()
    const scorekeeper =  auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown'
    
    const updateData: Partial<Game> = {
      status: 'in_progress',
      startTime,
      homeTeamStartsLeft: setupHomeStartsLeft,
      scorekeeper,
    }
    
    // Only add optional fields if they have values
    if (setupOffenseTeamId) {
      updateData.startingOffenseTeamId = setupOffenseTeamId
    }
    if (setupGenderRatio) {
      updateData.genderRatio = setupGenderRatio
    }
    
    const success = await gameStore.updateGame(pendingStartGame.id, updateData)
    if (success) {
      const updatedGame = { ...pendingStartGame, ...updateData }
      gameStore.setCurrentGame(updatedGame)
      setActiveGameView(updatedGame)
      setIsSetupModalOpen(false)
      setPendingStartGame(null)
      toast.success('Game started!')
    } else {
      toast.error(gameStore.error || 'Failed to start game')
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
    const scorer = goalScorerPlayerId !== 'none' 
      ? roster.find((p) => p.playerId === goalScorerPlayerId) 
      : null
    const assister = assisterPlayerId && assisterPlayerId !== 'none' 
      ? roster.find((p) => p.playerId === assisterPlayerId) 
      : null

    const newHomeScore = isHomeTeam ? activeGameView.homeScore + 1 : activeGameView.homeScore
    const newAwayScore = !isHomeTeam ? activeGameView.awayScore + 1 : activeGameView.awayScore

    const event = await gameStore.addScoringEvent({
      gameId: activeGameView.id,
      tournamentId: activeGameView.tournamentId,
      teamId: scoringTeamId,
      scorerPlayerId: scorer?.playerId,
      scorerNumber: scorer?.number,
      scorerName: scorer?.playerName,
      assisterPlayerId: assister?.playerId,
      assisterNumber: assister?.number,
      assisterName: assister?.playerName,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      scoredAt: Timestamp.now(),
    })

    if (event) {
      const scorerText = scorer ? scorer.playerName : 'Unknown'
      toast.success(`Goal! ${scorerText}${assister ? ` (assist: ${assister.playerName})` : ''}`)
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

  const handleTimeout = async (team: 'home' | 'away') => {
    if (!activeGameView) return
    
    const now = Timestamp.now()
    const currentTimeouts = team === 'home' 
      ? (activeGameView.homeTimeouts || [])
      : (activeGameView.awayTimeouts || [])
    
    const updateData = team === 'home'
      ? { homeTimeouts: [...currentTimeouts, now] }
      : { awayTimeouts: [...currentTimeouts, now] }
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({ ...activeGameView, ...updateData })
      toast.success(`${team === 'home' ? activeGameView.homeTeamName : activeGameView.awayTeamName} timeout!`)
    }
  }

  const handleSpiritTimeout = async (team: 'home' | 'away') => {
    if (!activeGameView) return
    
    const now = Timestamp.now()
    const currentTimeouts = team === 'home' 
      ? (activeGameView.homeSpiritTimeouts || [])
      : (activeGameView.awaySpiritTimeouts || [])
    
    const updateData = team === 'home'
      ? { homeSpiritTimeouts: [...currentTimeouts, now] }
      : { awaySpiritTimeouts: [...currentTimeouts, now] }
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({ ...activeGameView, ...updateData })
      toast.success(`${team === 'home' ? activeGameView.homeTeamName : activeGameView.awayTeamName} spirit timeout!`)
    }
  }

  const handleHalftime = async () => {
    if (!activeGameView) return
    
    const now = Timestamp.now()
    const updateData = {
      halftimeTime: now,
      halftimeHomeScore: activeGameView.homeScore,
      halftimeAwayScore: activeGameView.awayScore,
    }
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({ ...activeGameView, ...updateData })
      toast.success('Half-time recorded!')
    }
  }

  const handleStartSecondHalf = async () => {
    if (!activeGameView) return
    
    const now = Timestamp.now()
    const updateData = { secondHalfStartTime: now }
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({ ...activeGameView, ...updateData })
      toast.success('Second half started!')
    }
  }

  const handleSaveSignature = async (team: 'home' | 'away', signature: string) => {
    if (!activeGameView) return
    
    const updateData = team === 'home' 
      ? { homeTeamSignature: signature }
      : { awayTeamSignature: signature }
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({
        ...activeGameView,
        ...updateData,
      })
      toast.success(`${team === 'home' ? activeGameView.homeTeamName : activeGameView.awayTeamName} signature saved!`)
    }
  }

  const openEditSettingsModal = () => {
    if (!activeGameView) return
    // Populate form with current values
    setEditField(activeGameView.field || '')
    setEditDivision(activeGameView.division || '')
    setEditPoolOrBracket(activeGameView.poolOrBracket || '')
    setEditGameNumber(activeGameView.gameNumber || '')
    setEditOffenseTeamId(activeGameView.startingOffenseTeamId || activeGameView.homeTeamId)
    setEditHomeStartsLeft(activeGameView.homeTeamStartsLeft ?? true)
    setEditGenderRatio(activeGameView.genderRatio || '')
    setIsEditSettingsOpen(true)
  }

  const handleSaveEditSettings = async () => {
    if (!activeGameView) return
    
    const updateData: Partial<Game> = {
      homeTeamStartsLeft: editHomeStartsLeft,
    }
    
    // Only add optional fields if they have values
    if (editField) updateData.field = editField
    if (editDivision) updateData.division = editDivision
    if (editPoolOrBracket) updateData.poolOrBracket = editPoolOrBracket
    if (editGameNumber) updateData.gameNumber = editGameNumber
    if (editOffenseTeamId) updateData.startingOffenseTeamId = editOffenseTeamId
    if (editGenderRatio) updateData.genderRatio = editGenderRatio
    
    const success = await gameStore.updateGame(activeGameView.id, updateData)
    if (success) {
      setActiveGameView({ ...activeGameView, ...updateData })
      setIsEditSettingsOpen(false)
      toast.success('Game settings updated!')
    } else {
      toast.error(gameStore.error || 'Failed to update settings')
    }
  }

  const handleExportGame = (game: Game) => {
    const events = gameStore.events
    
    const success = openGameScoresheet(game, events)
    if (success) {
      toast.success('Scoresheet opened in new tab!')
    } else {
      toast.error('Please allow popups for this site')
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
                onClick={openEditSettingsModal}
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
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
              
              {/* Game Setup Info */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                {activeGameView.startingOffenseTeamId && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Offense:</span>
                    <span>
                      {activeGameView.startingOffenseTeamId === activeGameView.homeTeamId 
                        ? activeGameView.homeTeamName 
                        : activeGameView.awayTeamName}
                    </span>
                  </div>
                )}
                {activeGameView.homeTeamStartsLeft !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Endzone:</span>
                    <span>
                      {activeGameView.homeTeamName} {activeGameView.homeTeamStartsLeft ? '← Left' : 'Right →'}
                    </span>
                  </div>
                )}
                {activeGameView.genderRatio && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Ratio:</span>
                    <Badge variant="outline">{activeGameView.genderRatio}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Progress Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Home Team Controls */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">{activeGameView.homeTeamName}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTimeout('home')}
                      className="flex-1"
                    >
                      <Clock className="mr-1 h-4 w-4" />
                      Timeout ({(activeGameView.homeTimeouts || []).length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSpiritTimeout('home')}
                      className="flex-1"
                    >
                      <Heart className="mr-1 h-4 w-4" />
                      Spirit ({(activeGameView.homeSpiritTimeouts || []).length})
                    </Button>
                  </div>
                </div>
                
                {/* Away Team Controls */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">{activeGameView.awayTeamName}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTimeout('away')}
                      className="flex-1"
                    >
                      <Clock className="mr-1 h-4 w-4" />
                      Timeout ({(activeGameView.awayTimeouts || []).length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSpiritTimeout('away')}
                      className="flex-1"
                    >
                      <Heart className="mr-1 h-4 w-4" />
                      Spirit ({(activeGameView.awaySpiritTimeouts || []).length})
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Half-time Controls */}
              <div className="flex justify-center gap-4 mt-4 pt-4 border-t">
                {!activeGameView.halftimeTime ? (
                  <Button variant="secondary" onClick={handleHalftime}>
                    <Timer className="mr-2 h-4 w-4" />
                    Call Half-time
                  </Button>
                ) : !activeGameView.secondHalfStartTime ? (
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-sm">
                      Half-time: {activeGameView.halftimeHomeScore} - {activeGameView.halftimeAwayScore}
                    </Badge>
                    <Button variant="secondary" onClick={handleStartSecondHalf}>
                      <Play className="mr-2 h-4 w-4" />
                      Start 2nd Half
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-sm">
                    Half-time: {activeGameView.halftimeHomeScore} - {activeGameView.halftimeAwayScore} • 2nd half in progress
                  </Badge>
                )}
              </div>
              
              {/* Scorekeeper */}
              {activeGameView.scorekeeper && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Scorekeeper: {activeGameView.scorekeeper}
                </p>
              )}
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
                  <Button
                    variant="secondary"
                    className="w-full h-14"
                    onClick={() => handleScorePoint('none')}
                  >
                    No Scorer (Skip)
                  </Button>
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
                        <span className="font-medium">
                          {event.scorerName ? `#${event.scorerNumber} ${event.scorerName}` : 'Unknown scorer'}
                        </span>
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

          {/* Edit Game Settings Modal (for in_progress view) */}
          <Dialog open={isEditSettingsOpen} onOpenChange={setIsEditSettingsOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Game Settings</DialogTitle>
                <DialogDescription>
                  Update game logistics and setup information.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Game Logistics */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Game Logistics</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Field</Label>
                      <Input
                        placeholder="e.g., 1"
                        value={editField}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditField(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Division</Label>
                      <Input
                        placeholder="e.g., Open"
                        value={editDivision}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDivision(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Pool / Bracket</Label>
                      <Input
                        placeholder="e.g., Pool A"
                        value={editPoolOrBracket}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPoolOrBracket(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Game #</Label>
                      <Input
                        placeholder="e.g., 12"
                        value={editGameNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditGameNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Starting Offense */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Which team starts on offense?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={editOffenseTeamId === activeGameView.homeTeamId ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setEditOffenseTeamId(activeGameView.homeTeamId)}
                    >
                      {activeGameView.homeTeamName}
                    </Button>
                    <Button
                      type="button"
                      variant={editOffenseTeamId === activeGameView.awayTeamId ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setEditOffenseTeamId(activeGameView.awayTeamId)}
                    >
                      {activeGameView.awayTeamName}
                    </Button>
                  </div>
                </div>

                {/* Starting Endzone */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Which endzone does {activeGameView.homeTeamName} start at?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={editHomeStartsLeft ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setEditHomeStartsLeft(true)}
                    >
                      ← Left
                    </Button>
                    <Button
                      type="button"
                      variant={!editHomeStartsLeft ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setEditHomeStartsLeft(false)}
                    >
                      Right →
                    </Button>
                  </div>
                </div>

                {/* Gender Ratio */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Gender ratio on 1st point (mixed only)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant={editGenderRatio === '3M/2F' ? 'default' : 'outline'}
                      onClick={() => setEditGenderRatio('3M/2F')}
                    >
                      3M / 2F
                    </Button>
                    <Button
                      type="button"
                      variant={editGenderRatio === '2M/3F' ? 'default' : 'outline'}
                      onClick={() => setEditGenderRatio('2M/3F')}
                    >
                      2M / 3F
                    </Button>
                    <Button
                      type="button"
                      variant={editGenderRatio === '' ? 'secondary' : 'ghost'}
                      onClick={() => setEditGenderRatio('')}
                    >
                      N/A
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditSettings} disabled={gameStore.isLoading}>
                  {gameStore.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TournamentGuard>
    )
  }

  // View completed game
  if (activeGameView && activeGameView.status === 'completed') {
    return (
      <TournamentGuard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setActiveGameView(null)}>
              ← Back to Games
            </Button>
            <Button variant="outline" onClick={() => handleExportGame(activeGameView)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>

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
                        <TableCell>{event.scorerName ? `#${event.scorerNumber} ${event.scorerName}` : 'Unknown'}</TableCell>
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

          {/* Captain Signatures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Captain Signatures
              </CardTitle>
              <CardDescription>
                Sign to confirm the game results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignaturePad
                  label={`${activeGameView.homeTeamName} Captain`}
                  initialValue={activeGameView.homeTeamSignature}
                  onSave={(sig) => handleSaveSignature('home', sig)}
                />
                <SignaturePad
                  label={`${activeGameView.awayTeamName} Captain`}
                  initialValue={activeGameView.awayTeamSignature}
                  onSave={(sig) => handleSaveSignature('away', sig)}
                />
              </div>
            </CardContent>
          </Card>
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
              {/* Game Logistics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Input
                    placeholder="e.g., 1"
                    value={gameField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameField(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Input
                    placeholder="e.g., Open"
                    value={gameDivision}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameDivision(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pool / Bracket</Label>
                  <Input
                    placeholder="e.g., Pool A"
                    value={gamePoolOrBracket}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGamePoolOrBracket(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Game #</Label>
                  <Input
                    placeholder="e.g., 12"
                    value={gameNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameNumber(e.target.value)}
                  />
                </div>
              </div>

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

        {/* Game Setup Modal */}
        <Dialog open={isSetupModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsSetupModalOpen(false)
            setPendingStartGame(null)
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Game Setup</DialogTitle>
              <DialogDescription>
                Set the starting conditions for this game.
              </DialogDescription>
            </DialogHeader>

            {pendingStartGame && (
              <div className="space-y-6 py-4">
                {/* Starting Offense */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Which team starts on offense?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={setupOffenseTeamId === pendingStartGame.homeTeamId ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setSetupOffenseTeamId(pendingStartGame.homeTeamId)}
                    >
                      {pendingStartGame.homeTeamName}
                    </Button>
                    <Button
                      type="button"
                      variant={setupOffenseTeamId === pendingStartGame.awayTeamId ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setSetupOffenseTeamId(pendingStartGame.awayTeamId)}
                    >
                      {pendingStartGame.awayTeamName}
                    </Button>
                  </div>
                </div>

                {/* Starting Endzone */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Which endzone does {pendingStartGame.homeTeamName} start at?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={setupHomeStartsLeft ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setSetupHomeStartsLeft(true)}
                    >
                      ← Left
                    </Button>
                    <Button
                      type="button"
                      variant={!setupHomeStartsLeft ? 'default' : 'outline'}
                      className="h-14"
                      onClick={() => setSetupHomeStartsLeft(false)}
                    >
                      Right →
                    </Button>
                  </div>
                </div>

                {/* Gender Ratio (for mixed) */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Gender ratio on 1st point (mixed only)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant={setupGenderRatio === '3M/2F' ? 'default' : 'outline'}
                      onClick={() => setSetupGenderRatio('3M/2F')}
                    >
                      3M / 2F
                    </Button>
                    <Button
                      type="button"
                      variant={setupGenderRatio === '2M/3F' ? 'default' : 'outline'}
                      onClick={() => setSetupGenderRatio('2M/3F')}
                    >
                      2M / 3F
                    </Button>
                    <Button
                      type="button"
                      variant={setupGenderRatio === '' ? 'secondary' : 'ghost'}
                      onClick={() => setSetupGenderRatio('')}
                    >
                      N/A
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsSetupModalOpen(false)
                setPendingStartGame(null)
              }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmStartGame} disabled={gameStore.isLoading}>
                {gameStore.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Game
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TournamentGuard>
  )
})
