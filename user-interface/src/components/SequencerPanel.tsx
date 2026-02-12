import { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  Package, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Loader2,
  GitMerge,
  ArrowRight,
  Eye,
  ExternalLink,
  Workflow,
  GitCommit,
} from 'lucide-react';

export interface SequenceStage {
  id: string;
  level: number; // 0 = no dependencies, 1 = depends on level 0, etc.
  items: SequenceItem[];
}

export interface SequenceItem {
  id: string;
  type: 'pr' | 'release';
  packageName: string;
  repository: string;
  status: 'pending' | 'ready' | 'in-progress' | 'blocked' | 'completed';
  prNumber?: number;
  prUrl?: string;
  isDraft?: boolean;
  releaseVersion?: string;
  githubActionUrl?: string;
  commitUrl?: string;
  blockedBy?: string[]; // IDs of items this depends on
  dependents?: string[]; // IDs of items that depend on this
  description?: string;
}

interface RepositoryGroup {
  repository: string;
  packageName: string;
  items: SequenceItem[];
}

interface SequencerPanelProps {
  packages?: any[];
  links?: any[];
  repositories?: any[]; // Add repositories to filter by changes
}

export function SequencerPanel({ packages = [], links = [], repositories = [] }: SequencerPanelProps) {
  const [sequence, setSequence] = useState<SequenceStage[]>(generateSequence(packages, links, repositories));
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['stage-0', 'stage-1']));
  const [selectedItem, setSelectedItem] = useState<SequenceItem | null>(null);

  // Regenerate sequence when packages, links, or repositories change
  useEffect(() => {
    // Only use links that are actually activated (status: 'linked')
    const activeLinks = links.filter((link: any) => link.status === 'linked');
    setSequence(generateSequence(packages, activeLinks, repositories));
  }, [packages, links, repositories]);

  // Group items by repository
  const groupedSequence = sequence.map(stage => ({
    ...stage,
    repositories: groupItemsByRepository(stage.items)
  }));

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const handleCreatePR = (item: SequenceItem) => {
    // Simulate creating a PR - preserve all properties including isDraft
    setSequence(prev => prev.map(stage => ({
      ...stage,
      items: stage.items.map(i => 
        i.id === item.id 
          ? { ...item, prNumber: Math.floor(Math.random() * 1000) + 1 }
          : i
      )
    })));
  };

  const handleMarkReleased = (item: SequenceItem) => {
    // Mark item as completed and update dependents
    setSequence(prev => {
      const updated = prev.map(stage => ({
        ...stage,
        items: stage.items.map(i => {
          if (i.id === item.id) {
            return { ...i, status: 'completed' as const, releaseVersion: '1.0.0' };
          }
          // Check if this item was blocked by the completed item
          if (i.blockedBy?.includes(item.id)) {
            const stillBlocked = i.blockedBy.filter(bid => {
              // Check if this blocker is still not completed
              return prev.some(s => s.items.some(si => si.id === bid && si.status !== 'completed'));
            });
            
            if (stillBlocked.filter(bid => bid !== item.id).length === 0) {
              // No longer blocked - clear the blockedBy array
              // If it's already in-progress (e.g., draft PR), keep it in-progress
              if (i.status === 'in-progress') {
                return { ...i, blockedBy: [] }; // Clear blockedBy array
              }
              // Otherwise mark as ready
              return { ...i, status: 'ready' as const, blockedBy: [] };
            }
          }
          return i;
        })
      }));
      return updated;
    });
  };

  const totalItems = sequence.reduce((sum, stage) => sum + stage.items.length, 0);
  const completedItems = sequence.reduce(
    (sum, stage) => sum + stage.items.filter(i => i.status === 'completed').length,
    0
  );
  const inProgressItems = sequence.reduce(
    (sum, stage) => sum + stage.items.filter(i => i.status === 'in-progress').length,
    0
  );
  const blockedItems = sequence.reduce(
    (sum, stage) => sum + stage.items.filter(i => i.status === 'blocked').length,
    0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-2">Release Sequencer</h3>
            <p className="text-sm text-neutral-500">
              Automated dependency-aware release timeline
            </p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-500">Total Items</span>
            </div>
            <p className="text-xl">{totalItems}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-500">Completed</span>
            </div>
            <p className="text-xl">{completedItems}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-neutral-500">In Progress</span>
            </div>
            <p className="text-xl">{inProgressItems}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Pause className="w-4 h-4 text-red-400" />
              <span className="text-xs text-neutral-500">Blocked</span>
            </div>
            <p className="text-xl">{blockedItems}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {groupedSequence.map((stage, stageIdx) => {
            const isExpanded = expandedStages.has(stage.id);
            const stageCompleted = stage.items.every(i => i.status === 'completed');
            const stageInProgress = stage.items.some(i => i.status === 'in-progress');
            const stageBlocked = stage.items.every(i => i.status === 'blocked' || i.status === 'pending');

            return (
              <div key={stage.id} className="relative">
                {/* Stage Header */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center gap-3 mb-4 group"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  )}
                  
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    stageCompleted 
                      ? 'bg-green-500/20 border-green-500' 
                      : stageInProgress
                      ? 'bg-orange-500/20 border-orange-500'
                      : stageBlocked
                      ? 'bg-neutral-800 border-neutral-700'
                      : 'bg-blue-500/20 border-blue-500'
                  }`}>
                    {stageCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <span className="text-sm">{stage.level}</span>
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <h4 className="text-sm">Stage {stage.level}</h4>
                    <p className="text-xs text-neutral-500">
                      {Object.keys(stage.repositories).length} {Object.keys(stage.repositories).length === 1 ? 'repository' : 'repositories'}
                      {stage.level > 0 && ' • Depends on previous stage'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {stageCompleted && (
                      <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400">
                        Completed
                      </span>
                    )}
                    {stageInProgress && !stageCompleted && (
                      <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded text-xs text-orange-400">
                        In Progress
                      </span>
                    )}
                    {stageBlocked && (
                      <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-400">
                        Waiting
                      </span>
                    )}
                  </div>
                </button>

                {/* Stage Items */}
                {isExpanded && (
                  <div className="ml-12 space-y-4">
                    {stage.repositories.map((repo) => (
                      <RepositoryRow
                        key={repo.repository}
                        repo={repo}
                        onCreatePR={handleCreatePR}
                        onMarkReleased={handleMarkReleased}
                        selectedItem={selectedItem}
                        onSelectItem={setSelectedItem}
                      />
                    ))}
                  </div>
                )}

                {/* Connector to next stage */}
                {stageIdx < sequence.length - 1 && (
                  <div className="ml-7 mt-3 mb-3">
                    <div className="w-0.5 h-8 bg-neutral-800"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface RepositoryRowProps {
  repo: RepositoryGroup;
  onCreatePR: (item: SequenceItem) => void;
  onMarkReleased: (item: SequenceItem) => void;
  selectedItem: SequenceItem | null;
  onSelectItem: (item: SequenceItem | null) => void;
}

function RepositoryRow({ repo, onCreatePR, onMarkReleased, selectedItem, onSelectItem }: RepositoryRowProps) {
  const prItem = repo.items.find(i => i.type === 'pr');
  const releaseItems = repo.items.filter(i => i.type === 'release');

  if (!prItem) return null;

  return (
    <div className="group">
      {/* Repository Header */}
      <div className="mb-2">
        <h5 className="text-sm text-neutral-300">{repo.repository}</h5>
        <p className="text-xs text-neutral-500">{repo.packageName}</p>
      </div>

      {/* Horizontal Steps */}
      <div className="flex items-start gap-3">
        {/* PR Step */}
        <div className="flex-1">
          <StepItem
            item={prItem}
            icon={<GitPullRequest className="w-4 h-4" />}
            label="PR"
            isSelected={selectedItem?.id === prItem.id}
            onSelect={() => onSelectItem(prItem)}
            onAction={onCreatePR}
            onComplete={onMarkReleased}
          />
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-3" />

        {/* Release Steps (one per package) */}
        <div className="flex-1 space-y-2">
          {releaseItems.map((releaseItem) => (
            <StepItem
              key={releaseItem.id}
              item={releaseItem}
              icon={<Package className="w-4 h-4" />}
              label={releaseItem.packageName}
              isSelected={selectedItem?.id === releaseItem.id}
              onSelect={() => onSelectItem(releaseItem)}
              onAction={onCreatePR}
              onComplete={onMarkReleased}
            />
          ))}
        </div>
      </div>

      {/* Blocked indicator for the whole repo */}
      {prItem.status === 'blocked' && prItem.blockedBy && prItem.blockedBy.length > 0 && (
        <div className="mt-2 ml-0 p-2 bg-red-500/5 border border-red-500/20 rounded text-xs">
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {(() => {
              const packageDependencies = prItem.blockedBy.filter(id => id.startsWith('release-'));
              return (
                <span>Waiting for {packageDependencies.length} {packageDependencies.length === 1 ? 'dependency' : 'dependencies'}</span>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  item: SequenceItem;
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (item: SequenceItem) => void;
  onComplete: (item: SequenceItem) => void;
}

function StepItem({ item, icon, label, isSelected, onSelect, onAction, onComplete }: StepItemProps) {
  const [isHovering, setIsHovering] = useState(false);

  // Auto-start release after PR merge
  useEffect(() => {
    if (item.type === 'release' && item.status === 'blocked' && item.blockedBy?.length === 1) {
      // Check if PR is completed
      const prId = item.blockedBy[0];
      // In real implementation, check if PR is actually completed
      // For now, we'll just check if status changed
    }
  }, [item]);

  // Auto-start release 1 second after PR merge, then complete after 5 seconds
  useEffect(() => {
    if (item.type === 'release' && item.status === 'ready') {
      const startTimer = setTimeout(() => {
        onAction({
          ...item,
          status: 'in-progress',
          githubActionUrl: `https://github.com/${item.repository}/actions/runs/${Math.floor(Math.random() * 10000)}`,
        });
      }, 1000);

      return () => clearTimeout(startTimer);
    }
  }, [item.status, item.type]);

  useEffect(() => {
    if (item.type === 'release' && item.status === 'in-progress') {
      const completeTimer = setTimeout(() => {
        onComplete({
          ...item,
          status: 'completed',
          releaseVersion: '1.0.0',
          commitUrl: `https://github.com/${item.repository}/commit/${Math.random().toString(36).substring(2, 9)}`,
        });
      }, 5000);

      return () => clearTimeout(completeTimer);
    }
  }, [item.status, item.type]);

  const getStatusIcon = () => {
    if (item.type === 'pr' && item.status === 'in-progress') {
      // Code review phase
      return <Eye className="w-5 h-5 text-orange-400" />;
    }
    
    switch (item.status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'in-progress': return <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />;
      case 'blocked': return <Circle className="w-5 h-5 text-neutral-600" />;
      case 'ready': return <Circle className="w-5 h-5 text-blue-400" />;
      default: return <Circle className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'completed': return 'text-green-400';
      case 'in-progress': return 'text-orange-400';
      case 'blocked': return 'text-neutral-600';
      case 'ready': return 'text-blue-400';
      default: return 'text-neutral-600';
    }
  };

  const handleAction = (e: React.MouseEvent, isDraft = false) => {
    e.stopPropagation();
    if (item.status === 'ready' && item.type === 'pr') {
      // Create PR - set to in-progress
      onAction({ ...item, isDraft, status: 'in-progress' });
    } else if (item.status === 'blocked' && item.type === 'pr' && isDraft) {
      // Allow creating draft PR even when blocked
      onAction({ ...item, isDraft: true, status: 'in-progress' });
    } else if (item.status === 'in-progress' && item.type === 'pr') {
      onComplete(item);
    }
  };

  const handleReadyForReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Convert draft to ready for review (non-draft, in-progress)
    onAction({ ...item, isDraft: false, status: 'in-progress' });
  };

  // Check if all dependencies are met
  const allDependenciesMet = !item.blockedBy || item.blockedBy.length === 0;

  const canCreatePR = item.status === 'ready' && item.type === 'pr';
  const canCreateDraftPR = item.status === 'blocked' && item.type === 'pr';
  const canMergePR = item.status === 'in-progress' && item.type === 'pr' && !item.isDraft;
  const canMarkReadyForReview = item.status === 'in-progress' && item.type === 'pr' && item.isDraft;

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onSelect}
      className={`relative flex-1 flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isSelected ? 'bg-neutral-800 ring-1 ring-blue-500/50' : 'hover:bg-neutral-900'
      }`}
    >
      {/* Icon */}
      <div className={`${getStatusColor()}`}>
        {icon}
      </div>

      {/* Label and info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          {item.isDraft && (
            <span className="px-1.5 py-0.5 bg-neutral-700 text-neutral-400 rounded text-xs">
              Draft
            </span>
          )}
        </div>
        {item.prNumber && (
          <div className="text-xs text-neutral-500">#{item.prNumber}</div>
        )}
        {item.releaseVersion && (
          <div className="text-xs text-neutral-500">v{item.releaseVersion}</div>
        )}
      </div>

      {/* Status icon */}
      <div>
        {getStatusIcon()}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1">
        {canCreatePR && (
          <button
            onClick={(e) => handleAction(e, false)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
          >
            Create
          </button>
        )}
        
        {canCreateDraftPR && (
          <button
            onClick={(e) => handleAction(e, true)}
            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs transition-colors"
          >
            Draft
          </button>
        )}

        {canMarkReadyForReview && (
          <button
            onClick={(e) => handleReadyForReview(e)}
            disabled={!allDependenciesMet}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              allDependenciesMet
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            }`}
            title={!allDependenciesMet ? 'Waiting for dependencies to be completed' : 'Mark as ready for review'}
          >
            Ready for Review
          </button>
        )}

        {canMergePR && (
          <button
            onClick={(e) => handleAction(e, false)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
          >
            Merge
          </button>
        )}
      </div>

      {/* Hover tooltip */}
      {isHovering && item.status === 'in-progress' && item.type === 'release' && item.githubActionUrl && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg z-10 min-w-[280px]">
          <div className="flex items-center gap-2 text-xs">
            <Workflow className="w-3.5 h-3.5 text-purple-400" />
            <a
              href={item.githubActionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View GitHub Action
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {isHovering && item.status === 'completed' && item.commitUrl && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg z-10 min-w-[280px]">
          <div className="space-y-2">
            {item.releaseVersion && (
              <div className="text-xs text-neutral-400">
                Released: v{item.releaseVersion}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <GitCommit className="w-3.5 h-3.5 text-green-400" />
              <a
                href={item.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View Release Commit
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Group items by repository
function groupItemsByRepository(items: SequenceItem[]): RepositoryGroup[] {
  const grouped = new Map<string, SequenceItem[]>();
  
  items.forEach(item => {
    if (!grouped.has(item.repository)) {
      grouped.set(item.repository, []);
    }
    grouped.get(item.repository)!.push(item);
  });

  return Array.from(grouped.entries()).map(([repository, items]) => {
    const packageName = items[0]?.packageName || '';
    return { repository, packageName, items };
  });
}

// Generate sequence from package links
function generateSequence(packages: any[], links: any[], repositories: any[]): SequenceStage[] {
  // Helper function to check if a repo has changes
  const hasChanges = (repoName: string): boolean => {
    const repo = repositories.find((r: any) => `${r.owner}/${r.name}` === repoName || r.name === repoName);
    return repo && repo.status === 'modified';
  };

  const allPackages = new Set<string>();
  const dependsOnMap = new Map<string, Set<string>>(); // pkg -> what it depends on
  
  // If there are no links, all packages are independent at level 0
  if (links.length === 0) {
    const items: SequenceItem[] = [];
    
    // Group packages by repository
    const repoPackages = new Map<string, string[]>();
    packages.forEach((repo: any) => {
      repo.packages.forEach((pkg: any) => {
        if (!repoPackages.has(repo.name)) {
          repoPackages.set(repo.name, []);
        }
        repoPackages.get(repo.name)!.push(pkg.name);
      });
    });

    // Create items - one PR per repo, one release per package, all at level 0
    // ONLY include repositories with changes
    repoPackages.forEach((pkgNames, repoName) => {
      // Skip repositories without changes
      if (!hasChanges(repoName)) {
        return;
      }

      // Create one PR item for the entire repo
      items.push({
        id: `pr-${repoName}`,
        type: 'pr',
        packageName: pkgNames.join(', '),
        repository: repoName,
        status: 'ready',
        blockedBy: [],
        description: `Update ${repoName} with latest changes`,
      });

      // Create release items for each package in this repo
      pkgNames.forEach(pkgName => {
        items.push({
          id: `release-${pkgName}`,
          type: 'release',
          packageName: pkgName,
          repository: repoName,
          status: 'blocked',
          blockedBy: [`pr-${repoName}`], // Only blocked by its own PR
          description: `Release new version of ${pkgName}`,
        });
      });
    });

    // Return single stage at level 0 (or empty if no changes)
    if (items.length === 0) {
      return [];
    }

    return [{
      id: 'stage-0',
      level: 0,
      items,
    }];
  }

  // Build dependency graph from links - ONLY use actual workspace links
  links.forEach((link: any) => {
    allPackages.add(link.from);
    allPackages.add(link.to);
    
    // 'from' depends on 'to' - only if they're linked
    if (!dependsOnMap.has(link.from)) {
      dependsOnMap.set(link.from, new Set());
    }
    dependsOnMap.get(link.from)!.add(link.to);
  });

  // Helper to find which repo a package belongs to
  const findPackageRepo = (pkgName: string): string | null => {
    for (const repo of packages) {
      if (repo.packages.some((p: any) => p.name === pkgName)) {
        return repo.name;
      }
    }
    return null;
  };

  // Calculate levels (topological sort)
  // Level 0 = no dependencies, Level 1 = depends on level 0, etc.
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const calculateLevel = (pkg: string): number => {
    if (levels.has(pkg)) return levels.get(pkg)!;
    if (visiting.has(pkg)) return 0; // Circular dependency protection
    if (visited.has(pkg)) return levels.get(pkg) || 0;

    visiting.add(pkg);
    const deps = dependsOnMap.get(pkg) || new Set();
    
    // Filter dependencies to only those whose repos have changes
    const depsWithChanges = Array.from(deps).filter(dep => {
      const depRepo = findPackageRepo(dep);
      return depRepo && hasChanges(depRepo);
    });
    
    if (depsWithChanges.length === 0) {
      levels.set(pkg, 0);
      visited.add(pkg);
      visiting.delete(pkg);
      return 0;
    }

    // This package's level is 1 + max level of its dependencies (that have changes)
    const maxDepLevel = Math.max(...depsWithChanges.map(dep => calculateLevel(dep)));
    const level = maxDepLevel + 1;
    levels.set(pkg, level);
    visited.add(pkg);
    visiting.delete(pkg);
    return level;
  };

  allPackages.forEach(pkg => calculateLevel(pkg));

  // Group packages by repository - include ALL repos with packages (linked or not)
  const repoPackages = new Map<string, string[]>();
  packages.forEach((repo: any) => {
    repo.packages.forEach((pkg: any) => {
      // Include packages that are in the link graph OR if the repo has changes
      if (allPackages.has(pkg.name) || hasChanges(repo.name)) {
        if (!repoPackages.has(repo.name)) {
          repoPackages.set(repo.name, []);
        }
        repoPackages.get(repo.name)!.push(pkg.name);
      }
    });
  });

  // Create items - one PR per repo, one release per package
  const stageMap = new Map<number, SequenceItem[]>();
  
  // For each repository, create a PR at the max level of its packages
  repoPackages.forEach((pkgNames, repoName) => {
    // Skip repositories without changes
    if (!hasChanges(repoName)) {
      return;
    }

    // For repos with changes but not in the link graph, put them at level 0
    const linkedPkgNames = pkgNames.filter(pkg => allPackages.has(pkg));
    const repoLevel = linkedPkgNames.length > 0 
      ? Math.max(...linkedPkgNames.map(pkg => levels.get(pkg) || 0))
      : 0;
    
    if (!stageMap.has(repoLevel)) {
      stageMap.set(repoLevel, []);
    }

    // Get all dependencies for this repo's PR - ONLY from actual links
    const repoDeps = new Set<string>();
    pkgNames.forEach(pkg => {
      const deps = dependsOnMap.get(pkg) || new Set();
      deps.forEach(dep => {
        // Find which repo this dependency belongs to
        packages.forEach((otherRepo: any) => {
          if (otherRepo.packages.some((p: any) => p.name === dep)) {
            // Only add dependencies if there's an actual link AND the other repo has changes
            if (hasChanges(otherRepo.name)) {
              repoDeps.add(`pr-${otherRepo.name}`);
              repoDeps.add(`release-${dep}`);
            }
          }
        });
      });
    });

    // Create one PR item for the entire repo
    stageMap.get(repoLevel)!.push({
      id: `pr-${repoName}`,
      type: 'pr',
      packageName: pkgNames.join(', '),
      repository: repoName,
      status: repoLevel === 0 ? 'ready' : 'blocked',
      blockedBy: repoLevel === 0 ? [] : Array.from(repoDeps),
      description: `Update ${repoName} with latest changes`,
    });

    // Create release items for each package in this repo
    pkgNames.forEach(pkgName => {
      const pkgLevel = levels.get(pkgName) !== undefined ? levels.get(pkgName)! : repoLevel;
      
      if (!stageMap.has(pkgLevel)) {
        stageMap.set(pkgLevel, []);
      }

      // Release is blocked by its own repo's PR
      const releaseBlockedBy = [`pr-${repoName}`];

      stageMap.get(pkgLevel)!.push({
        id: `release-${pkgName}`,
        type: 'release',
        packageName: pkgName,
        repository: repoName,
        status: 'blocked',
        blockedBy: releaseBlockedBy,
        description: `Release new version of ${pkgName}`,
      });
    });
  });

  // Convert to stages array
  const stages: SequenceStage[] = [];
  const sortedLevels = Array.from(stageMap.keys()).sort((a, b) => a - b);

  sortedLevels.forEach(level => {
    stages.push({
      id: `stage-${level}`,
      level,
      items: stageMap.get(level) || [],
    });
  });

  return stages;
}