'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Loader2, FileText, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface QueryResponse {
  results: Array<{
    content: string;
    metadata: {
      filename: string;
      page?: number;
    };
    score: number;
  }>;
}

export default function QueryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result: QueryResponse = await response.json();
      setSearchResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = () => {
    setQuery('');
    setSearchResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
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
              <Search className="w-5 h-5 text-purple-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Document Search
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
                Semantic Document Search
              </CardTitle>
              <CardDescription className="text-gray-600">
                Search through your uploaded documents using AI-powered semantic search
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Search Input Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query" className="text-sm font-medium text-gray-700">
                    Search Query
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="query"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter your search query (e.g., 'building area', 'energy usage', 'construction type')"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !query.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Example Queries */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500">Try:</span>
                  {[
                    'building area',
                    'energy consumption',
                    'construction materials',
                    'zoning information',
                    'monthly usage'
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setQuery(example)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                    >
                      {example}
                    </button>
                  ))}
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
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Search Results */}
              {searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Search Results ({searchResults.results.length} found)
                    </h3>
                    <Button
                      onClick={resetSearch}
                      variant="outline"
                      size="sm"
                    >
                      New Search
                    </Button>
                  </div>

                  {searchResults.results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No results found for your query.</p>
                      <p className="text-sm">Try uploading some documents first or using different search terms.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {searchResults.results.map((result, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {result.metadata.filename}
                              </span>
                              {result.metadata.page && (
                                <span className="text-xs text-gray-500">
                                  Page {result.metadata.page}
                                </span>
                              )}
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {Math.round(result.score * 100)}% match
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {result.content}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Instructions */}
              {!searchResults && !error && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Upload documents first using the upload pages</li>
                    <li>• Enter natural language queries to search through document content</li>
                    <li>• Results are ranked by semantic similarity to your query</li>
                    <li>• Use specific terms for better results (e.g., "square footage" vs "size")</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
