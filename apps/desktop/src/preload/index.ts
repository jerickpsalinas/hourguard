import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('api', {
  login: (email: string, password: string) =>
    ipcRenderer.invoke('auth:login', email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  startTracking: (projectId?: string) =>
    ipcRenderer.invoke('tracker:start', projectId),
  stopTracking: () => ipcRenderer.invoke('tracker:stop'),
  getStatus: () => ipcRenderer.invoke('tracker:status'),
  getProjects: () => ipcRenderer.invoke('projects:list'),
  // Subscribe to tracker state changes (idle auto-pause / auto-resume).
  // Returns an unsubscribe function.
  onTrackerState: (cb: (state: string) => void) => {
    const listener = (_e: IpcRendererEvent, state: string) => cb(state);
    ipcRenderer.on('tracker:state', listener);
    return () => ipcRenderer.removeListener('tracker:state', listener);
  },
});
