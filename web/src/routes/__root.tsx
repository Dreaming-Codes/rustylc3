import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="dark h-screen w-screen overflow-hidden bg-zinc-950">
      <Outlet />
    </div>
  ),
})
