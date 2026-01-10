import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: () => (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950">
      <Outlet />
      <Toaster position="bottom-right" />
    </div>
  ),
})
