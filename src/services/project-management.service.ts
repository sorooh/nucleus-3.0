/**
 * 📋 Professional Project Management Service - Enterprise Project Orchestration
 * 
 * Advanced project management with task tracking, resource allocation,
 * timeline management, and collaboration features
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/monitoring/logger';
import { SecurityManager } from '../core/security/security-manager';

// Project Management Interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  team: string[];
  startDate: number;
  endDate: number;
  budget?: number;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  reporter: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: number;
  dueDate?: number;
  completedDate?: number;
  dependencies: string[];
  subtasks: string[];
  tags: string[];
  attachments: string[];
  comments: TaskComment[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  timestamp: number;
  edited?: number;
}

export interface Resource {
  id: string;
  name: string;
  type: 'human' | 'equipment' | 'budget' | 'software';
  capacity: number;
  allocated: number;
  cost?: number;
  availability: ResourceAvailability[];
  skills?: string[];
  metadata: Record<string, any>;
}

export interface ResourceAvailability {
  startDate: number;
  endDate: number;
  capacity: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: number;
  status: 'pending' | 'achieved' | 'missed' | 'cancelled';
  criteria: string[];
  progress: number;
  createdAt: number;
}

export interface ProjectReport {
  projectId: string;
  reportDate: number;
  summary: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    blockedTasks: number;
    progress: number;
  };
  timeline: {
    onSchedule: boolean;
    daysRemaining: number;
    estimatedCompletion: number;
  };
  resources: {
    totalAllocated: number;
    overAllocated: string[];
    underutilized: string[];
  };
  risks: ProjectRisk[];
  recommendations: string[];
}

export interface ProjectRisk {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: string;
  mitigation: string;
  status: 'identified' | 'mitigated' | 'accepted' | 'closed';
}

/**
 * Professional Project Management Service
 */
export class ProjectManagementService extends EventEmitter {
  private logger: Logger;
  private security: SecurityManager;
  
  // Data Storage
  private projects: Map<string, Project>;
  private tasks: Map<string, Task>;
  private resources: Map<string, Resource>;
  private milestones: Map<string, Milestone>;
  private reports: Map<string, ProjectReport[]>;
  
  // Configuration
  private config: {
    autoAssignTasks: boolean;
    enableTimeTracking: boolean;
    enableBudgetTracking: boolean;
    defaultTaskPriority: 'low' | 'medium' | 'high' | 'critical';
    maxTasksPerUser: number;
    reportGenerationInterval: number;
  };

  constructor() {
    super();
    this.logger = new Logger('ProjectManagementService');
    this.security = new SecurityManager();
    
    this.projects = new Map();
    this.tasks = new Map();
    this.resources = new Map();
    this.milestones = new Map();
    this.reports = new Map();
    
    this.config = {
      autoAssignTasks: false,
      enableTimeTracking: true,
      enableBudgetTracking: true,
      defaultTaskPriority: 'medium',
      maxTasksPerUser: 10,
      reportGenerationInterval: 86400000 // 24 hours
    };
    
    this.startAutomatedReporting();
    
    this.logger.info('Project Management Service initialized');
  }

  /**
   * Create a new project
   */
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const project: Project = {
      ...projectData,
      id: this.generateId('proj'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Validate project data
    this.validateProject(project);
    
    // Store project
    this.projects.set(project.id, project);
    
    // Initialize project reports
    this.reports.set(project.id, []);
    
    this.logger.info('Project created', { projectId: project.id, name: project.name });
    this.emit('project:created', project);
    
    return project;
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const updatedProject: Project = {
      ...project,
      ...updates,
      id: projectId, // Prevent ID changes
      updatedAt: Date.now()
    };
    
    this.validateProject(updatedProject);
    this.projects.set(projectId, updatedProject);
    
    this.logger.info('Project updated', { projectId, updates: Object.keys(updates) });
    this.emit('project:updated', updatedProject);
    
    return updatedProject;
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: this.generateId('task'),
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Validate task data
    this.validateTask(task);
    
    // Auto-assign if enabled
    if (this.config.autoAssignTasks && !task.assignee) {
      task.assignee = await this.autoAssignTask(task);
    }
    
    // Store task
    this.tasks.set(task.id, task);
    
    this.logger.info('Task created', { taskId: task.id, projectId: task.projectId, name: task.name });
    this.emit('task:created', task);
    
    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const oldStatus = task.status;
    const updatedTask: Task = {
      ...task,
      ...updates,
      id: taskId, // Prevent ID changes
      updatedAt: Date.now()
    };
    
    // Handle status changes
    if (updates.status && updates.status !== oldStatus) {
      await this.handleTaskStatusChange(updatedTask, oldStatus);
    }
    
    this.validateTask(updatedTask);
    this.tasks.set(taskId, updatedTask);
    
    this.logger.info('Task updated', { taskId, updates: Object.keys(updates) });
    this.emit('task:updated', updatedTask);
    
    return updatedTask;
  }

  /**
   * Add comment to task
   */
  async addTaskComment(taskId: string, author: string, content: string): Promise<TaskComment> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const comment: TaskComment = {
      id: this.generateId('comment'),
      taskId,
      author,
      content,
      timestamp: Date.now()
    };
    
    task.comments.push(comment);
    task.updatedAt = Date.now();
    
    this.logger.info('Comment added to task', { taskId, commentId: comment.id, author });
    this.emit('task:comment:added', { task, comment });
    
    return comment;
  }

  /**
   * Create a milestone
   */
  async createMilestone(milestoneData: Omit<Milestone, 'id' | 'createdAt'>): Promise<Milestone> {
    const milestone: Milestone = {
      ...milestoneData,
      id: this.generateId('milestone'),
      createdAt: Date.now()
    };
    
    this.milestones.set(milestone.id, milestone);
    
    this.logger.info('Milestone created', { milestoneId: milestone.id, projectId: milestone.projectId });
    this.emit('milestone:created', milestone);
    
    return milestone;
  }

  /**
   * Update milestone progress
   */
  async updateMilestoneProgress(milestoneId: string, progress: number): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }
    
    milestone.progress = Math.max(0, Math.min(100, progress));
    
    if (milestone.progress >= 100 && milestone.status === 'pending') {
      milestone.status = 'achieved';
    }
    
    this.logger.info('Milestone progress updated', { milestoneId, progress });
    this.emit('milestone:progress', milestone);
    
    return milestone;
  }

  /**
   * Allocate resource to project
   */
  async allocateResource(resourceId: string, projectId: string, allocation: number): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }
    
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (resource.allocated + allocation > resource.capacity) {
      throw new Error(`Resource ${resourceId} would be over-allocated`);
    }
    
    resource.allocated += allocation;
    
    this.logger.info('Resource allocated', { resourceId, projectId, allocation });
    this.emit('resource:allocated', { resource, projectId, allocation });
  }

  /**
   * Generate project report
   */
  async generateProjectReport(projectId: string): Promise<ProjectReport> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const projectTasks = Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    const projectMilestones = Array.from(this.milestones.values()).filter(m => m.projectId === projectId);
    
    // Calculate task summary
    const summary = {
      totalTasks: projectTasks.length,
      completedTasks: projectTasks.filter(t => t.status === 'done').length,
      overdueTasks: projectTasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length,
      blockedTasks: projectTasks.filter(t => t.status === 'blocked').length,
      progress: projectTasks.length > 0 ? (projectTasks.filter(t => t.status === 'done').length / projectTasks.length) * 100 : 0
    };
    
    // Calculate timeline
    const timeline = {
      onSchedule: project.endDate > Date.now(),
      daysRemaining: Math.ceil((project.endDate - Date.now()) / (24 * 60 * 60 * 1000)),
      estimatedCompletion: this.estimateProjectCompletion(projectTasks, project)
    };
    
    // Resource analysis
    const resources = {
      totalAllocated: 0,
      overAllocated: [] as string[],
      underutilized: [] as string[]
    };
    
    this.resources.forEach(resource => {
      resources.totalAllocated += resource.allocated;
      if (resource.allocated > resource.capacity) {
        resources.overAllocated.push(resource.id);
      } else if (resource.allocated < resource.capacity * 0.5) {
        resources.underutilized.push(resource.id);
      }
    });
    
    // Risk assessment
    const risks = this.assessProjectRisks(project, projectTasks, projectMilestones);
    
    // Recommendations
    const recommendations = this.generateRecommendations(project, projectTasks, summary, timeline);
    
    const report: ProjectReport = {
      projectId,
      reportDate: Date.now(),
      summary,
      timeline,
      resources,
      risks,
      recommendations
    };
    
    // Store report
    const projectReports = this.reports.get(projectId) || [];
    projectReports.push(report);
    this.reports.set(projectId, projectReports);
    
    this.logger.info('Project report generated', { projectId, progress: summary.progress });
    this.emit('report:generated', report);
    
    return report;
  }

  /**
   * Get project dashboard data
   */
  async getProjectDashboard(projectId: string): Promise<Record<string, any>> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const tasks = Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
    const milestones = Array.from(this.milestones.values()).filter(m => m.projectId === projectId);
    const reports = this.reports.get(projectId) || [];
    
    const dashboard = {
      project,
      summary: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        activeMilestones: milestones.filter(m => m.status === 'pending').length,
        recentActivity: this.getRecentActivity(projectId)
      },
      timeline: {
        startDate: project.startDate,
        endDate: project.endDate,
        progress: tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0,
        milestones: milestones.sort((a, b) => a.dueDate - b.dueDate)
      },
      team: {
        members: project.team.length,
        workload: this.calculateTeamWorkload(project.team, projectId)
      },
      latestReport: reports.length > 0 ? reports[reports.length - 1] : null
    };
    
    return dashboard;
  }

  /**
   * Get user workload
   */
  async getUserWorkload(userId: string): Promise<Record<string, any>> {
    const userTasks = Array.from(this.tasks.values()).filter(task => task.assignee === userId);
    const activeProjects = new Set(userTasks.map(task => task.projectId));
    
    const workload = {
      totalTasks: userTasks.length,
      tasksByStatus: {
        todo: userTasks.filter(t => t.status === 'todo').length,
        'in-progress': userTasks.filter(t => t.status === 'in-progress').length,
        review: userTasks.filter(t => t.status === 'review').length,
        blocked: userTasks.filter(t => t.status === 'blocked').length
      },
      overdueTasks: userTasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length,
      estimatedHours: userTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
      actualHours: userTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
      activeProjects: activeProjects.size,
      upcomingDeadlines: userTasks
        .filter(t => t.dueDate && t.dueDate > Date.now() && t.status !== 'done')
        .sort((a, b) => a.dueDate! - b.dueDate!)
        .slice(0, 5)
    };
    
    return workload;
  }

  /**
   * Private helper methods
   */
  
  private validateProject(project: Project): void {
    if (!project.name || project.name.trim().length === 0) {
      throw new Error('Project name is required');
    }
    
    if (project.startDate >= project.endDate) {
      throw new Error('Project end date must be after start date');
    }
    
    if (!project.owner) {
      throw new Error('Project owner is required');
    }
  }

  private validateTask(task: Task): void {
    if (!task.name || task.name.trim().length === 0) {
      throw new Error('Task name is required');
    }
    
    if (!task.projectId) {
      throw new Error('Task must belong to a project');
    }
    
    if (!this.projects.has(task.projectId)) {
      throw new Error(`Project ${task.projectId} not found`);
    }
    
    if (!task.reporter) {
      throw new Error('Task reporter is required');
    }
  }

  private async autoAssignTask(task: Task): Promise<string | undefined> {
    const project = this.projects.get(task.projectId);
    if (!project) return undefined;
    
    // Simple round-robin assignment to team members
    const teamMember = project.team[Math.floor(Math.random() * project.team.length)];
    
    // Check workload
    const userTasks = Array.from(this.tasks.values()).filter(t => t.assignee === teamMember);
    if (userTasks.length >= this.config.maxTasksPerUser) {
      return undefined;
    }
    
    return teamMember;
  }

  private async handleTaskStatusChange(task: Task, oldStatus: string): Promise<void> {
    if (task.status === 'done' && oldStatus !== 'done') {
      task.completedDate = Date.now();
      this.emit('task:completed', task);
    }
    
    if (task.status === 'blocked') {
      this.emit('task:blocked', task);
    }
    
    if (task.status === 'in-progress' && oldStatus === 'todo') {
      this.emit('task:started', task);
    }
  }

  private estimateProjectCompletion(tasks: Task[], project: Project): number {
    if (tasks.length === 0) return project.endDate;
    
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    const progress = completedTasks / totalTasks;
    
    if (progress === 0) return project.endDate;
    
    const elapsed = Date.now() - project.startDate;
    const estimatedTotal = elapsed / progress;
    
    return project.startDate + estimatedTotal;
  }

  private assessProjectRisks(project: Project, tasks: Task[], milestones: Milestone[]): ProjectRisk[] {
    const risks: ProjectRisk[] = [];
    
    // Timeline risk
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done');
    if (overdueTasks.length > tasks.length * 0.2) {
      risks.push({
        id: this.generateId('risk'),
        description: 'High number of overdue tasks indicates timeline risk',
        severity: 'high',
        probability: 0.8,
        impact: 'Project may miss deadline',
        mitigation: 'Reassign resources and prioritize critical tasks',
        status: 'identified'
      });
    }
    
    // Resource risk
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      risks.push({
        id: this.generateId('risk'),
        description: 'Blocked tasks may impact project delivery',
        severity: 'medium',
        probability: 0.6,
        impact: 'Delays in task completion',
        mitigation: 'Resolve blockers and provide alternative approaches',
        status: 'identified'
      });
    }
    
    return risks;
  }

  private generateRecommendations(
    project: Project, 
    tasks: Task[], 
    summary: any, 
    timeline: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (summary.progress < 50 && timeline.daysRemaining < 30) {
      recommendations.push('Consider adding more resources or reducing scope');
    }
    
    if (summary.blockedTasks > 0) {
      recommendations.push('Focus on resolving blocked tasks to maintain momentum');
    }
    
    if (summary.overdueTasks > summary.totalTasks * 0.1) {
      recommendations.push('Review task priorities and deadlines');
    }
    
    return recommendations;
  }

  private getRecentActivity(projectId: string): any[] {
    // Return recent task updates, comments, etc.
    const projectTasks = Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
    
    return projectTasks.map(task => ({
      type: 'task_update',
      taskId: task.id,
      taskName: task.name,
      status: task.status,
      timestamp: task.updatedAt
    }));
  }

  private calculateTeamWorkload(teamMembers: string[], projectId: string): Record<string, any> {
    const workload: Record<string, any> = {};
    
    teamMembers.forEach(member => {
      const memberTasks = Array.from(this.tasks.values())
        .filter(task => task.assignee === member && task.projectId === projectId);
      
      workload[member] = {
        totalTasks: memberTasks.length,
        activeTasks: memberTasks.filter(t => ['todo', 'in-progress'].includes(t.status)).length,
        completedTasks: memberTasks.filter(t => t.status === 'done').length
      };
    });
    
    return workload;
  }

  private startAutomatedReporting(): void {
    setInterval(() => {
      this.generateAutomatedReports();
    }, this.config.reportGenerationInterval);
  }

  private async generateAutomatedReports(): Promise<void> {
    for (const [projectId, project] of this.projects) {
      if (project.status === 'active') {
        try {
          await this.generateProjectReport(projectId);
        } catch (error) {
          this.logger.error('Automated report generation failed', { 
            projectId, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API Methods
   */
  
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getProjectTasks(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  getUserTasks(userId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.assignee === userId);
  }

  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  updateConfiguration(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Project management configuration updated', { config: this.config });
  }
}

// Singleton global project management service
export const globalProjectManager = new ProjectManagementService();

// Export types
export type {
  Project,
  Task,
  TaskComment,
  Resource,
  Milestone,
  ProjectReport,
  ProjectRisk
};