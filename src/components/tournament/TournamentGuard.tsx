import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useTournamentStore, useAuthStore } from '@/stores'
import { Loader2 } from 'lucide-react'

interface TournamentGuardProps {
  children: React.ReactNode
}

export const TournamentGuard = observer(function TournamentGuard({
  children,
}: TournamentGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const authStore = useAuthStore()
  const tournamentStore = useTournamentStore()

  // Redirect to sign-in page if not authenticated
  useEffect(() => {
    if (!authStore.isLoading && !authStore.isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [authStore.isLoading, authStore.isAuthenticated, navigate])

  // Only load tournaments if authenticated
  useEffect(() => {
    if (authStore.isAuthenticated && !tournamentStore.isLoaded && !tournamentStore.isLoading) {
      tournamentStore.loadTournaments()
    }
  }, [authStore.isAuthenticated, tournamentStore])

  // Redirect to tournament page if authenticated but no tournament selected
  useEffect(() => {
    if (
      authStore.isAuthenticated &&
      tournamentStore.isLoaded &&
      !tournamentStore.isLoading &&
      !tournamentStore.currentTournament &&
      location.pathname !== '/tournament'
    ) {
      navigate('/tournament', { replace: true })
    }
  }, [
    authStore.isAuthenticated,
    tournamentStore.isLoaded,
    tournamentStore.isLoading,
    tournamentStore.currentTournament,
    location.pathname,
    navigate,
  ])

  // If not authenticated, show redirecting (will redirect to home)
  if (!authStore.isAuthenticated) {
    return null
  }

  // Show loading while fetching tournaments
  if (tournamentStore.isLoading || (!tournamentStore.isLoaded && !tournamentStore.error)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // If no tournament selected, don't render children (will redirect)
  if (!tournamentStore.currentTournament) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
})
