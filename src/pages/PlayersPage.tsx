import { useEffect, useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { TournamentGuard } from '@/components/tournament'
import { useTournamentStore, useTeamStore, usePlayerStore } from '@/stores'
import * as firestoreService from '@/services/firestore'
import type { PlayerStats } from '@/types'
import ExcelJS from 'exceljs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, Trophy, Crown, FileSpreadsheet, Download } from 'lucide-react'

export const PlayersPage = observer(function PlayersPage() {
  const tournamentStore = useTournamentStore()
  const teamStore = useTeamStore()
  const playerStore = usePlayerStore()
  const location = useLocation()
  const [tournamentStats, setTournamentStats] = useState<PlayerStats[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Load stats function
  const loadStats = useCallback(async () => {
    if (!tournamentStore.currentTournament) return
    
    setIsLoadingStats(true)
    try {
      const stats = await firestoreService.getTournamentStats(tournamentStore.currentTournament.id)
      setTournamentStats(stats)
    } catch (error) {
      console.error('Failed to load tournament stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [tournamentStore.currentTournament])

  // Load teams and players
  useEffect(() => {
    if (!teamStore.isLoaded && !teamStore.isLoading) {
      teamStore.loadTeams()
    }
    if (!playerStore.isLoaded && !playerStore.isLoading) {
      playerStore.loadPlayers()
    }
  }, [teamStore, playerStore])

  // Load tournament stats every time page is visited
  useEffect(() => {
    loadStats()
  }, [loadStats, location.key])

  // Combine players with their stats
  const playersWithStats = playerStore.players.map((player) => {
    const stats = tournamentStats.find((s) => s.playerId === player.id)
    const team = teamStore.teams.find((t) => t.id === player.teamId)
    return {
      ...player,
      teamName: team?.name || 'Unknown',
      goals: stats?.goals || 0,
      assists: stats?.assists || 0,
      total: (stats?.goals || 0) + (stats?.assists || 0),
    }
  }).sort((a, b) => b.total - a.total || b.goals - a.goals || a.name.localeCompare(b.name))

  // Find MVPs by gender
  const malePlayers = playersWithStats.filter((p) => p.gender === 'male')
  const femalePlayers = playersWithStats.filter((p) => p.gender === 'female')
  const maleMVP = malePlayers[0]
  const femaleMVP = femalePlayers[0]

  const isLoading = playerStore.isLoading || teamStore.isLoading || isLoadingStats

  // Export to Excel function with styling
  const exportToExcel = async () => {
    const tournamentName = tournamentStore.currentTournament?.name || 'Tournament'
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Ulti Stats'
    workbook.created = new Date()
    
    const worksheet = workbook.addWorksheet('Player Stats', {
      views: [{ state: 'frozen', ySplit: 2 }] // Freeze header rows
    })

    // Define columns
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 25 },
      { header: '#', key: 'number', width: 8 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Team', key: 'team', width: 22 },
      { header: 'Goals', key: 'goals', width: 10 },
      { header: 'Assists', key: 'assists', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
    ]

    // Add title row
    worksheet.insertRow(1, [tournamentName + ' — Player Statistics'])
    worksheet.mergeCells('A1:H1')
    const titleCell = worksheet.getCell('A1')
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1F2937' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    }
    worksheet.getRow(1).height = 30

    // Style header row (now row 2)
    const headerRow = worksheet.getRow(2)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 24

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
      }
    })

    // Add data rows
    playersWithStats.forEach((player, index) => {
      const row = worksheet.addRow({
        rank: index + 1,
        name: player.name,
        number: player.number,
        gender: player.gender === 'male' ? 'M' : 'F',
        team: player.teamName,
        goals: player.goals,
        assists: player.assists,
        total: player.total,
      })

      // Alternating row colors
      const isEvenRow = index % 2 === 0
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFFFFFFF' : 'FFF9FAFB' }
      }

      // Style specific columns
      row.getCell('rank').alignment = { horizontal: 'center' }
      row.getCell('number').alignment = { horizontal: 'center' }
      row.getCell('gender').alignment = { horizontal: 'center' }
      row.getCell('goals').alignment = { horizontal: 'center' }
      row.getCell('assists').alignment = { horizontal: 'center' }
      row.getCell('total').alignment = { horizontal: 'center' }

      // Color gender cell
      const genderCell = row.getCell('gender')
      if (player.gender === 'male') {
        genderCell.font = { color: { argb: 'FF3B82F6' }, bold: true }
      } else {
        genderCell.font = { color: { argb: 'FFEC4899' }, bold: true }
      }

      // Color stats cells
      if (player.goals > 0) {
        row.getCell('goals').font = { color: { argb: 'FF16A34A' }, bold: true }
      }
      if (player.assists > 0) {
        row.getCell('assists').font = { color: { argb: 'FF2563EB' }, bold: true }
      }
      row.getCell('total').font = { bold: true }

      // Highlight top 3
      if (index < 3 && player.total > 0) {
        const rankCell = row.getCell('rank')
        if (index === 0) {
          rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } }
          rankCell.font = { bold: true }
        } else if (index === 1) {
          rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9CA3AF' } }
          rankCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        } else {
          rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }
          rankCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        }
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      })
    })

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const date = new Date().toISOString().split('T')[0]
    const filename = `${tournamentName.replace(/[^a-z0-9]/gi, '_')}_stats_${date}.xlsx`
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <TournamentGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Players</h1>
          <p className="text-muted-foreground">
            {tournamentStore.currentTournament?.name} — Player statistics
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament Leaderboard
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Top 10 of {playersWithStats.length} players • Stats from all games in this tournament
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={playersWithStats.length === 0}>
                    <FileSpreadsheet className="h-4 w-4" />
                    View All Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {tournamentStore.currentTournament?.name} — Full Results
                    </DialogTitle>
                    <DialogDescription>
                      Complete statistics for all {playersWithStats.length} players
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Rank</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead className="w-[70px]">Gender</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-center">Goals</TableHead>
                          <TableHead className="text-center">Assists</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playersWithStats.map((player, index) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-mono">{index + 1}</TableCell>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell className="font-mono">{player.number}</TableCell>
                            <TableCell>
                              <Badge variant={player.gender === 'male' ? 'default' : 'secondary'} className={player.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}>
                                {player.gender === 'male' ? 'M' : 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell>{player.teamName}</TableCell>
                            <TableCell className="text-center font-medium text-green-600">{player.goals}</TableCell>
                            <TableCell className="text-center font-medium text-blue-600">{player.assists}</TableCell>
                            <TableCell className="text-center font-bold">{player.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={exportToExcel} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export to Excel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : playersWithStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No players yet. Add players to your teams first!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead className="w-[60px]">Gender</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Goals</TableHead>
                    <TableHead className="text-center">Assists</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playersWithStats.slice(0, 10).map((player, index) => {
                    const rank = index + 1
                    const hasStats = player.total > 0
                    const isMVP = (player.gender === 'male' && player.id === maleMVP?.id) ||
                                 (player.gender === 'female' && player.id === femaleMVP?.id)
                    
                    return (
                      <TableRow key={player.id} className={!hasStats ? 'opacity-60' : ''}>
                        <TableCell>
                          {rank <= 3 && hasStats ? (
                            <Badge 
                              variant={rank === 1 ? 'default' : 'secondary'} 
                              className={`w-7 h-7 rounded-full p-0 flex items-center justify-center ${
                                rank === 1 ? 'bg-yellow-500 hover:bg-yellow-500' :
                                rank === 2 ? 'bg-gray-400 hover:bg-gray-400' :
                                'bg-amber-600 hover:bg-amber-600'
                              }`}
                            >
                              {rank}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground pl-2">{rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className={`h-8 w-8 ${player.gender === 'male' ? 'border-2 border-blue-400' : 'border-2 border-pink-400'}`}>
                              <AvatarFallback className={`text-xs ${player.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                {player.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{player.name}</span>
                              {isMVP && hasStats && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{player.number}</TableCell>
                        <TableCell>
                          <span className={player.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}>
                            {player.gender === 'male' ? 'M' : 'F'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{player.teamName}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${player.goals > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {player.goals}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${player.assists > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            {player.assists}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${player.total > 0 ? '' : 'text-muted-foreground'}`}>
                            {player.total}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* MVP Cards */}
        {playersWithStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardDescription className="text-blue-600 font-medium">MVP Male</CardDescription>
                </div>
                <CardTitle className="text-2xl">
                  {maleMVP?.name || '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {maleMVP ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-blue-400">
                      <AvatarFallback className="text-sm bg-blue-50 text-blue-700">
                        {maleMVP.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{maleMVP.goals}</p>
                        <p className="text-xs text-muted-foreground">goals</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{maleMVP.assists}</p>
                        <p className="text-xs text-muted-foreground">assists</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{maleMVP.total}</p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No male players yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardDescription className="text-pink-600 font-medium">MVP Female</CardDescription>
                </div>
                <CardTitle className="text-2xl">
                  {femaleMVP?.name || '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {femaleMVP ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-pink-400">
                      <AvatarFallback className="text-sm bg-pink-50 text-pink-700">
                        {femaleMVP.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{femaleMVP.goals}</p>
                        <p className="text-xs text-muted-foreground">goals</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{femaleMVP.assists}</p>
                        <p className="text-xs text-muted-foreground">assists</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{femaleMVP.total}</p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No female players yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Summary */}
        {playersWithStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top Scorer</CardDescription>
                <CardTitle className="text-2xl">
                  {[...playersWithStats].sort((a, b) => b.goals - a.goals)[0]?.name || '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {[...playersWithStats].sort((a, b) => b.goals - a.goals)[0]?.goals || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-2">goals</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top Assist</CardDescription>
                <CardTitle className="text-2xl">
                  {[...playersWithStats].sort((a, b) => b.assists - a.assists)[0]?.name || '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {[...playersWithStats].sort((a, b) => b.assists - a.assists)[0]?.assists || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-2">assists</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Points</CardDescription>
                <CardTitle className="text-2xl">Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {playersWithStats.reduce((sum, p) => sum + p.goals, 0)}
                  <span className="text-sm font-normal text-muted-foreground ml-2">goals scored</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TournamentGuard>
  )
})
