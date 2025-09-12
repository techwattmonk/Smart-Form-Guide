'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  User,
  MoreVertical,
  Trash2,
  Upload,
  Eye,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Folder
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/lib/projects';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onDelete: (project: Project) => void;
  onUpload: (project: Project) => void;
  onView: (project: Project) => void;
}



export function ProjectCard({ project, onDelete, onUpload, onView }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusInfo = () => {
    if (project.county_name && project.smart_guidance_flow) {
      return {
        icon: CheckCircle,
        text: 'Ready to View',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }
    return {
      icon: Clock,
      text: 'Needs Documents',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="h-full"
    >
      <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl border border-gray-200 bg-white backdrop-blur-sm overflow-hidden group hover:border-gray-300">

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Folder className="w-4 h-4 text-white" />
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color} border border-gray-200`}>
                  <StatusIcon className="w-3 h-3 inline mr-1" />
                  {statusInfo.text}
                </div>
              </div>

              <CardTitle className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {project.name}
              </CardTitle>

              {project.county_name && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1 text-blue-500" />
                  <span className="truncate font-medium">{project.county_name} County</span>
                </div>
              )}
            </div>

            <div className="flex items-center ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onDelete(project)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          <div className="space-y-4">
            {/* Project Info */}
            <div className="space-y-3">
              {project.description && (
                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Created {formatDate(project.created_at)}</span>
                </div>
                {project.last_analysis_date && (
                  <div className="flex items-center space-x-1">
                    <FileText className="w-3 h-3" />
                    <span>Updated {formatDate(project.last_analysis_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {project.county_name && project.smart_guidance_flow ? (
                <Button
                  onClick={() => onView(project)}
                  className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Permit Steps
                </Button>
              ) : (
                <Button
                  onClick={() => onUpload(project)}
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
