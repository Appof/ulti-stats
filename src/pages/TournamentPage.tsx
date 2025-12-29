import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Timestamp } from 'firebase/firestore'
import { useTournamentStore } from '@/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trophy, Loader2, Plus, ArrowRight } from 'lucide-react'
import type { TournamentStatus } from '@/types'

export const TournamentPage = observer(function TournamentPage() {
  const navigate = useNavigate()
  const tournamentStore = useTournamentStore()
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newTournamentStatus, setNewTournamentStatus] = useState<TournamentStatus>('active')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')

  useEffect(() => {
    if (!tournamentStore.isLoaded && !tournamentStore.isLoading) {
      tournamentStore.loadTournaments()
    }
  }, [tournamentStore])

  // If tournament is already selected, redirect to home
  useEffect(() => {
    if (tournamentStore.currentTournament) {
      navigate('/', { replace: true })
    }
  }, [tournamentStore.currentTournament, navigate])

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim()) return

    setIsCreating(true)
    const tournament = await tournamentStore.createTournament({
      name: newTournamentName.trim(),
      startDate: Timestamp.now(),
      status: newTournamentStatus,
    })
    setIsCreating(false)
    
    if (tournament) {
      navigate('/', { replace: true })
    }
  }

  const handleSelectTournament = () => {
    if (!selectedTournamentId) return
    
    const tournament = tournamentStore.tournaments.find((t) => t.id === selectedTournamentId)
    if (tournament) {
      tournamentStore.setCurrentTournament(tournament)
      navigate('/', { replace: true })
    }
  }

  // Loading state
  if (tournamentStore.isLoading || (!tournamentStore.isLoaded && !tournamentStore.error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading tournaments...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (tournamentStore.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{tournamentStore.error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => tournamentStore.reloadTournaments()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasTournaments = tournamentStore.tournaments.length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Ulti Stats</h1>
          <p className="text-muted-foreground">
            {hasTournaments 
              ? 'Select a tournament to continue'
              : 'Create your first tournament to get started'
            }
          </p>
        </div>

        {/* Select Existing Tournament */}
        {hasTournaments && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Continue with existing</CardTitle>
              <CardDescription>
                Select one of your {tournamentStore.tournaments.length} tournaments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tournament" />
                </SelectTrigger>
                <SelectContent>
                  {tournamentStore.tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      <div className="flex items-center gap-2">
                        <span>{tournament.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({tournament.status})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                className="w-full" 
                onClick={handleSelectTournament}
                disabled={!selectedTournamentId}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Divider */}
        {hasTournaments && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        )}

        {/* Create New Tournament */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {hasTournaments ? 'Create new tournament' : 'Create Tournament'}
            </CardTitle>
            <CardDescription>
              Start tracking stats for a new tournament
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Championship 2024"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTournament()
                }}
                autoFocus={!hasTournaments}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newTournamentStatus}
                onValueChange={(v) => setNewTournamentStatus(v as TournamentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateTournament}
              disabled={!newTournamentName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

