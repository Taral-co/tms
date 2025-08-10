import React, { useState, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient, Project } from '../lib/api'

interface ProjectSelectorProps {
  currentProjectId?: string
  onProjectChange: (projectId: string) => void
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  currentProjectId,
  onProjectChange,
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (currentProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === currentProjectId)
      setCurrentProject(project || null)
    }
  }, [currentProjectId, projects])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const projectList = await apiClient.getProjects()
      setProjects(projectList)
      
      // If no current project is set and we have projects, set the first one as default
      if (!currentProjectId && projectList.length > 0) {
        const firstProject = projectList[0]
        setCurrentProject(firstProject)
        localStorage.setItem('project_id', firstProject.id)
        apiClient.setProjectId(firstProject.id)
        onProjectChange(firstProject.id)
      } else if (currentProjectId) {
        // If we have a current project ID, make sure it's still valid
        const project = projectList.find(p => p.id === currentProjectId)
        if (project) {
          setCurrentProject(project)
        } else {
          // Current project no longer exists, select the first available
          if (projectList.length > 0) {
            const firstProject = projectList[0]
            setCurrentProject(firstProject)
            localStorage.setItem('project_id', firstProject.id)
            apiClient.setProjectId(firstProject.id)
            onProjectChange(firstProject.id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project)
    localStorage.setItem('project_id', project.id)
    apiClient.setProjectId(project.id)
    onProjectChange(project.id)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading projects...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <div className="flex-1 text-left">
          {currentProject ? (
            <div>
              <div className="font-medium">{currentProject.name}</div>
              {/* <div className="text-xs text-muted-foreground">{currentProject.key}</div> */}
            </div>
          ) : (
            <span className="text-muted-foreground">Select project</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-md z-50">
          <div className="p-1">
            <div className="max-h-60 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium">{project.name}</div>
                    {/* <div className="text-xs text-muted-foreground">{project.key}</div> */}
                  </div>
                  {currentProject?.id === project.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
            
            {projects.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No projects available
              </div>
            )}
            
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/settings')
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create new project</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
