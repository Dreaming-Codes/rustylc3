/**
 * OS configuration store with localStorage persistence.
 * 
 * Manages the loaded operating system for the LC-3 VM.
 */

import { Store } from '@tanstack/store'

// OS types
export type OSType = 'none' | 'lc3tools' | 'custom'

export interface OSState {
  /** Currently selected OS type */
  osType: OSType
  /** Custom OS binary data (base64 encoded), if osType is 'custom' */
  customOSData: string | null
  /** Custom OS name for display */
  customOSName: string | null
  /** Whether the OS has been loaded into VM for current session */
  isLoaded: boolean
}

const STORAGE_KEY = 'lc3-ide-os-config'

// Load initial state from localStorage
function loadInitialState(): OSState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        osType: parsed.osType || 'lc3tools',
        customOSData: parsed.customOSData || null,
        customOSName: parsed.customOSName || null,
        isLoaded: false, // Always start unloaded
      }
    }
  } catch (e) {
    console.error('Failed to load OS config from localStorage:', e)
  }
  return {
    osType: 'lc3tools',
    customOSData: null,
    customOSName: null,
    isLoaded: false,
  }
}

// Create the store
export const osStore = new Store<OSState>(loadInitialState())

// Persist to localStorage on changes (except isLoaded which is session-only)
osStore.subscribe(() => {
  const state = osStore.state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      osType: state.osType,
      customOSData: state.customOSData,
      customOSName: state.customOSName,
    }))
  } catch (e) {
    console.error('Failed to save OS config to localStorage:', e)
  }
})

/**
 * Set the OS type.
 */
export function setOSType(osType: OSType) {
  osStore.setState((s) => ({
    ...s,
    osType,
    isLoaded: false, // Need to reload
  }))
}

/**
 * Set custom OS data from a file.
 */
export function setCustomOS(name: string, data: Uint8Array) {
  // Convert to base64 for storage
  const base64 = btoa(String.fromCharCode(...data))
  osStore.setState((s) => ({
    ...s,
    osType: 'custom',
    customOSData: base64,
    customOSName: name,
    isLoaded: false,
  }))
}

/**
 * Get the current OS binary data as Uint8Array.
 * Returns null if no OS is selected.
 */
export async function getOSBytes(): Promise<Uint8Array | null> {
  const state = osStore.state
  
  switch (state.osType) {
    case 'none':
      return null
      
    case 'lc3tools':
      // Load the embedded lc3tools OS
      const response = await fetch('/lc3os.obj')
      if (!response.ok) {
        console.error('Failed to load lc3os.obj')
        return null
      }
      return new Uint8Array(await response.arrayBuffer())
      
    case 'custom':
      if (!state.customOSData) return null
      // Decode base64
      const binary = atob(state.customOSData)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
      
    default:
      return null
  }
}

/**
 * Mark the OS as loaded in the current session.
 */
export function markOSLoaded() {
  osStore.setState((s) => ({
    ...s,
    isLoaded: true,
  }))
}

/**
 * Mark the OS as needing reload (e.g., after VM reset).
 */
export function markOSUnloaded() {
  osStore.setState((s) => ({
    ...s,
    isLoaded: false,
  }))
}

/**
 * Get a display name for the current OS.
 */
export function getOSDisplayName(): string {
  const state = osStore.state
  switch (state.osType) {
    case 'none':
      return 'None (Shortcut Mode)'
    case 'lc3tools':
      return 'lc3tools OS'
    case 'custom':
      return state.customOSName || 'Custom OS'
    default:
      return 'Unknown'
  }
}
