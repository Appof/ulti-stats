import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Navbar } from './Navbar'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full px-3 py-4 sm:container sm:mx-auto sm:px-4 sm:py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}

