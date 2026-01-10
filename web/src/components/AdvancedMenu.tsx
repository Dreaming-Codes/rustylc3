import { useStore } from '@tanstack/react-store'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Settings, ChevronDown, Check, Upload, Cpu } from 'lucide-react'
import {
  osStore,
  setOSType,
  setCustomOS,
  type OSType,
} from '@/lib/os-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function AdvancedMenu() {
  const osType = useStore(osStore, (s) => s.osType)
  const customOSName = useStore(osStore, (s) => s.customOSName)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOSSelect = useCallback((type: OSType) => {
    setOSType(type)
    const displayName = type === 'none' ? 'Shortcut mode' : type === 'lc3tools' ? 'lc3tools OS' : 'Custom OS'
    toast.success(`OS set to: ${displayName}`, {
      description: 'Re-assemble your program to apply changes',
    })
  }, [])

  const handleUploadOS = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer)
      if (data.length < 2 || data.length % 2 !== 0) {
        toast.error('Invalid OS file', {
          description: 'OS file must have even number of bytes with origin header',
        })
        return
      }
      setCustomOS(file.name, data)
      toast.success(`Custom OS loaded: ${file.name}`, {
        description: 'Re-assemble your program to apply changes',
      })
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsArrayBuffer(file)

    // Reset input so same file can be selected again
    e.target.value = ''
  }, [])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".obj,.bin"
        onChange={handleFileChange}
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-100"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Operating System
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleOSSelect('none')}>
            <div className="flex w-full items-center justify-between">
              <div>
                <div className="font-medium">None (Shortcut)</div>
                <div className="text-xs text-zinc-500">TRAPs handled directly by VM</div>
              </div>
              {osType === 'none' && <Check className="h-4 w-4 text-green-500" />}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleOSSelect('lc3tools')}>
            <div className="flex w-full items-center justify-between">
              <div>
                <div className="font-medium">lc3tools OS</div>
                <div className="text-xs text-zinc-500">Standard LC-3 operating system</div>
              </div>
              {osType === 'lc3tools' && <Check className="h-4 w-4 text-green-500" />}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleUploadOS}>
            <div className="flex w-full items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Upload className="h-3 w-3" />
                  Upload Custom OS...
                </div>
                {osType === 'custom' && customOSName && (
                  <div className="text-xs text-zinc-500">{customOSName}</div>
                )}
              </div>
              {osType === 'custom' && <Check className="h-4 w-4 text-green-500" />}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
