import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels'
import { Cpu, Code2, Github } from 'lucide-react'

import { LC3Editor } from '@/components/LC3Editor'
import { RegistersPanel } from '@/components/RegistersPanel'
import { ControlPanel } from '@/components/ControlPanel'
import { ConsolePanel } from '@/components/ConsolePanel'
import { MemoryPanel } from '@/components/MemoryPanel'
import { initWasm } from '@/lib/lc3-store'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: IDE,
})

function IDE() {
  // Initialize WASM on mount
  useEffect(() => {
    initWasm()
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-400" />
            <h1 className="text-lg font-semibold text-zinc-100">
              LC-3 <span className="text-blue-400">IDE</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-100"
            asChild
          >
            <a
              href="https://github.com/Dreaming-Codes/rustylc3"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden p-2">
        <PanelGroup orientation="horizontal" className="h-full">
          {/* Left: Editor */}
          <Panel defaultSize={55} minSize={30}>
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center gap-2 px-2">
                <Code2 className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-400">
                  Editor
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <LC3Editor />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="mx-1" />

          {/* Right: Controls, Registers, Console, Memory */}
          <Panel defaultSize={45} minSize={25}>
            <PanelGroup orientation="vertical" className="h-full">
              {/* Top: Controls + Registers */}
              <Panel defaultSize={45} minSize={20}>
                <div className="flex h-full gap-2">
                  {/* Controls */}
                  <div className="w-[280px] flex-shrink-0">
                    <ControlPanel />
                  </div>
                  {/* Registers */}
                  <div className="flex-1 overflow-hidden">
                    <RegistersPanel />
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="my-1" />

              {/* Bottom: Console + Memory */}
              <Panel defaultSize={55} minSize={20}>
                <PanelGroup orientation="horizontal" className="h-full">
                  {/* Console */}
                  <Panel defaultSize={45} minSize={25}>
                    <ConsolePanel />
                  </Panel>

                  <PanelResizeHandle className="mx-1" />

                  {/* Memory */}
                  <Panel defaultSize={55} minSize={30}>
                    <MemoryPanel />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>

      {/* Footer */}
      <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900/50 px-4 text-xs text-zinc-600">
        <span>LC-3 Virtual Machine</span>
        <span>Built with ❤️ by <a href="https://dreaming.codes" target="_blank">DreamingCodes</a></span>
      </footer>
    </div>
  )
}
