import { Sun, Moon, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useConfigStore } from '../stores/configStore';
import { useSessionStore } from '../stores/sessionStore';

export function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { config, updateConfig } = useConfigStore();
  const { sessions, setActiveSession } = useSessionStore();

  const uiScale = config?.uiScale ?? 1.0;

  // Filter for active sessions (running or waiting)
  const activeSessions = sessions.filter(
    s => s.status === 'running' || s.status === 'waiting'
  );

  const handleScaleChange = async (delta: number) => {
    const newScale = Math.round((uiScale + delta) * 10) / 10; // Avoid floating point issues
    if (newScale >= 0.8 && newScale <= 1.5) {
      await updateConfig({ uiScale: newScale });
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-primary">
      <div className="w-full max-w-md space-y-8">

        {/* Quick Preferences */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <span className="text-text-primary">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-tertiary hover:bg-surface-hover"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </div>

          {/* UI Scale */}
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <span className="text-text-primary">UI Scale</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScaleChange(-0.1)}
                disabled={uiScale <= 0.8}
                className="p-1 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-secondary w-10 text-center">{uiScale.toFixed(1)}x</span>
              <button
                onClick={() => handleScaleChange(0.1)}
                disabled={uiScale >= 1.5}
                className="p-1 rounded-md bg-surface-tertiary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Active Sessions</h2>
            <div className="space-y-2">
              {activeSessions.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-hover text-left"
                >
                  <span className="text-text-primary truncate">{session.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    session.status === 'waiting'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {session.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fallback message */}
        <p className="text-center text-sm text-text-tertiary">
          Select a session from the sidebar or create a new one to get started.
        </p>
      </div>
    </div>
  );
}
