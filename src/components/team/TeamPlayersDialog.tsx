import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePlayerStore } from '@/stores'
import { playerSchema, type PlayerFormData } from '@/schemas'
import type { Team, Player } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface TeamPlayersDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const TeamPlayersDialog = observer(function TeamPlayersDialog({
  team,
  open,
  onOpenChange,
}: TeamPlayersDialogProps) {
  const playerStore = usePlayerStore()
  const [isAddingPlayer, setIsAddingPlayer] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null)

  // Load players when dialog opens
  useEffect(() => {
    if (open && !playerStore.isLoaded && !playerStore.isLoading) {
      playerStore.loadPlayers()
    }
  }, [open, playerStore])

  // Add player form
  const addForm = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: { name: '', number: 0, gender: 'male' },
  })

  // Edit player form
  const editForm = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: { name: '', number: 0, gender: 'male' },
  })

  const teamPlayers = team ? playerStore.getPlayersByTeam(team.id) : []

  const handleAddPlayer = async (data: PlayerFormData) => {
    if (!team) return
    const player = await playerStore.createPlayer({
      ...data,
      teamId: team.id,
    })
    if (player) {
      toast.success(`Player "${player.name}" added!`)
      addForm.reset({ name: '', number: 0, gender: 'male' })
      setIsAddingPlayer(false)
    } else {
      toast.error(playerStore.error || 'Failed to add player')
    }
  }

  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id)
    editForm.reset({ name: player.name, number: player.number, gender: player.gender })
  }

  const handleCancelEdit = () => {
    setEditingPlayerId(null)
    editForm.reset()
  }

  const handleSaveEdit = async (playerId: string) => {
    const data = editForm.getValues()
    const isValid = await editForm.trigger()
    if (!isValid) return

    const success = await playerStore.updatePlayer(playerId, data)
    if (success) {
      toast.success(`Player updated!`)
      setEditingPlayerId(null)
    } else {
      toast.error(playerStore.error || 'Failed to update player')
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    const player = playerStore.players.find((p) => p.id === playerId)
    setDeletingPlayerId(playerId)
    const success = await playerStore.deletePlayer(playerId)
    if (success) {
      toast.success(`Player "${player?.name}" removed!`)
    } else {
      toast.error(playerStore.error || 'Failed to remove player')
    }
    setDeletingPlayerId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Players — {team?.name}</DialogTitle>
          <DialogDescription>
            Add, edit, or remove players from this team
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Players Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[80px]">Gender</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPlayers.map((player) => (
                <TableRow key={player.id}>
                  {editingPlayerId === player.id ? (
                    <>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-16 h-8"
                          {...editForm.register('number', { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          {...editForm.register('name')}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          control={editForm.control}
                          name="gender"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-8 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">M</SelectItem>
                                <SelectItem value="female">F</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSaveEdit(player.id)}
                            disabled={playerStore.isLoading}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono font-medium">
                        {player.number}
                      </TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>
                        <span className={player.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}>
                          {player.gender === 'male' ? 'M' : 'F'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleStartEdit(player)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeletePlayer(player.id)}
                            disabled={deletingPlayerId === player.id}
                          >
                            {deletingPlayerId === player.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}

              {/* Add Player Row */}
              {isAddingPlayer ? (
                <TableRow>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16 h-8"
                      placeholder="#"
                      {...addForm.register('number', { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder="Player name"
                      {...addForm.register('name')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void addForm.handleSubmit(handleAddPlayer)()
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={addForm.control}
                      name="gender"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">M</SelectItem>
                            <SelectItem value="female">F</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void addForm.handleSubmit(handleAddPlayer)()}
                        disabled={playerStore.isLoading}
                      >
                        {playerStore.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setIsAddingPlayer(false)
                          addForm.reset()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {/* Empty state */}
              {teamPlayers.length === 0 && !isAddingPlayer && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No players yet. Add your first player!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {!isAddingPlayer && (
            <Button
              variant="outline"
              onClick={() => setIsAddingPlayer(true)}
              className="mr-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

