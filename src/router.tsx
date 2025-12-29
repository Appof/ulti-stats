import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/components/layout'
import { HomePage, GamesPage, TeamsPage, PlayersPage, HistoryPage, TournamentPage } from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/tournament',
    element: <TournamentPage />,
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'teams',
        element: <TeamsPage />,
      },
      {
        path: 'games',
        element: <GamesPage />,
      },
      {
        path: 'players',
        element: <PlayersPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
    ],
  },
])
