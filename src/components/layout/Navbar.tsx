import { Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useAuthStore, useStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TournamentSelector } from '@/components/tournament'

export const Navbar = observer(function Navbar() {
  const rootStore = useStore()
  const authStore = useAuthStore()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 max-w-7xl">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-xl sm:text-2xl">🥏</span>
            <span className="text-base sm:text-xl font-bold text-foreground hidden sm:inline">Ulti Stats</span>
          </Link>
          
          {authStore.isAuthenticated && <TournamentSelector />}
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {authStore.isAuthenticated ? (
            <>
              <Link to="/teams" className="hidden md:block">
                <Button variant="ghost" size="sm">Teams</Button>
              </Link>
              <Link to="/games" className="hidden md:block">
                <Button variant="ghost" size="sm">Games</Button>
              </Link>
              <Link to="/players" className="hidden md:block">
                <Button variant="ghost" size="sm">Players</Button>
              </Link>
              <Link to="/history" className="hidden md:block">
                <Button variant="ghost" size="sm">History</Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      {authStore.user?.photoURL && (
                        <img
                          src={authStore.user.photoURL}
                          alt={authStore.user.displayName || 'User'}
                          referrerPolicy="no-referrer"
                          className="aspect-square h-full w-full object-cover rounded-full"
                        />
                      )}
                      <AvatarFallback className="text-xs sm:text-sm">
                        {authStore.user?.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="font-medium">
                    {authStore.user?.displayName}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link to="/teams">Teams</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link to="/games">Games</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link to="/players">Players</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link to="/history">History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => rootStore.logout()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => authStore.signInWithGoogle()} size="sm">
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
})
