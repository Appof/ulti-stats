import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Timestamp } from 'firebase/firestore'
import { useTournamentStore } from '@/stores'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trophy } from 'lucide-react'
import type { TournamentStatus } from '@/types'

export const TournamentSelector = observer(function TournamentSelector() {
  const tournamentStore = useTournamentStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newTournamentStatus, setNewTournamentStatus] = useState<TournamentStatus>('active')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!tournamentStore.isLoaded && !tournamentStore.isLoading) {
      tournamentStore.loadTournaments()
    }
  }, [tournamentStore, tournamentStore.isLoaded, tournamentStore.isLoading])

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim()) return

    setIsCreating(true)
    await tournamentStore.createTournament({
      name: newTournamentName.trim(),
      startDate: Timestamp.now(),
      status: newTournamentStatus,
    })
    setIsCreating(false)
    setNewTournamentName('')
    setIsCreateDialogOpen(false)
  }

  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournamentStore.tournaments.find((t) => t.id === tournamentId)
    if (tournament) {
      tournamentStore.setCurrentTournament(tournament)
    }
  }

  if (tournamentStore.isLoading && tournamentStore.tournaments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Trophy className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Trophy className="h-4 w-4 text-muted-foreground hidden sm:block" />
      
      {tournamentStore.tournaments.length > 0 ? (
        <Select
          value={tournamentStore.currentTournament?.id || ''}
          onValueChange={handleTournamentChange}
        >
          <SelectTrigger className="w-[120px] sm:w-[200px] h-8 sm:h-10 text-xs sm:text-sm">
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournamentStore.tournaments.map((tournament) => (
              <SelectItem key={tournament.id} value={tournament.id}>
                {tournament.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">No tournaments</span>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Create tournament" className="h-8 w-8 sm:h-10 sm:w-10">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
            <DialogDescription>
              Create a new tournament to track games and stats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTournament}
              disabled={!newTournamentName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

