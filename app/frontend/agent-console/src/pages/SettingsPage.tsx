import { useState, useEffect } from 'react'
import { 
  Settings, 
  Users, 
  Mail, 
  Palette, 
  Zap, 
  Key, 
  Plus,
  Trash2,
  Edit
} from 'lucide-react'
import { apiClient, Project } from '../lib/api'

// Tab types for settings navigation
type SettingsTab = 'projects' | 'roles' | 'email' | 'branding' | 'automations' | 'api-keys'

interface Agent {
  id: string
  name: string
  email: string
  created_at: string
  is_active: boolean
  roles?: Array<{
    role: string
    project_id?: string
    project_name?: string
  }>
}

interface ApiKey {
  id: string
  name: string
  key_preview: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('projects')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKey, setNewProjectKey] = useState('')

  // Agents state
  const [agents, setAgents] = useState<Agent[]>([])
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')
  const [newAgentPassword, setNewAgentPassword] = useState('')
  const [newAgentRole, setNewAgentRole] = useState('agent')

  const tabs = [
    { id: 'projects' as SettingsTab, name: 'Projects', icon: Settings },
    { id: 'roles' as SettingsTab, name: 'Roles & Users', icon: Users },
    { id: 'email' as SettingsTab, name: 'Email', icon: Mail },
    { id: 'branding' as SettingsTab, name: 'Branding', icon: Palette },
    { id: 'automations' as SettingsTab, name: 'Automations', icon: Zap },
    { id: 'api-keys' as SettingsTab, name: 'API Keys', icon: Key },
  ]

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      switch (activeTab) {
        case 'projects':
          const projectList = await apiClient.getProjects()
          setProjects(projectList)
          break
        case 'roles':
          // Load agents with their roles
          // Note: We'll need to implement the agents API endpoint
          // const agentList = await apiClient.getAgents()
          // setAgents(agentList)
          setAgents([]) // Placeholder for now
          break
        case 'api-keys':
          // Load API keys
          // const keysList = await apiClient.getApiKeys()
          // setApiKeys(keysList)
          // Placeholder for now
          break
      }
    } catch (err) {
      setError('Failed to load data')
      console.error('Settings load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectKey.trim()) return

    try {
      setLoading(true)
      const project = await apiClient.createProject({
        name: newProjectName,
        key: newProjectKey.toUpperCase()
      })
      setProjects(prev => [project, ...prev])
      setNewProjectName('')
      setNewProjectKey('')
      setShowCreateProject(false)
    } catch (err) {
      setError('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentEmail.trim() || !newAgentPassword.trim()) return

    try {
      setLoading(true)
      // Note: We'll need to implement the create agent API
      // const agent = await apiClient.createAgent({
      //   name: newAgentName,
      //   email: newAgentEmail,
      //   password: newAgentPassword,
      //   role: newAgentRole
      // })
      // setAgents(prev => [agent, ...prev])
      setNewAgentName('')
      setNewAgentEmail('')
      setNewAgentPassword('')
      setNewAgentRole('agent')
      setShowCreateAgent(false)
    } catch (err) {
      setError('Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  const renderProjectsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Projects</h3>
          <p className="text-sm text-muted-foreground">Manage your projects and their settings</p>
        </div>
        <button
          onClick={() => setShowCreateProject(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {showCreateProject && (
        <div className="border rounded-lg p-4 bg-card">
          <h4 className="font-medium mb-4">Create New Project</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="Customer Support"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project Key</label>
              <input
                type="text"
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="SUPPORT"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCreateProject}
              disabled={loading || !newProjectName.trim() || !newProjectKey.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
            <button
              onClick={() => {
                setShowCreateProject(false)
                setNewProjectName('')
                setNewProjectKey('')
              }}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-foreground">{project.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {project.key}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  Recently created
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button className="text-primary hover:text-primary/80 mr-3">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderRolesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Roles & Users</h3>
          <p className="text-sm text-muted-foreground">Manage team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateAgent(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {showCreateAgent && (
        <div className="border rounded-lg p-4 bg-card">
          <h4 className="font-medium mb-4">Add New User</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={newAgentEmail}
                onChange={(e) => setNewAgentEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="john@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={newAgentPassword}
                onChange={(e) => setNewAgentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={newAgentRole}
                onChange={(e) => setNewAgentRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCreateAgent}
              disabled={loading || !newAgentName.trim() || !newAgentEmail.trim() || !newAgentPassword.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Add User'}
            </button>
            <button
              onClick={() => {
                setShowCreateAgent(false)
                setNewAgentName('')
                setNewAgentEmail('')
                setNewAgentPassword('')
                setNewAgentRole('agent')
              }}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No users found. Add your first team member to get started.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-foreground">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">{agent.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {agent.roles?.map(role => role.role).join(', ') || 'No roles'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button className="text-primary hover:text-primary/80 mr-3">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPlaceholderTab = (title: string, description: string) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="border rounded-lg p-8 text-center">
        <div className="text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h4 className="text-lg font-medium mb-2">Coming Soon</h4>
          <p className="text-sm">This feature is under development and will be available in a future update.</p>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return renderProjectsTab()
      case 'roles':
        return renderRolesTab()
      case 'email':
        return renderPlaceholderTab('Email Settings', 'Configure email integration and notification preferences')
      case 'branding':
        return renderPlaceholderTab('Branding', 'Customize your organization\'s branding and appearance')
      case 'automations':
        return renderPlaceholderTab('Automations', 'Set up automated workflows and rules')
      case 'api-keys':
        return renderPlaceholderTab('API Keys', 'Manage API keys for external integrations')
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 px-6 md:px-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your account and system preferences</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="flex space-x-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  )
}
