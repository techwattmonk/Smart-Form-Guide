'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface StepItem {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  estimatedTime: string;
}

interface ChatMessage {
  id: number;
  message: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function StepsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get extracted data from URL params
  const projectName = searchParams.get('project_name') || 'Unknown Project';
  const address = searchParams.get('address') || 'Address not found';
  const totalArea = searchParams.get('total_area') || 'N/A';
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      message: "Hello! I'm here to help you with your permit application process. Feel free to ask me any questions!",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  // Mock AHJ steps - these will later come from Google Sheets based on address
  const [ahjSteps, setAhjSteps] = useState<StepItem[]>([
    {
      id: 1,
      title: "Document Review",
      description: "Initial review of submitted planset and utility documents",
      status: 'completed',
      estimatedTime: "1-2 business days"
    },
    {
      id: 2,
      title: "Zoning Compliance Check",
      description: "Verify project compliance with local zoning regulations",
      status: 'in-progress',
      estimatedTime: "3-5 business days"
    },
    {
      id: 3,
      title: "Engineering Review",
      description: "Technical review by licensed engineers",
      status: 'pending',
      estimatedTime: "5-7 business days"
    },
    {
      id: 4,
      title: "Fire Department Approval",
      description: "Fire safety and access review",
      status: 'pending',
      estimatedTime: "2-3 business days"
    },
    {
      id: 5,
      title: "Final Permit Issuance",
      description: "Final approval and permit documentation",
      status: 'pending',
      estimatedTime: "1-2 business days"
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      message: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentMessage = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // Call the query endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentMessage,
          top_k: 3
        }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.json();

      const botMessage: ChatMessage = {
        id: chatMessages.length + 2,
        message: result.answer || "I'm sorry, I couldn't process your question at the moment. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: chatMessages.length + 2,
        message: "I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or contact your local building department for immediate assistance.",
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
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
              onClick={() => router.push('/upload')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Upload</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Permit Process Steps
              </h1>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Project Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Project Name</p>
                  <p className="text-lg font-semibold text-gray-900">{projectName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-lg font-semibold text-gray-900">{address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Area</p>
                  <p className="text-lg font-semibold text-gray-900">{totalArea}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AHJ Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Authority Having Jurisdiction (AHJ) Process Steps</CardTitle>
              <CardDescription>
                Based on your project location, here are the required steps for permit approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ahjSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(step.status)}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Step {step.id}: {step.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {step.estimatedTime}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{step.description}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            step.status === 'completed' ? 'bg-green-100 text-green-800' :
                            step.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {step.status === 'completed' ? 'Completed' :
                             step.status === 'in-progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Chat Bot Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, transformOrigin: "bottom right" }}
            exit={{ opacity: 0, scale: 0.8, transformOrigin: "bottom right" }}
            className="mb-4 w-80 h-96 bg-white rounded-lg shadow-xl border flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
              <h3 className="font-semibold">AHJ Assistant</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-blue-700 h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg max-w-xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="mb-3 text-left">
                  <div className="inline-block p-3 rounded-lg max-w-xs bg-gray-100 text-gray-900 rounded-bl-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
                  placeholder="Ask about the permit process..."
                  disabled={isTyping}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  disabled={isTyping || !newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTyping ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
