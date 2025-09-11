'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Calendar, 
  User, 
  FolderOpen,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { projectsService, Project, Document } from '@/lib/projects';
import { formatDistanceToNow } from 'date-fns';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const projectId = params.id as string;

  const loadProject = async () => {
    try {
      const projectData = await projectsService.getProject(projectId);
      setProject(projectData);
    } catch (error) {
      toast.error('Failed to load project');
      console.error('Error loading project:', error);
      router.push('/dashboard');
    }
  };

  const loadDocuments = async () => {
    try {
      const documentsData = await projectsService.getProjectDocuments(projectId);
      setDocuments(documentsData);
    } catch (error) {
      toast.error('Failed to load documents');
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadProject(), loadDocuments()]);
      setLoading(false);
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length !== 2) {
      toast.error('Please select exactly 2 files (planset and utility bill)');
      return;
    }

    setUploading(true);
    try {
      await projectsService.uploadDocuments(projectId, files[0], files[1]);
      toast.success('Documents uploaded successfully!');
      await loadDocuments();
      await loadProject(); // Refresh project to update document count
    } catch (error) {
      toast.error('Failed to upload documents');
      console.error('Error uploading documents:', error);
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              {project.county_name && (
                <p className="text-sm text-gray-600">County: {project.county_name}</p>
              )}
            </div>
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FolderOpen className="w-5 h-5 mr-2" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.county_name && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">County</h4>
                      <p className="text-gray-600 text-sm">{project.county_name}</p>
                    </div>
                  )}

                  {project.smart_guidance_flow && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Smart Guidance Steps</h4>
                      <div className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md">
                        <pre className="whitespace-pre-wrap">{project.smart_guidance_flow}</pre>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Created</h4>
                      <p className="text-gray-600">{formatDate(project.created_at)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Updated</h4>
                      <p className="text-gray-600">{formatDate(project.updated_at)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Documents</h4>
                      <p className="text-gray-600">{project.document_count}</p>
                    </div>
                    {project.last_analysis_date && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Last Analysis</h4>
                        <p className="text-gray-600">{formatDate(project.last_analysis_date)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Documents and Upload */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Upload Section */}
              <Card className="bg-white/80 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Documents
                  </CardTitle>
                  <CardDescription>
                    Upload planset and utility bill PDFs for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">
                            Click to select 2 PDF files (planset and utility bill)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Documents List */}
              <Card className="bg-white/80 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Documents ({documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>{formatDate(doc.uploaded_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm">Upload your first documents to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      </div>
    </ProtectedRoute>
  );
}
