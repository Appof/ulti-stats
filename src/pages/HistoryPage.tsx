import { useState, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { TournamentGuard } from '@/components/tournament'
import { useTournamentStore } from '@/stores'
import * as firestoreService from '@/services/firestore'
import type { HistoryEntry, HistoryAction, EntityType, ScoringEvent } from '@/types'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Undo2, Trash2, Filter, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const actionColors: Record<HistoryAction, 'default' | 'secondary' | 'destructive'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
}

const entityIcons: Record<EntityType, string> = {
  team: '👥',
  game: '🎮',
  player: '🏃',
  event: '🥏',
  tournament: '🏆',
}

export const HistoryPage = observer(function HistoryPage() {
  const tournamentStore = useTournamentStore()
  const location = useLocation()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [isUndoDialogOpen, setIsUndoDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load history
  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await firestoreService.getHistory()
      setHistory(data)
    } catch (error) {
      console.error('Failed to load history:', error)
      toast.error('Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory, location.key])

  // Filter history
  const filteredHistory = history.filter((entry) => {
    if (filterEntity !== 'all' && entry.entityType !== filterEntity) return false
    if (filterAction !== 'all' && entry.action !== filterAction) return false
    return true
  })

  // Format timestamp
  const formatTimestamp = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Handle undo action
  const handleUndo = (entry: HistoryEntry) => {
    setSelectedEntry(entry)
    setIsUndoDialogOpen(true)
  }

  // Handle delete history entry
  const handleDelete = (entry: HistoryEntry) => {
    setSelectedEntry(entry)
    setIsDeleteDialogOpen(true)
  }

  // Confirm undo
  const confirmUndo = async () => {
    if (!selectedEntry) return

    setIsProcessing(true)
    try {
      // Undo logic based on action type
      if (selectedEntry.action === 'create' && selectedEntry.entityType === 'event') {
        // For created events, we need to delete them
        // First get the event and game
        const eventSnapshot = selectedEntry.currentSnapshot as unknown as ScoringEvent
        if (eventSnapshot && eventSnapshot.gameId) {
          const game = await firestoreService.getGame(eventSnapshot.gameId)
          if (game) {
            const events = await firestoreService.getEventsByGame(game.id)
            const eventToDelete = events.find(e => e.id === selectedEntry.entityId)
            if (eventToDelete) {
              await firestoreService.deleteScoringEvent(eventToDelete, game)
              toast.success('Event undone successfully')
            }
          }
        }
      } else if (selectedEntry.action === 'delete' && selectedEntry.entityType === 'event') {
        // For deleted events, restore them
        const eventSnapshot = selectedEntry.previousSnapshot as unknown as ScoringEvent
        if (eventSnapshot && eventSnapshot.gameId) {
          const game = await firestoreService.getGame(eventSnapshot.gameId)
          if (game) {
            // Recreate the scoring event
            await firestoreService.createScoringEvent({
              gameId: eventSnapshot.gameId,
              tournamentId: eventSnapshot.tournamentId,
              teamId: eventSnapshot.teamId,
              scorerPlayerId: eventSnapshot.scorerPlayerId,
              scorerNumber: eventSnapshot.scorerNumber,
              scorerName: eventSnapshot.scorerName,
              assisterPlayerId: eventSnapshot.assisterPlayerId,
              assisterNumber: eventSnapshot.assisterNumber,
              assisterName: eventSnapshot.assisterName,
              homeScore: eventSnapshot.homeScore,
              awayScore: eventSnapshot.awayScore,
            }, game)
            toast.success('Event restored successfully')
          }
        }
      } else {
        toast.info('Undo not implemented for this action type yet')
      }

      await loadHistory()
    } catch (error) {
      console.error('Failed to undo:', error)
      toast.error('Failed to undo action')
    } finally {
      setIsProcessing(false)
      setIsUndoDialogOpen(false)
      setSelectedEntry(null)
    }
  }

  // Confirm delete history entry
  const confirmDelete = async () => {
    if (!selectedEntry) return

    setIsProcessing(true)
    try {
      await firestoreService.deleteHistoryEntry(selectedEntry.id)
      toast.success('History entry deleted')
      await loadHistory()
    } catch (error) {
      console.error('Failed to delete history entry:', error)
      toast.error('Failed to delete history entry')
    } finally {
      setIsProcessing(false)
      setIsDeleteDialogOpen(false)
      setSelectedEntry(null)
    }
  }

  // Get details for display
  const getEntryDetails = (entry: HistoryEntry): string => {
    if (entry.changes && entry.changes.length > 0) {
      return entry.changes.map(c => `${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`).join(', ')
    }
    if (entry.action === 'create' && entry.currentSnapshot) {
      const snapshot = entry.currentSnapshot as Record<string, unknown>
      if (entry.entityType === 'event') {
        return `Scorer: ${snapshot.scorerName}${snapshot.assisterName ? `, Assist: ${snapshot.assisterName}` : ''}`
      }
    }
    if (entry.action === 'delete' && entry.previousSnapshot) {
      const snapshot = entry.previousSnapshot as Record<string, unknown>
      if (entry.entityType === 'event') {
        return `Scorer: ${snapshot.scorerName}${snapshot.assisterName ? `, Assist: ${snapshot.assisterName}` : ''}`
      }
    }
    return ''
  }

  // Check if undo is available
  const canUndo = (entry: HistoryEntry): boolean => {
    // For now, only support undo for event actions
    return entry.entityType === 'event' && (entry.action === 'create' || entry.action === 'delete')
  }

  return (
    <TournamentGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">History</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {tournamentStore.currentTournament?.name} — Action log
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="tournament">Tournaments</SelectItem>
                    <SelectItem value="team">Teams</SelectItem>
                    <SelectItem value="game">Games</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                    <SelectItem value="player">Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Action History</CardTitle>
            <CardDescription>
              {filteredHistory.length} actions recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No history entries found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Time</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                      <TableHead className="w-[100px]">Entity</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden lg:table-cell">User</TableHead>
                      <TableHead className="hidden md:table-cell">Details</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-xs sm:text-sm">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionColors[entry.action]} className="text-xs">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="mr-1">{entityIcons[entry.entityType] || '📄'}</span>
                          <span className="hidden sm:inline">{entry.entityType}</span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate" title={entry.entityName}>
                          {entry.entityName}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[180px] truncate" title={entry.userEmail}>
                          {entry.userEmail}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate" title={getEntryDetails(entry)}>
                          {getEntryDetails(entry)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canUndo(entry) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Undo this action"
                                onClick={() => handleUndo(entry)}
                                className="h-8 w-8"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete history entry"
                              onClick={() => handleDelete(entry)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Undo Confirmation Dialog */}
        <Dialog open={isUndoDialogOpen} onOpenChange={setIsUndoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Undo Action
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to undo this action?
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant={actionColors[selectedEntry.action]}>
                    {selectedEntry.action}
                  </Badge>
                  <span>{entityIcons[selectedEntry.entityType]}</span>
                  <span className="font-medium">{selectedEntry.entityName}</span>
                </div>
                {selectedEntry.action === 'create' && (
                  <p className="text-sm text-muted-foreground">
                    This will <strong>delete</strong> the created {selectedEntry.entityType}.
                  </p>
                )}
                {selectedEntry.action === 'delete' && (
                  <p className="text-sm text-muted-foreground">
                    This will <strong>restore</strong> the deleted {selectedEntry.entityType}.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUndoDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={confirmUndo} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Undo Action'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete History Entry Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete History Entry
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this history entry? This only removes the log entry, not the actual data.
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant={actionColors[selectedEntry.action]}>
                    {selectedEntry.action}
                  </Badge>
                  <span>{entityIcons[selectedEntry.entityType]}</span>
                  <span className="font-medium">{selectedEntry.entityName}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Entry'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TournamentGuard>
  )
})
