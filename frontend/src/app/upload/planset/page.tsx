'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UploadResponse {
  message: string;
  extracted_keys: string;
}

export default function PlansetUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [files, setFiles] = useState<{ pdf1: File | null; pdf2: File | null }>({
    pdf1: null,
    pdf2: null
  });
  const [keys, setKeys] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (fileType: 'pdf1' | 'pdf2', file: File | null) => {
    setFiles(prev => ({ ...prev, [fileType]: file }));
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.pdf1 || !files.pdf2) {
      setError('Please select both PDF files');
      return;
    }

    if (!keys.trim()) {
      setError('Please enter the keys you want to extract');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf1', files.pdf1);
      formData.append('pdf2', files.pdf2);
      
      // Split keys by newlines and add each as a separate form field
      const keysList = keys.split('\n').filter(key => key.trim());
      keysList.forEach(key => {
        formData.append('keys', key.trim());
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload_pdfs/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result: UploadResponse = await response.json();
      setUploadResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFiles({ pdf1: null, pdf2: null });
    setKeys('');
    setUploadResult(null);
    setError(null);
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
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Planset Upload
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
                Upload Architectural Plansets
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload two PDF files and specify the keys you want to extract using AI analysis
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {!uploadResult ? (
                <>
                  {/* File Upload Section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* PDF 1 Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="pdf1" className="text-sm font-medium text-gray-700">
                        First PDF File
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Input
                          id="pdf1"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileChange('pdf1', e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="pdf1" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {files.pdf1 ? files.pdf1.name : 'Click to upload PDF 1'}
                          </p>
                        </label>
                      </div>
                    </div>

                    {/* PDF 2 Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="pdf2" className="text-sm font-medium text-gray-700">
                        Second PDF File
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Input
                          id="pdf2"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileChange('pdf2', e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="pdf2" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {files.pdf2 ? files.pdf2.name : 'Click to upload PDF 2'}
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Keys Input Section */}
                  <div className="space-y-2">
                    <Label htmlFor="keys" className="text-sm font-medium text-gray-700">
                      Keys to Extract (one per line)
                    </Label>
                    <textarea
                      id="keys"
                      value={keys}
                      onChange={(e) => setKeys(e.target.value)}
                      placeholder="Enter keys to extract, one per line:&#10;Building Area&#10;Number of Floors&#10;Construction Type&#10;Zoning Information"
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !files.pdf1 || !files.pdf2 || !keys.trim()}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing PDFs...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload and Process
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* Results Section */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Upload Successful!</span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Extracted Information:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {uploadResult.extracted_keys}
                      </pre>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1"
                    >
                      Upload Another
                    </Button>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
