import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TournamentGuard } from '@/components/tournament'
import { TeamPlayersDialog } from '@/components/team'
import { useTeamStore, usePlayerStore } from '@/stores'
import { teamSchema, type TeamFormData } from '@/schemas'
import type { Team } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'

export const TeamsPage = observer(function TeamsPage() {
  const teamStore = useTeamStore()
  const playerStore = usePlayerStore()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPlayersDialogOpen, setIsPlayersDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  // Load teams and players on mount
  useEffect(() => {
    if (!teamStore.isLoaded && !teamStore.isLoading) {
      teamStore.loadTeams()
    }
    if (!playerStore.isLoaded && !playerStore.isLoading) {
      playerStore.loadPlayers()
    }
  }, [teamStore, playerStore])

  const handlePlayersClick = (team: Team) => {
    setSelectedTeam(team)
    setIsPlayersDialogOpen(true)
  }

  const getPlayerCount = (teamId: string) => {
    return playerStore.getPlayersByTeam(teamId).length
  }

  // Add form
  const addForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: '', city: '' },
  })

  // Edit form
  const editForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: '', city: '' },
  })

  const handleAdd = async (data: TeamFormData) => {
    const team = await teamStore.createTeam(data)
    if (team) {
      toast.success(`Team "${team.name}" created!`)
      addForm.reset()
      setIsAddDialogOpen(false)
    } else {
      toast.error(teamStore.error || 'Failed to create team')
    }
  }

  const handleEditClick = (team: Team) => {
    setSelectedTeam(team)
    editForm.reset({ name: team.name, city: team.city })
    setIsEditDialogOpen(true)
  }

  const handleEdit = async (data: TeamFormData) => {
    if (!selectedTeam) return
    const success = await teamStore.updateTeam(selectedTeam.id, data)
    if (success) {
      toast.success(`Team "${data.name}" updated!`)
      setIsEditDialogOpen(false)
      setSelectedTeam(null)
    } else {
      toast.error(teamStore.error || 'Failed to update team')
    }
  }

  const handleDeleteClick = (team: Team) => {
    setSelectedTeam(team)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedTeam) return
    const success = await teamStore.deleteTeam(selectedTeam.id)
    if (success) {
      toast.success(`Team "${selectedTeam.name}" deleted!`)
      setIsDeleteDialogOpen(false)
      setSelectedTeam(null)
    } else {
      toast.error(teamStore.error || 'Failed to delete team')
    }
  }

  return (
    <TournamentGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground">Manage your ultimate frisbee teams</p>
          </div>
          
          {/* Add Team Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={addForm.handleSubmit(handleAdd)}>
                <DialogHeader>
                  <DialogTitle>Add New Team</DialogTitle>
                  <DialogDescription>
                    Create a new team to track statistics for.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Team Name</Label>
                    <Input
                      id="add-name"
                      placeholder="e.g., Thunder Birds"
                      {...addForm.register('name')}
                    />
                    {addForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-city">City</Label>
                    <Input
                      id="add-city"
                      placeholder="e.g., New York"
                      {...addForm.register('city')}
                    />
                    {addForm.formState.errors.city && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={teamStore.isLoading}>
                    {teamStore.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Team
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Teams Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Teams</CardTitle>
            <CardDescription>
              {teamStore.teams.length} teams registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamStore.isLoading && teamStore.teams.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamStore.teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No teams yet. Create your first team!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-center">Players</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamStore.teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.city}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayersClick(team)}
                          className="font-medium"
                        >
                          {getPlayerCount(team.id)} players
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePlayersClick(team)}>
                              <Users className="mr-2 h-4 w-4" />
                              Players
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(team)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(team)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={editForm.handleSubmit(handleEdit)}>
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>
                  Update team information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Team Name</Label>
                  <Input
                    id="edit-name"
                    {...editForm.register('name')}
                  />
                  {editForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {editForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    {...editForm.register('city')}
                  />
                  {editForm.formState.errors.city && (
                    <p className="text-sm text-destructive">
                      {editForm.formState.errors.city.message}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={teamStore.isLoading}>
                  {teamStore.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Team</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedTeam?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={teamStore.isLoading}
              >
                {teamStore.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Players Dialog */}
        <TeamPlayersDialog
          team={selectedTeam}
          open={isPlayersDialogOpen}
          onOpenChange={setIsPlayersDialogOpen}
        />
      </div>
    </TournamentGuard>
  )
})
