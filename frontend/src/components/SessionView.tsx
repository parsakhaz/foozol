import { useRef, useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useSessionHistoryStore } from '../stores/sessionHistoryStore';
import { useHotkey } from '../hooks/useHotkey';
import { EmptyState } from './EmptyState';
// import CombinedDiffView from './panels/diff/CombinedDiffView'; // Removed - now in panels
import { Inbox } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { useSessionView } from '../hooks/useSessionView';
import { DetailPanel } from './DetailPanel';
// import { SessionInputWithImages } from './panels/claude/ClaudeInputWithImages'; // Removed - now in panels
import { GitErrorDialog } from './session/GitErrorDialog';
import { CommitMessageDialog } from './session/CommitMessageDialog';
import { FolderArchiveDialog } from './session/FolderArchiveDialog';
// import { FileEditor } from './panels/editor/FileEditor'; // Removed - now in panels
import { ProjectView } from './ProjectView';
import { API } from '../utils/api';
import { useResizable } from '../hooks/useResizable';
import { useResizableHeight } from '../hooks/useResizableHeight';
// import { RichOutputWithSidebar } from './panels/claude/RichOutputWithSidebar'; // Removed - now in panels
// import { RichOutputSettings } from './panels/claude/RichOutputView'; // Removed - not needed
// import { LogsView } from './panels/logPanel/LogsView'; // Removed - now in panels
// import { MessagesView } from './panels/claude/MessagesView'; // Removed - now in panels
import { usePanelStore } from '../stores/panelStore';
import { panelApi } from '../services/panelApi';
import { PanelTabBar } from './panels/PanelTabBar';
import { PanelContainer } from './panels/PanelContainer';
import { SessionProvider } from '../contexts/SessionContext';
import { ToolPanel, ToolPanelType } from '../../../shared/types/panels';
import { PanelCreateOptions } from '../types/panelComponents';
import { Download, Upload, GitMerge, Code2, Terminal, GripHorizontal, ChevronDown, ChevronUp, RefreshCw, Archive, ArchiveRestore, GitCommitHorizontal } from 'lucide-react';
import type { Project } from '../types/project';
import { devLog, renderLog } from '../utils/console';

export const SessionView = memo(() => {
  const { activeView, activeProjectId } = useNavigationStore();
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [isMergingProject, setIsMergingProject] = useState(false);
  const [sessionProject, setSessionProject] = useState<Project | null>(null);

  // Get active session by subscribing directly to store state
  // This ensures the component re-renders when git status or other session properties update
  const activeSession = useSessionStore((state) => {
    if (!state.activeSessionId) return undefined;
    // Check main repo session first
    if (state.activeMainRepoSession && state.activeMainRepoSession.id === state.activeSessionId) {
      return state.activeMainRepoSession;
    }
    // Otherwise look in regular sessions
    return state.sessions.find(session => session.id === state.activeSessionId);
  });
  
  const setActiveSession = useSessionStore(state => state.setActiveSession);

  // Panel store state and actions
  const {
    panels,
    activePanels,
    setPanels,
    setActivePanel: setActivePanelInStore,
    addPanel,
    removePanel,
    updatePanelState,
  } = usePanelStore();
  
  // History store for navigation
  const { addToHistory, navigateBack, navigateForward } = useSessionHistoryStore();

  // Load panels when session changes
  useEffect(() => {
    if (activeSession?.id) {
      devLog.debug('[SessionView] Loading panels for session:', activeSession.id);
      
      // Always reload panels from database when switching sessions
      // to ensure we get the latest saved state
      panelApi.loadPanelsForSession(activeSession.id).then(loadedPanels => {
        devLog.debug('[SessionView] Loaded panels:', loadedPanels);
        setPanels(activeSession.id, loadedPanels);
      });
      
      panelApi.getActivePanel(activeSession.id).then(activePanel => {
        console.log('[SessionView] Active panel from backend:', activePanel);
        if (activePanel) {
          setActivePanelInStore(activeSession.id, activePanel.id);
        }
      });
    }
  }, [activeSession?.id, setPanels, setActivePanelInStore]); // Remove panels from deps to avoid skipping reload
  
  // Listen for panel updates from the backend
  useEffect(() => {
    if (!activeSession?.id) return;
    
    // Handle panel creation events (for logs panel auto-creation)
    const handlePanelCreated = (panel: ToolPanel) => {
      console.log('[SessionView] Received panel:created event:', panel);
      
      // Only add if it's for the current session
      if (panel.sessionId === activeSession.id) {
        // Check if panel already exists to prevent duplicates
        const existingPanels = panels[activeSession.id] || [];
        const panelExists = existingPanels.some(p => p.id === panel.id);
        
        if (!panelExists) {
          console.log('[SessionView] Adding new panel to store:', panel);
          addPanel(panel);
        } else {
          console.log('[SessionView] Panel already exists, not adding duplicate:', panel.id);
        }
      }
    };
    
    const handlePanelUpdated = (updatedPanel: ToolPanel) => {
      console.log('[SessionView] Received panel:updated event:', updatedPanel);
      
      // Only update if it's for the current session
      if (updatedPanel.sessionId === activeSession.id) {
        console.log('[SessionView] Updating panel in store:', updatedPanel);
        updatePanelState(updatedPanel);
      }
    };
    
    // Listen for panel events
    const unsubscribeCreated = window.electronAPI?.events?.onPanelCreated?.(handlePanelCreated);
    const unsubscribeUpdated = window.electronAPI?.events?.onPanelUpdated?.(handlePanelUpdated);
    
    // Cleanup
    return () => {
      unsubscribeCreated?.();
      unsubscribeUpdated?.();
    };
  }, [activeSession?.id, addPanel, updatePanelState, panels]);

  // Get panels for current session with memoization
  const sessionPanels = useMemo(
    () => panels[activeSession?.id || ''] || [],
    [panels, activeSession?.id]
  );

  const currentActivePanel = useMemo(
    () => sessionPanels.find(p => p.id === activePanels[activeSession?.id || '']),
    [sessionPanels, activePanels, activeSession?.id]
  );
  
  // Check if session has Claude panels
  const hasClaudePanels = useMemo(
    () => sessionPanels.some(panel => panel.type === 'claude'),
    [sessionPanels]
  );
  
  // Track current session/panel in history when they change
  useEffect(() => {
    if (activeSession?.id && currentActivePanel?.id) {
      addToHistory(activeSession.id, currentActivePanel.id);
    }
  }, [activeSession?.id, currentActivePanel?.id, addToHistory]);

  // Keyboard shortcuts for navigating history
  useHotkey({
    id: 'navigate-back',
    label: 'Navigate Back in Session History',
    keys: 'mod+alt+ArrowLeft',
    category: 'navigation',
    action: () => {
      const previousEntry = navigateBack();
      if (previousEntry) {
        setActiveSession(previousEntry.sessionId);
        setTimeout(() => {
          setActivePanelInStore(previousEntry.sessionId, previousEntry.panelId);
          panelApi.setActivePanel(previousEntry.sessionId, previousEntry.panelId);
        }, 50);
      }
    },
  });

  useHotkey({
    id: 'navigate-forward',
    label: 'Navigate Forward in Session History',
    keys: 'mod+alt+ArrowRight',
    category: 'navigation',
    action: () => {
      const nextEntry = navigateForward();
      if (nextEntry) {
        setActiveSession(nextEntry.sessionId);
        setTimeout(() => {
          setActivePanelInStore(nextEntry.sessionId, nextEntry.panelId);
          panelApi.setActivePanel(nextEntry.sessionId, nextEntry.panelId);
        }, 50);
      }
    },
  });
  
  // Debug logging - only in development with verbose enabled
  renderLog('[SessionView] Session panels:', sessionPanels);
  renderLog('[SessionView] Active panel ID:', activePanels[activeSession?.id || '']);
  renderLog('[SessionView] Current active panel:', currentActivePanel);
  renderLog('[SessionView] Has Claude panels:', hasClaudePanels);

  // FIX: Memoize all callbacks to prevent re-renders
  const handlePanelSelect = useCallback(
    async (panel: ToolPanel) => {
      if (!activeSession) return;

      // Add to history when panel is selected
      addToHistory(activeSession.id, panel.id);

      setActivePanelInStore(activeSession.id, panel.id);
      await panelApi.setActivePanel(activeSession.id, panel.id);

      // Clear unviewed content flag when panel is viewed (for AI panels)
      if (panel.type === 'claude' || panel.type === 'codex') {
        const customState = panel.state?.customState as { hasUnviewedContent?: boolean; panelStatus?: string } | undefined;
        if (customState?.hasUnviewedContent || customState?.panelStatus === 'completed_unviewed') {
          try {
            await panelApi.clearPanelUnviewedContent(panel.id);
          } catch (err) {
            console.error('[SessionView] Failed to clear unviewed content:', err);
          }
        }
      }
    },
    [activeSession, setActivePanelInStore, addToHistory]
  );

  const handlePanelClose = useCallback(
    async (panel: ToolPanel) => {
      if (!activeSession) return;
      
      // Find next panel to activate
      const panelIndex = sessionPanels.findIndex(p => p.id === panel.id);
      const nextPanel = sessionPanels[panelIndex + 1] || sessionPanels[panelIndex - 1];
      
      // Remove from store first for immediate UI update
      removePanel(activeSession.id, panel.id);
      
      // Set next active panel if available
      if (nextPanel) {
        setActivePanelInStore(activeSession.id, nextPanel.id);
        await panelApi.setActivePanel(activeSession.id, nextPanel.id);
      }
      
      // Delete on backend
      await panelApi.deletePanel(panel.id);
    },
    [activeSession, sessionPanels, removePanel, setActivePanelInStore]
  );

  const handlePanelCreate = useCallback(
    async (type: ToolPanelType, options?: PanelCreateOptions) => {
      if (!activeSession) return;

      // For Codex panels, include the last selected model and thinking level in initial state
      let initialState: { customState?: unknown } | undefined = undefined;
      if (type === 'codex') {
        const savedModel = localStorage.getItem('codex.lastSelectedModel');
        const savedThinkingLevel = localStorage.getItem('codex.lastSelectedThinkingLevel');

        initialState = {
          customState: {
            codexConfig: {
              model: savedModel || 'auto',
              modelProvider: 'openai',
              thinkingLevel: savedThinkingLevel || 'medium',
              sandboxMode: 'workspace-write',
              webSearch: false
            }
          }
        };
      }

      // For terminal panels with initialCommand (e.g., Terminal (Claude))
      if (type === 'terminal' && options?.initialCommand) {
        initialState = {
          customState: {
            initialCommand: options.initialCommand
          }
        };
      }

      const newPanel = await panelApi.createPanel({
        sessionId: activeSession.id,
        type,
        title: options?.title,
        initialState
      });

      // Immediately add the panel and set it as active
      // The panel:created event will also fire, but addPanel checks for duplicates
      addPanel(newPanel);
      setActivePanelInStore(activeSession.id, newPanel.id);
    },
    [activeSession, addPanel, setActivePanelInStore]
  );

  // Load project data for active session
  useEffect(() => {
    const loadSessionProject = async () => {
      if (activeSession?.projectId) {
        try {
          const response = await API.projects.getAll();
          if (response.success && response.data) {
            const project = response.data.find((p: Project) => p.id === activeSession.projectId);
            if (project) {
              setSessionProject(project);
            }
          }
        } catch (error) {
          console.error('Failed to load session project:', error);
        }
      } else {
        setSessionProject(null);
      }
    };
    loadSessionProject();
  }, [activeSession?.projectId]);

  // Load project data when activeProjectId changes
  useEffect(() => {
    if (activeView === 'project' && activeProjectId) {
      const loadProjectData = async () => {
        setIsProjectLoading(true);
        try {
          // Get all projects and find the one we need
          const response = await API.projects.getAll();
          if (response.success && response.data) {
            const project = response.data.find((p: Project) => p.id === activeProjectId);
            if (project) {
              setProjectData(project);
            }
          }
        } catch (error) {
          console.error('Failed to load project data:', error);
        } finally {
          setIsProjectLoading(false);
        }
      };
      loadProjectData();
    } else {
      setProjectData(null);
    }
  }, [activeView, activeProjectId]);

  const handleProjectGitPull = async () => {
    if (!activeProjectId || !projectData) return;
    setIsMergingProject(true);
    try {
      // Get or create main repo session for this project
      const sessionResponse = await API.sessions.getOrCreateMainRepoSession(activeProjectId);
      if (sessionResponse.success && sessionResponse.data) {
        const response = await API.sessions.gitPull(sessionResponse.data.id);
        if (!response.success) {
          console.error('Git pull failed:', response.error);
        }
      }
    } catch (error) {
      console.error('Failed to perform git pull:', error);
    } finally {
      setIsMergingProject(false);
    }
  };

  const handleProjectGitPush = async () => {
    if (!activeProjectId || !projectData) return;
    setIsMergingProject(true);
    try {
      // Get or create main repo session for this project
      const sessionResponse = await API.sessions.getOrCreateMainRepoSession(activeProjectId);
      if (sessionResponse.success && sessionResponse.data) {
        const response = await API.sessions.gitPush(sessionResponse.data.id);
        if (!response.success) {
          console.error('Git push failed:', response.error);
        }
      }
    } catch (error) {
      console.error('Failed to perform git push:', error);
    } finally {
      setIsMergingProject(false);
    }
  };

  const terminalRef = useRef<HTMLDivElement>(null);
  // scriptTerminalRef removed - terminals now handled by panels

  const hook = useSessionView(activeSession, terminalRef);

  // Detail panel state
  const [detailVisible, setDetailVisible] = useState(() => {
    const stored = localStorage.getItem('crystal-detail-panel-visible');
    return stored !== null ? stored === 'true' : true;
  });

  // Persist detail panel visibility
  useEffect(() => {
    localStorage.setItem('crystal-detail-panel-visible', String(detailVisible));
  }, [detailVisible]);

  // Right-side resizable
  const { width: detailWidth, startResize: startDetailResize } = useResizable({
    defaultWidth: 170,
    minWidth: 140,
    maxWidth: 350,
    storageKey: 'crystal-detail-panel-width',
    side: 'right'
  });
  
  // Bottom terminal panel (first terminal panel in session)
  const defaultTerminalPanel = useMemo(
    () => sessionPanels.find(p => p.type === 'terminal'),
    [sessionPanels]
  );

  // Auto-create terminal panel for existing sessions that don't have one
  // Unless the user has explicitly closed it previously
  const hasTriedCreatingTerminal = useRef(false);
  useEffect(() => {
    if (!activeSession?.id || defaultTerminalPanel || hasTriedCreatingTerminal.current) return;
    // Only attempt once per session to avoid loops
    hasTriedCreatingTerminal.current = true;

    // Check if user has previously closed terminal panel for this session
    window.electronAPI?.invoke('panels:shouldAutoCreate', activeSession.id, 'terminal').then(shouldCreate => {
      if (!shouldCreate) {
        console.log('[SessionView] Skipping terminal auto-create - user previously closed it');
        return;
      }
      panelApi.createPanel({
        sessionId: activeSession.id,
        type: 'terminal',
        title: 'Terminal',
      }).then(panel => {
        addPanel(panel);
      }).catch(err => {
        console.error('[SessionView] Failed to auto-create terminal panel:', err);
      });
    });
  }, [activeSession?.id, defaultTerminalPanel, addPanel]);

  // Reset the flag when session changes
  useEffect(() => {
    hasTriedCreatingTerminal.current = false;
  }, [activeSession?.id]);

  // Non-terminal panels for the tab bar (exclude the default terminal that's pinned to the bottom)
  const tabBarPanels = useMemo(
    () => defaultTerminalPanel
      ? sessionPanels.filter(p => p.id !== defaultTerminalPanel.id)
      : sessionPanels,
    [sessionPanels, defaultTerminalPanel]
  );

  const { height: terminalHeight, startResize: startTerminalResize } = useResizableHeight({
    defaultHeight: 200,
    minHeight: 100,
    maxHeight: 500,
    storageKey: 'crystal-bottom-terminal-height',
  });

  // Terminal collapse state with localStorage persistence
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(() => {
    const stored = localStorage.getItem('crystal-terminal-collapsed');
    return stored === 'true';
  });

  const toggleTerminalCollapse = useCallback(() => {
    setIsTerminalCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('crystal-terminal-collapsed', String(newValue));
      return newValue;
    });
  }, []);

  // Create branch actions for the panel bar
  const branchActions = useMemo(() => {
    if (!activeSession) return [];
    
    return activeSession.isMainRepo ? [
      {
        id: 'pull',
        label: 'Pull from Remote',
        icon: Download,
        onClick: hook.handleGitPull,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing',
        variant: 'default' as const,
        description: hook.gitCommands?.getPullCommand ? `git ${hook.gitCommands.getPullCommand()}` : 'git pull'
      },
      {
        id: 'push',
        label: 'Push to Remote', 
        icon: Upload,
        onClick: hook.handleGitPush,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing',
        variant: 'success' as const,
        description: hook.gitCommands?.getPushCommand ? `git ${hook.gitCommands.getPushCommand()}` : 'git push'
      }
    ] : [
      // Commit action
      {
        id: 'commit',
        label: 'Commit',
        icon: GitCommitHorizontal,
        onClick: () => {
          hook.setDialogType('commit');
          hook.setShowCommitMessageDialog(true);
        },
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing' || !activeSession.gitStatus?.hasUncommittedChanges,
        variant: 'default' as const,
        description: activeSession.gitStatus?.hasUncommittedChanges ? 'Stage all changes and commit' : 'No uncommitted changes'
      },
      // Push action
      {
        id: 'push',
        label: 'Push',
        icon: Upload,
        onClick: hook.handleGitPush,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing' || !activeSession.gitStatus?.ahead,
        variant: 'default' as const,
        description: activeSession.gitStatus?.ahead ? `Push ${activeSession.gitStatus.ahead} commit(s) to remote` : 'No commits to push'
      },
      // Pull action
      {
        id: 'pull',
        label: 'Pull',
        icon: Download,
        onClick: hook.handleGitPull,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing',
        variant: 'default' as const,
        description: 'Pull latest changes from remote'
      },
      // Fetch action
      {
        id: 'fetch',
        label: 'Fetch',
        icon: RefreshCw,
        onClick: hook.handleGitFetch,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing',
        variant: 'default' as const,
        description: 'Fetch from remote without merging'
      },
      // Stash action
      {
        id: 'stash',
        label: 'Stash',
        icon: Archive,
        onClick: hook.handleGitStash,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing' || !activeSession.gitStatus?.hasUncommittedChanges,
        variant: 'default' as const,
        description: activeSession.gitStatus?.hasUncommittedChanges ? 'Stash uncommitted changes' : 'No changes to stash'
      },
      // Pop Stash action
      {
        id: 'stash-pop',
        label: 'Pop Stash',
        icon: ArchiveRestore,
        onClick: hook.handleGitStashPop,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing',
        variant: 'default' as const,
        description: 'Apply and remove most recent stash'
      },
      // Separator - Rebase/Merge operations
      {
        id: 'rebase-from-main',
        label: `Rebase from ${hook.gitCommands?.mainBranch || 'main'}`,
        icon: GitMerge,
        onClick: hook.handleRebaseMainIntoWorktree,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing' || !hook.hasChangesToRebase,
        variant: 'default' as const,
        description: hook.gitCommands?.getRebaseFromMainCommand ? hook.gitCommands.getRebaseFromMainCommand() : `Pulls latest changes from ${hook.gitCommands?.mainBranch || 'main'}`
      },
      {
        id: 'rebase-to-main',
        label: `Merge to ${hook.gitCommands?.mainBranch || 'main'}`,
        icon: GitMerge,
        onClick: hook.handleSquashAndRebaseToMain,
        disabled: hook.isMerging || activeSession.status === 'running' || activeSession.status === 'initializing' ||
                  (!activeSession.gitStatus?.totalCommits || activeSession.gitStatus?.totalCommits === 0 || activeSession.gitStatus?.ahead === 0),
        variant: 'success' as const,
        description: (!activeSession.gitStatus?.totalCommits || activeSession.gitStatus?.totalCommits === 0 || activeSession.gitStatus?.ahead === 0) ?
                     'No commits to merge' :
                     (hook.gitCommands?.getSquashAndRebaseToMainCommand ? hook.gitCommands.getSquashAndRebaseToMainCommand() : `Merges all commits to ${hook.gitCommands?.mainBranch || 'main'} (with safety checks)`)
      },
      {
        id: 'open-ide',
        label: hook.isOpeningIDE ? 'Opening...' : 'Open in IDE',
        icon: Code2,
        onClick: hook.handleOpenIDE,
        disabled: activeSession.status === 'initializing' || hook.isOpeningIDE || !sessionProject?.open_ide_command,
        variant: 'default' as const,
        description: sessionProject?.open_ide_command ? 'Open the worktree in your default IDE' : 'No IDE command configured'
      }
    ];
  }, [activeSession, hook.isMerging, hook.gitCommands, hook.hasChangesToRebase, hook.handleGitPull, hook.handleGitPush, hook.handleGitFetch, hook.handleGitStash, hook.handleGitStashPop, hook.setShowCommitMessageDialog, hook.setDialogType, hook.handleRebaseMainIntoWorktree, hook.handleSquashAndRebaseToMain, hook.handleOpenIDE, hook.isOpeningIDE, sessionProject?.open_ide_command, activeSession?.gitStatus]);
  
  // Removed unused variables - now handled by panels

  // Show project view if navigation is set to project
  if (activeView === 'project' && activeProjectId) {
    if (isProjectLoading || !projectData) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-secondary p-6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading project...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ProjectView
        projectId={activeProjectId}
        projectName={projectData.name || 'Project'}
        onGitPull={handleProjectGitPull}
        onGitPush={handleProjectGitPush}
        isMerging={isMergingProject}
      />
    );
  }

  if (!activeSession) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
        <EmptyState
          icon={Inbox}
          title="No Session Selected"
          description="Select a session from the sidebar to view its output, or create a new session to get started."
          className="flex-1"
        />
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      {/* SINGLE SessionProvider wraps everything */}
      <SessionProvider session={activeSession} gitBranchActions={branchActions} isMerging={hook.isMerging}>

        {/* Tab bar at top */}
        <PanelTabBar
          panels={tabBarPanels}
          activePanel={currentActivePanel}
          onPanelSelect={handlePanelSelect}
          onPanelClose={handlePanelClose}
          onPanelCreate={handlePanelCreate}
          onToggleDetailPanel={() => setDetailVisible(v => !v)}
          detailPanelVisible={detailVisible}
        />

        {/* Content area: center panels + right detail */}
        <div className="flex-1 flex flex-row min-h-0">
          {/* Center column: vertical split with panels on top, terminal on bottom */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top: active panel content */}
            <div className="flex-1 relative min-h-0 overflow-hidden">
              {sessionPanels.length > 0 && currentActivePanel ? (
                sessionPanels
                  .filter(p => !defaultTerminalPanel || p.id !== defaultTerminalPanel.id)
                  .map(panel => {
                    const isActive = panel.id === currentActivePanel.id;
                    const shouldKeepAlive = ['terminal', 'claude', 'codex'].includes(panel.type);
                    if (!isActive && !shouldKeepAlive) return null;
                    return (
                      <div
                        key={panel.id}
                        className="absolute inset-0"
                        style={{
                          display: isActive ? 'block' : 'none',
                          pointerEvents: isActive ? 'auto' : 'none'
                        }}
                      >
                        <PanelContainer
                          panel={panel}
                          isActive={isActive}
                          isMainRepo={!!activeSession.isMainRepo}
                        />
                      </div>
                    );
                  })
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary">
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">⚡</div>
                    <h2 className="text-xl font-semibold mb-2">No Active Panel</h2>
                    <p className="text-sm">Add a tool panel to get started</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom: persistent terminal (collapsible) */}
            {defaultTerminalPanel && (
              <div
                className="flex-shrink-0 border-t border-border-primary transition-all duration-200"
                style={{ height: isTerminalCollapsed ? '32px' : `${terminalHeight}px` }}
              >
                {/* Terminal tab header with collapse toggle */}
                <div className="flex items-center h-8 px-3 bg-surface-primary border-b border-border-primary gap-2">
                  <button
                    onClick={toggleTerminalCollapse}
                    className="p-0.5 hover:bg-surface-hover rounded transition-colors"
                    title={isTerminalCollapsed ? 'Expand terminal' : 'Collapse terminal'}
                  >
                    {isTerminalCollapsed ? (
                      <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </button>
                  <Terminal className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Terminal</span>
                  {/* Resize handle (only shown when not collapsed) */}
                  {!isTerminalCollapsed && (
                    <div
                      className="ml-auto h-full flex items-center cursor-row-resize group"
                      onMouseDown={startTerminalResize}
                    >
                      <GripHorizontal className="w-4 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
                {/* Terminal content (hidden when collapsed) */}
                {!isTerminalCollapsed && (
                  <div className="relative pb-1" style={{ height: `calc(100% - 36px)` }}>
                    <PanelContainer
                      panel={defaultTerminalPanel}
                      isActive={true}
                      isMainRepo={!!activeSession.isMainRepo}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <DetailPanel
            isVisible={detailVisible}
            onToggle={() => setDetailVisible(v => !v)}
            width={detailWidth}
            onResize={startDetailResize}
            mergeError={hook.mergeError}
          />
        </div>

      </SessionProvider>

      <CommitMessageDialog
        isOpen={hook.showCommitMessageDialog}
        onClose={() => hook.setShowCommitMessageDialog(false)}
        dialogType={hook.dialogType}
        gitCommands={hook.gitCommands}
        commitMessage={hook.commitMessage}
        setCommitMessage={hook.setCommitMessage}
        shouldSquash={hook.shouldSquash}
        setShouldSquash={hook.setShouldSquash}
        onConfirm={(message) => {
          if (hook.dialogType === 'commit') {
            hook.handleGitStageAndCommit(message);
            hook.setShowCommitMessageDialog(false);
          } else {
            hook.performSquashWithCommitMessage(message);
          }
        }}
        onMergeAndArchive={hook.performSquashWithCommitMessageAndArchive}
        isMerging={hook.isMerging}
        isMergingAndArchiving={hook.isMergingAndArchiving}
      />

      <GitErrorDialog
        isOpen={hook.showGitErrorDialog}
        onClose={() => hook.setShowGitErrorDialog(false)}
        errorDetails={hook.gitErrorDetails}
        getGitErrorTips={hook.getGitErrorTips}
        onAbortAndUseClaude={hook.handleAbortRebaseAndUseClaude}
      />

      <FolderArchiveDialog
        isOpen={hook.showFolderArchiveDialog}
        sessionCount={hook.folderSessionCount}
        onArchiveSessionOnly={hook.handleArchiveSessionOnly}
        onArchiveEntireFolder={hook.handleArchiveEntireFolder}
        onCancel={hook.handleCancelFolderArchive}
      />

    </div>
  );
});

SessionView.displayName = 'SessionView';
