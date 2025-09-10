'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Zap, Loader2, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadResponse {
  message: string;
  extracted_keys: string;
}

export default function CombinedUploadPage() {
  const router = useRouter();
  const [plansetFile, setPlansetFile] = useState<File | null>(null);
  const [utilityFile, setUtilityFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handlePlansetFileChange = (selectedFile: File | null) => {
    setPlansetFile(selectedFile);
    setError(null);
  };

  const handleUtilityFileChange = (selectedFile: File | null) => {
    setUtilityFile(selectedFile);
    setError(null);
  };

  const removePlansetFile = () => {
    setPlansetFile(null);
  };

  const removeUtilityFile = () => {
    setUtilityFile(null);
  };

  const handleUpload = async () => {
    if (!plansetFile) {
      setError('Please select a planset PDF file');
      return;
    }
    if (!utilityFile) {
      setError('Please select a utility bill PDF file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf1', plansetFile);
      formData.append('pdf2', utilityFile);
      formData.append('keys', 'project_name');
      formData.append('keys', 'address');
      formData.append('keys', 'total_area');
      formData.append('keys', 'energy_consumption');
      formData.append('keys', 'billing_period');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload_pdfs/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: UploadResponse = await response.json();

      // Parse the extracted keys to get individual values
      let extractedData = {};
      try {
        extractedData = JSON.parse(result.extracted_keys);
      } catch (error) {
        // If parsing fails, create a basic object
        extractedData = {
          project_name: 'Unknown Project',
          address: 'Address not found',
          total_area: 'N/A'
        };
      }

      // Redirect to steps page with extracted data
      const params = new URLSearchParams();
      Object.entries(extractedData).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      router.push(`/steps?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };



  return (
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
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">
                Document Upload
              </h1>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Upload Documents
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload both planset and utility bill PDFs for comprehensive AI analysis
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                  {/* Planset Upload Section */}
                  <div className="space-y-2">
                    <Label htmlFor="planset" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Planset PDF File (Required - Upload First)</span>
                    </Label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-blue-50/50">
                      {!plansetFile ? (
                        <>
                          <Input
                            id="planset"
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handlePlansetFileChange(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <label htmlFor="planset" className="cursor-pointer">
                            <FileText className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                            <p className="text-lg text-gray-600 mb-2">
                              Click to upload planset PDF
                            </p>
                            <p className="text-sm text-gray-500">
                              Architectural plansets for AI analysis
                            </p>
                          </label>
                        </>
                      ) : (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">{plansetFile.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removePlansetFile}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Utility Bill Upload Section */}
                  <div className="space-y-2">
                    <Label htmlFor="utility" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span>Utility Bill PDF File (Required - Upload Second)</span>
                    </Label>
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors bg-green-50/50">
                      {!utilityFile ? (
                        <>
                          <Input
                            id="utility"
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleUtilityFileChange(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <label htmlFor="utility" className="cursor-pointer">
                            <Zap className="w-10 h-10 text-green-400 mx-auto mb-3" />
                            <p className="text-lg text-gray-600 mb-2">
                              Click to upload utility bill PDF
                            </p>
                            <p className="text-sm text-gray-500">
                              Utility bills for energy analysis
                            </p>
                          </label>
                        </>
                      ) : (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <Zap className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">{utilityFile.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeUtilityFile}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !plansetFile || !utilityFile}
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Documents...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload and Analyze Both Documents
                      </>
                    )}
                  </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
