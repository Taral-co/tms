import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Settings, 
  Users, 
  Mail, 
  Palette, 
  Zap, 
  Key, 
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Save
} from 'lucide-react'
import { apiClient, Project, Agent, EmailSettings, BrandingSettings, AutomationSettings } from '../lib/api'

// Tab types for settings navigation
type SettingsTab = 'projects' | 'roles' | 'email' | 'branding' | 'automations' | 'api-keys'

interface ApiKey {
  id: string
  name: string
  key_preview: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<SettingsTab>((searchParams.get('tab') as SettingsTab) || 'projects')
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
  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    from_email: '',
    from_name: '',
    enable_email_notifications: true,
    enable_email_to_ticket: false
  })

  // Branding state
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    company_name: '',
    logo_url: '',
    support_url: '',
    primary_color: '#3b82f6',
    accent_color: '#10b981',
    secondary_color: '#64748b',
    custom_css: '',
    favicon_url: '',
    header_logo_height: 40,
    enable_custom_branding: false
  })

  // Automation settings state
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    enable_auto_assignment: false,
    assignment_strategy: 'round_robin',
    max_tickets_per_agent: 10,
    enable_escalation: false,
    escalation_threshold_hours: 24,
    enable_auto_reply: false,
    auto_reply_template: 'Thank you for contacting our support team. We have received your ticket and will respond within 24 hours.'
  })

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showCreateApiKey, setShowCreateApiKey] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [showApiKeyValue, setShowApiKeyValue] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Edit modal states
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null)

  const tabs = [
    { id: 'projects' as SettingsTab, name: 'Projects', icon: Settings },
    { id: 'roles' as SettingsTab, name: 'Roles & Users', icon: Users },
    { id: 'email' as SettingsTab, name: 'Email', icon: Mail },
    { id: 'branding' as SettingsTab, name: 'Branding', icon: Palette },
    { id: 'automations' as SettingsTab, name: 'Automations', icon: Zap },
    { id: 'api-keys' as SettingsTab, name: 'API Keys', icon: Key },
  ]

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

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
          const agentList = await apiClient.getAgents()
          setAgents(agentList)
          break
        case 'email':
          try {
            const emailConfig = await apiClient.getEmailSettings()
            setEmailSettings(emailConfig)
          } catch (err) {
            console.log('Email settings not available, using defaults')
          }
          break
        case 'branding':
          try {
            const brandingConfig = await apiClient.getBrandingSettings()
            setBrandingSettings(brandingConfig)
          } catch (err) {
            console.log('Branding settings not available, using defaults')
          }
          break
        case 'automations':
          try {
            const automationConfig = await apiClient.getAutomationSettings()
            setAutomationSettings(automationConfig)
          } catch (err) {
            console.log('Automation settings not available, using defaults')
          }
          break
        case 'api-keys':
          try {
            const keysList = await apiClient.getApiKeys()
            setApiKeys(keysList)
          } catch (err) {
            console.log('API keys endpoint error:', err)
            setApiKeys([])
          }
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
      const agent = await apiClient.createAgent({
        name: newAgentName,
        email: newAgentEmail,
        password: newAgentPassword,
        role: newAgentRole
      })
      setAgents(prev => [agent, ...prev])
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

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) return

    try {
      setLoading(true)
      const response = await apiClient.createApiKey({
        name: newApiKeyName
      })
      // Backend returns the API key data directly with the key field
      const { key, ...apiKeyData } = response
      setApiKeys(prev => [apiKeyData, ...prev])
      setShowApiKeyValue(key)
      setNewApiKeyName('')
      setShowCreateApiKey(false)
    } catch (err) {
      console.error('Create API key error:', err)
      setError('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyApiKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKeyId(keyId)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (err) {
      console.error('Failed to copy API key:', err)
    }
  }

  // Project handlers
  const handleEditProject = async (projectId: string, updates: { key: string; name: string; status: string }) => {
    try {
      setLoading(true)
      const updatedProject = await apiClient.updateProject(projectId, updates)
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p))
    } catch (err) {
      setError('Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return
    
    try {
      setLoading(true)
      await apiClient.deleteProject(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (err) {
      setError('Failed to delete project')
    } finally {
      setLoading(false)
    }
  }

  // Agent handlers  
  const handleEditAgent = async (agentId: string, updates: Partial<Agent>) => {
    try {
      setLoading(true)
      const updatedAgent = await apiClient.updateAgent(agentId, updates)
      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a))
    } catch (err) {
      setError('Failed to update agent')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return
    
    try {
      setLoading(true)
      await apiClient.deleteAgent(agentId)
      setAgents(prev => prev.filter(a => a.id !== agentId))
    } catch (err) {
      setError('Failed to delete agent')
    } finally {
      setLoading(false)
    }
  }

  // API Key handlers
  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
    
    try {
      setLoading(true)
      await apiClient.deleteApiKey(keyId)
      setApiKeys(prev => prev.filter(k => k.id !== keyId))
    } catch (err) {
      setError('Failed to delete API key')
    } finally {
      setLoading(false)
    }
  }

  const handleEditApiKey = async (keyId: string, updates: Partial<ApiKey>) => {
    try {
      setLoading(true)
      const updatedKey = await apiClient.updateApiKey(keyId, updates)
      setApiKeys(prev => prev.map(k => k.id === keyId ? updatedKey : k))
    } catch (err) {
      setError('Failed to update API key')
    } finally {
      setLoading(false)
    }
  }

  // Email settings handlers
  const handleSaveEmailSettings = async () => {
    try {
      setLoading(true)
      await apiClient.updateEmailSettings(emailSettings)
      // Show success message
    } catch (err) {
      setError('Failed to save email settings')
    } finally {
      setLoading(false)
    }
  }

  // Branding settings handlers
  const handleSaveBrandingSettings = async () => {
    try {
      setLoading(true)
      await apiClient.updateBrandingSettings(brandingSettings)
      // Show success message
    } catch (err) {
      setError('Failed to save branding settings')
    } finally {
      setLoading(false)
    }
  }

  // Automation settings handlers
  const handleSaveAutomationSettings = async () => {
    try {
      setLoading(true)
      await apiClient.updateAutomationSettings(automationSettings)
      // Show success message
    } catch (err) {
      setError('Failed to save automation settings')
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
                  <button 
                    onClick={() => setEditingProject(project)}
                    className="text-primary hover:text-primary/80 mr-3"
                    title="Edit Project"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-destructive hover:text-destructive/80"
                    title="Delete Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Key</label>
                <input
                  type="text"
                  value={editingProject.key}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, key: e.target.value.toUpperCase() } : null)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="project-active"
                  checked={editingProject.status === 'active'}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, status: e.target.checked ? 'active' : 'inactive' } : null)}
                  className="rounded"
                />
                <label htmlFor="project-active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={async () => {
                  if (editingProject) {
                    try {
                      setLoading(true)
                      const updatedProject = await apiClient.updateProject(editingProject.id, {
                        name: editingProject.name,
                        key: editingProject.key,
                        status: editingProject.status || 'active'
                      })
                      setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p))
                      setEditingProject(null)
                    } catch (err) {
                      setError('Failed to update project')
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
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
                    <button 
                      onClick={() => setEditingAgent(agent)}
                      className="text-primary hover:text-primary/80 mr-3"
                      title="Edit Agent"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-destructive hover:text-destructive/80"
                      title="Delete Agent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Agent</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingAgent.email}
                  onChange={(e) => setEditingAgent(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="agent-active"
                  checked={editingAgent.is_active}
                  onChange={(e) => setEditingAgent(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                  className="rounded"
                />
                <label htmlFor="agent-active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={async () => {
                  if (editingAgent) {
                    try {
                      setLoading(true)
                      const updatedAgent = await apiClient.updateAgent(editingAgent.id, {
                        name: editingAgent.name,
                        email: editingAgent.email,
                        is_active: editingAgent.is_active
                      })
                      setAgents(prev => prev.map(a => a.id === editingAgent.id ? updatedAgent : a))
                      setEditingAgent(null)
                    } catch (err) {
                      setError('Failed to update agent')
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingAgent(null)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit API Key Modal */}
      {editingApiKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingApiKey.name}
                  onChange={(e) => setEditingApiKey({ ...editingApiKey, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingApiKey.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditingApiKey({ ...editingApiKey, is_active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const updatedKey = await apiClient.updateApiKey(editingApiKey.id, {
                      name: editingApiKey.name,
                      is_active: editingApiKey.is_active
                    })
                    setApiKeys(prev => prev.map(k => k.id === editingApiKey.id ? updatedKey : k))
                    setEditingApiKey(null)
                  } catch (err) {
                    setError('Failed to update API key')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingApiKey(null)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderEmailTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Email Settings</h3>
        <p className="text-sm text-muted-foreground">Configure email integration and notification preferences</p>
      </div>

      <div className="space-y-6">
        {/* SMTP Configuration */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">SMTP Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Host</label>
              <input
                type="text"
                value={emailSettings.smtp_host}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Port</label>
              <input
                type="number"
                value={emailSettings.smtp_port}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={emailSettings.smtp_username}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_username: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="your-email@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={emailSettings.smtp_password}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Encryption</label>
              <select
                value={emailSettings.smtp_encryption}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_encryption: e.target.value as 'tls' | 'ssl' | 'none' }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email Branding */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Email Branding</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Email</label>
              <input
                type="email"
                value={emailSettings.from_email}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, from_email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="support@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Name</label>
              <input
                type="text"
                value={emailSettings.from_name}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="Company Support"
              />
            </div>
          </div>
        </div>

        {/* Email Features */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Email Features</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Email Notifications</label>
                <p className="text-xs text-muted-foreground">Send email notifications for ticket updates</p>
              </div>
              <input
                type="checkbox"
                checked={emailSettings.enable_email_notifications}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, enable_email_notifications: e.target.checked }))}
                className="rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Email to Ticket</label>
                <p className="text-xs text-muted-foreground">Convert incoming emails to tickets</p>
              </div>
              <input
                type="checkbox"
                checked={emailSettings.enable_email_to_ticket}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, enable_email_to_ticket: e.target.checked }))}
                className="rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={handleSaveEmailSettings}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Email Settings'}
          </button>
          <button className="px-4 py-2 border rounded-md hover:bg-accent">
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );

  const renderBrandingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Branding</h3>
        <p className="text-sm text-muted-foreground">Customize your organization's branding and appearance</p>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Company Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={brandingSettings.company_name}
                onChange={(e) => setBrandingSettings(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support URL</label>
              <input
                type="url"
                value={brandingSettings.support_url}
                onChange={(e) => setBrandingSettings(prev => ({ ...prev, support_url: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="https://support.company.com"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Logo</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo URL</label>
              <input
                type="url"
                value={brandingSettings.logo_url}
                onChange={(e) => setBrandingSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="https://example.com/logo.png"
              />
            </div>
            {brandingSettings.logo_url && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Logo Preview:</p>
                <img 
                  src={brandingSettings.logo_url} 
                  alt="Logo preview"
                  className="max-h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Color Scheme */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Color Scheme</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={brandingSettings.primary_color}
                  onChange={(e) => setBrandingSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-12 h-10 border rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.primary_color}
                  onChange={(e) => setBrandingSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Accent Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={brandingSettings.accent_color}
                  onChange={(e) => setBrandingSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                  className="w-12 h-10 border rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.accent_color}
                  onChange={(e) => setBrandingSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                  placeholder="#10B981"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={handleSaveBrandingSettings}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Branding Settings'}
          </button>
          <button className="px-4 py-2 border rounded-md hover:bg-accent">
            Preview Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderAutomationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Automations</h3>
        <p className="text-sm text-muted-foreground">Set up automated workflows and rules</p>
      </div>

      <div className="space-y-6">
        {/* Auto-Assignment Rules */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Auto-Assignment Rules</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Auto-Assignment</label>
                <p className="text-xs text-muted-foreground">Automatically assign tickets to available agents</p>
              </div>
              <input
                type="checkbox"
                checked={automationSettings.enable_auto_assignment}
                onChange={(e) => setAutomationSettings(prev => ({ ...prev, enable_auto_assignment: e.target.checked }))}
                className="rounded"
              />
            </div>
            
            {automationSettings.enable_auto_assignment && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div>
                  <label className="block text-sm font-medium mb-1">Assignment Strategy</label>
                  <select
                    value={automationSettings.assignment_strategy}
                    onChange={(e) => setAutomationSettings(prev => ({ ...prev, assignment_strategy: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                  >
                    <option value="round_robin">Round Robin</option>
                    <option value="least_busy">Least Busy</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Tickets per Agent</label>
                  <input
                    type="number"
                    value={automationSettings.max_tickets_per_agent}
                    onChange={(e) => setAutomationSettings(prev => ({ ...prev, max_tickets_per_agent: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                    placeholder="10"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Escalation Rules */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Escalation Rules</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Auto-Escalation</label>
                <p className="text-xs text-muted-foreground">Escalate tickets based on priority and time</p>
              </div>
              <input
                type="checkbox"
                checked={automationSettings.enable_escalation}
                onChange={(e) => setAutomationSettings(prev => ({ ...prev, enable_escalation: e.target.checked }))}
                className="rounded"
              />
            </div>
            
            {automationSettings.enable_escalation && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div>
                  <label className="block text-sm font-medium mb-1">Escalation Threshold (hours)</label>
                  <input
                    type="number"
                    value={automationSettings.escalation_threshold_hours}
                    onChange={(e) => setAutomationSettings(prev => ({ ...prev, escalation_threshold_hours: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)]"
                    placeholder="24"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Response Templates */}
        <div className="border rounded-lg p-6 bg-card">
          <h4 className="font-medium mb-4">Automated Responses</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto-Reply to New Tickets</label>
                <p className="text-xs text-muted-foreground">Send automatic acknowledgment emails</p>
              </div>
              <input
                type="checkbox"
                checked={automationSettings.enable_auto_reply}
                onChange={(e) => setAutomationSettings(prev => ({ ...prev, enable_auto_reply: e.target.checked }))}
                className="rounded"
              />
            </div>
            
            {automationSettings.enable_auto_reply && (
              <div className="pl-4 border-l-2 border-muted">
                <label className="block text-sm font-medium mb-1">Auto-Reply Template</label>
                <textarea
                  value={automationSettings.auto_reply_template}
                  onChange={(e) => setAutomationSettings(prev => ({ ...prev, auto_reply_template: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                  rows={4}
                  placeholder="Thank you for contacting our support team. We have received your ticket and will respond within 24 hours."
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={handleSaveAutomationSettings}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Automation Settings'}
          </button>
          <button className="px-4 py-2 border rounded-md hover:bg-accent">
            Test Rules
          </button>
        </div>
      </div>
    </div>
  );

  const renderApiKeysTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">API Keys</h3>
          <p className="text-sm text-muted-foreground">Manage API keys for external integrations</p>
        </div>
        <button
          onClick={() => setShowCreateApiKey(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Create API Key</span>
        </button>
      </div>

      {showCreateApiKey && (
        <div className="border rounded-lg p-4 bg-card">
          <h4 className="font-medium mb-4">Create API Key</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Key Name</label>
              <input
                type="text"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                placeholder="Integration API Key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Choose a descriptive name to help identify this key later
              </p>
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCreateApiKey}
              disabled={loading || !newApiKeyName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Key'}
            </button>
            <button
              onClick={() => {
                setShowCreateApiKey(false)
                setNewApiKeyName('')
              }}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showApiKeyValue && (
        <div className="border rounded-lg p-4 bg-card border-primary">
          <h4 className="font-medium mb-2 text-primary">Your New API Key</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Please copy this key and store it securely. You won't be able to see it again.
          </p>
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
            <code className="flex-1 text-sm font-mono">{showApiKeyValue}</code>
            <button
              onClick={() => handleCopyApiKey(showApiKeyValue, 'new')}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              {copiedKeyId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setShowApiKeyValue(null)}
            className="mt-3 text-sm text-primary hover:text-primary/80"
          >
            I've copied the key
          </button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Key Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No API keys found. Create your first API key to get started.
                </td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-foreground">{apiKey.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono text-muted-foreground">{apiKey.key_preview}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {apiKey.last_used ? new Date(apiKey.last_used).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      apiKey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {apiKey.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button 
                      onClick={() => setEditingApiKey(apiKey)}
                      className="text-primary hover:text-primary/80 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return renderProjectsTab()
      case 'roles':
        return renderRolesTab()
      case 'email':
        return renderEmailTab()
      case 'branding':
        return renderBrandingTab()
      case 'automations':
        return renderAutomationsTab()
      case 'api-keys':
        return renderApiKeysTab()
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
                  onClick={() => handleTabChange(tab.id)}
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
