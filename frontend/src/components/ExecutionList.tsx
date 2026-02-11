import React, { useState, memo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ExecutionListProps } from '../types/diff';

const ExecutionList: React.FC<ExecutionListProps> = memo(({
  executions,
  selectedExecutions,
  onSelectionChange,
  onCommit,
  onRevert,
  onRestore,
  historyLimitReached = false,
  historyLimit
}) => {
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const limitDisplay = historyLimit ?? 50;

  const handleCommitClick = (executionId: number, event: React.MouseEvent) => {
    if (event.shiftKey && rangeStart !== null) {
      // Range selection with shift-click
      const start = Math.min(rangeStart, executionId);
      const end = Math.max(rangeStart, executionId);
      onSelectionChange([start, end]);
    } else {
      // Single selection
      setRangeStart(executionId);
      onSelectionChange([executionId]);
    }
  };

  const handleSelectAll = () => {
    if (executions.length > 0) {
      // Select from first to last commit (excluding uncommitted if present)
      const firstId = executions[executions.length - 1].id;
      const lastId = executions.find(e => e.id !== 0)?.id || firstId;
      onSelectionChange([firstId, lastId]);
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const isInRange = (executionId: number): boolean => {
    if (selectedExecutions.length === 0) return false;
    if (selectedExecutions.length === 1) return selectedExecutions[0] === executionId;
    if (selectedExecutions.length === 2) {
      const [start, end] = selectedExecutions;
      return executionId >= Math.min(start, end) && executionId <= Math.max(start, end);
    }
    return false;
  };

  if (executions.length === 0) {
    return (
      <div className="p-4 text-text-tertiary text-center">
        No commits found for this session
      </div>
    );
  }

  return (
    <div className="execution-list h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border-secondary bg-bg-secondary flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
          Commits <span className="text-text-muted">{executions.filter(e => e.id !== 0).length}</span>
        </span>
        <button
          onClick={handleSelectAll}
          className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
        >
          Select all
        </button>
      </div>

      {/* Execution list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {executions.map((execution) => {
          const isSelected = isInRange(execution.id);
          const isUncommitted = execution.id === 0;

          return (
            <div
              key={execution.id}
              className={`
                flex items-center px-3 py-1.5 border-b border-border-secondary cursor-pointer hover:bg-bg-hover transition-colors gap-2
                ${isSelected ? 'bg-bg-accent border-l-2 border-l-interactive' : 'border-l-2 border-l-transparent'}
                ${isUncommitted ? 'bg-status-warning/10' : ''}
              `}
              onClick={(e) => handleCommitClick(execution.id, e)}
            >
              <div className="w-2 flex-shrink-0">
                {isSelected && (
                  <div className="w-1.5 h-1.5 bg-interactive rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs truncate ${isUncommitted ? 'text-status-warning font-medium' : 'text-text-primary'}`}
                    title={isUncommitted ? 'Uncommitted changes' : (execution.commit_message || execution.prompt_text || `Commit ${execution.execution_sequence}`)}
                  >
                    {isUncommitted
                      ? 'Uncommitted changes'
                      : truncateMessage(execution.commit_message || execution.prompt_text || `Commit ${execution.execution_sequence}`)}
                  </span>
                  {execution.after_commit_hash && execution.after_commit_hash !== 'UNCOMMITTED' && (
                    <span className="text-[10px] text-text-muted font-mono flex-shrink-0">
                      {execution.after_commit_hash.substring(0, 7)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    {execution.stats_files_changed > 0 ? (
                      <>
                        <span className="text-status-success font-semibold">+{execution.stats_additions}</span>
                        <span className="text-status-error font-semibold">-{execution.stats_deletions}</span>
                        <span className="text-text-muted">{execution.stats_files_changed} files</span>
                      </>
                    ) : (
                      <span className="text-text-muted">No changes</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isUncommitted && onCommit && execution.stats_files_changed > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCommit(); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-status-success/20 text-status-success hover:bg-status-success/30 transition-colors font-medium"
                      >
                        Commit
                      </button>
                    )}
                    {isUncommitted && onRestore && execution.stats_files_changed > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRestore(); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-status-warning/20 text-status-warning hover:bg-status-warning/30 transition-colors font-medium"
                        title="Restore all uncommitted changes"
                      >
                        Restore
                      </button>
                    )}
                    {onRevert && !isUncommitted && execution.after_commit_hash && execution.after_commit_hash !== 'UNCOMMITTED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRevert(execution.after_commit_hash!); }}
                        className="text-[10px] px-1.5 py-0.5 rounded text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Revert this commit"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {historyLimitReached && (
          <div className="px-3 py-1.5 text-[10px] text-text-muted">
            Showing last {limitDisplay} commits
          </div>
        )}
      </div>
    </div>
  );
});

ExecutionList.displayName = 'ExecutionList';

export default ExecutionList;
