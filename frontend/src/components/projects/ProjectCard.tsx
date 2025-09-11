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
  Eye
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-gray-900 truncate">
                {project.name}
              </CardTitle>
              {project.county_name && (
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate">{project.county_name} County</span>
                </div>
              )}
            </div>
            <div className="flex items-center ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">

                  <DropdownMenuItem
                    onClick={() => onDelete(project)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">


            {/* Last Analysis */}
            {project.last_analysis_date && (
              <div className="text-xs text-gray-500">
                Last analysis: {formatDate(project.last_analysis_date)}
              </div>
            )}

            {/* Action Button */}
            {project.county_name && project.smart_guidance_flow ? (
              <Button
                onClick={() => onView(project)}
                className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white border-0"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Steps
              </Button>
            ) : (
              <Button
                onClick={() => onUpload(project)}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white border-0"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
