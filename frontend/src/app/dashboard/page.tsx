'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Zap, Upload, User, LogOut, FolderPlus, Search, Plus, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProjectCard } from '@/components/projects/ProjectCard';
import { projectsService, Project } from '@/lib/projects';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await projectsService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
      toast.error(errorMessage);
      console.error('Error loading projects:', error);

      // If authentication error, don't keep trying
      if (errorMessage.includes('Authentication expired')) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);





  const handleDeleteProject = async (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      try {
        await projectsService.deleteProject(project.id);
        toast.success('Project deleted successfully');
        loadProjects();
      } catch (error) {
        toast.error('Failed to delete project');
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleUploadDocuments = (project: Project) => {
    router.push('/upload');
  };

  const handleViewSteps = (project: Project) => {
    if (project.county_name && project.smart_guidance_flow) {
      // Navigate to steps page with project data
      const params = new URLSearchParams({
        jurisdiction_name: project.county_name,
        original_steps: 'Project Steps', // You might want to store original steps in the project
        smart_guidance_flow: project.smart_guidance_flow
      });
      router.push(`/steps?${params.toString()}`);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.customer_name && project.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart Form Guide
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {user?.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={user.full_name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.full_name}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
                Welcome back, {user?.full_name?.split(' ')[0]}!
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl">
                Manage your projects and document analysis workflows with AI-powered permit assistance.
              </p>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>{projects.length} {projects.length === 1 ? 'Project' : 'Projects'}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button
                onClick={() => router.push('/upload')}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Documents
              </Button>
            </div>
          </div>



          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search projects by name, customer, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-sm"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">
              <span className="font-medium">
                {filteredProjects.length} of {projects.length} projects
              </span>
            </div>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="animate-pulse"
              >
                <Card className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-300 rounded-lg w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-300 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 rounded w-2/3"></div>
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <div className="h-8 bg-gray-300 rounded-lg w-20"></div>
                        <div className="h-8 bg-gray-300 rounded-lg w-16"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={`project-${project.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <ProjectCard
                  project={project}
                  onDelete={handleDeleteProject}
                  onUpload={handleUploadDocuments}
                  onView={handleViewSteps}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-20"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderPlus className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'No projects found' : 'Ready to get started?'}
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {searchTerm
                  ? 'Try adjusting your search terms or create a new project by uploading documents.'
                  : 'Upload your planset and utility bill documents to create your first project and unlock AI-powered permit assistance.'
                }
              </p>
              {!searchTerm && (
                <div className="space-y-4">
                  <Button
                    onClick={() => router.push('/upload')}
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Your First Documents
                  </Button>
                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mt-6">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>PDF & Images</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>AI Analysis</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}


      </main>
      </div>
    </ProtectedRoute>
  );
}
