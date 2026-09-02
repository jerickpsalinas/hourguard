import { contextBridge, ipcRenderer } from 'electron';

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
});
