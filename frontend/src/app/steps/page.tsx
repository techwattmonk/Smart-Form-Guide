'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, MessageCircle, CheckCircle, Clock, AlertCircle, Chrome, Download, ExternalLink } from 'lucide-react';
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
  const jurisdictionName = searchParams.get('jurisdiction_name');
  const originalSteps = searchParams.get('original_steps');
  const smartGuidanceFlow = searchParams.get('smart_guidance_flow');
  
  // Function to convert text with URLs and emails to clickable links
  const convertLinksInText = (text: string) => {
    if (!text) return text;

    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Email regex pattern
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    // Replace URLs with clickable links
    let processedText = text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors duration-200 font-medium break-all">${url}</a>`;
    });

    // Replace emails with clickable mailto links
    processedText = processedText.replace(emailRegex, (email) => {
      return `<a href="mailto:${email}" class="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors duration-200 font-medium">${email}</a>`;
    });

    return processedText;
  };

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

  // Function to parse smart guidance flow into structured steps
  const parseSmartGuidanceFlow = (guidanceText: string): StepItem[] => {
    if (!guidanceText) return [];

    const lines = guidanceText.split('\n').filter(line => line.trim());
    const steps: StepItem[] = [];
    let stepCounter = 1;

    // Look for "Step X:" pattern in the LLM response
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match "Step 1:", "Step 2:", etc.
      const stepMatch = line.match(/^Step\s*(\d+):\s*(.+)$/i);

      if (stepMatch) {
        const stepNumber = parseInt(stepMatch[1]);
        let title = stepMatch[2].trim();

        // Extract time estimates from the title
        const timeMatch = title.match(/\(([^)]*(?:week|day|month)[^)]*)\)/i);
        const estimatedTime = timeMatch ? timeMatch[1] : '';

        // Remove time estimate from title if found
        if (timeMatch) {
          title = title.replace(/\([^)]*(?:week|day|month)[^)]*\)/i, '').trim();
        }

        // Look for additional details in the next few lines
        let description = '';
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Stop if we hit another step
          if (nextLine.match(/^Step\s*\d+:/i)) break;
          // Add non-empty lines that aren't step headers
          if (nextLine && !nextLine.startsWith('Step') && nextLine.length > 10) {
            description = nextLine;
            break;
          }
        }

        steps.push({
          id: stepNumber,
          title: title,
          description: description,
          status: 'pending',
          estimatedTime: estimatedTime
        });
        stepCounter++;
      }
    }

    // If no structured steps found, fall back to original requirements
    if (steps.length === 0) {
      const originalSteps = searchParams.get('original_steps');
      if (originalSteps) {
        // Create basic steps from original requirements
        const basicSteps = [
          "Prepare required documents",
          "Submit application online",
          "Wait for approval",
          "Complete payment",
          "Pick up permit"
        ];

        basicSteps.forEach((step, index) => {
          steps.push({
            id: index + 1,
            title: step,
            description: '',
            status: 'pending',
            estimatedTime: ''
          });
        });
      }
    }

    return steps;
  };
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  // Initialize AHJ steps from smart guidance flow or use fallback
  const [ahjSteps, setAhjSteps] = useState<StepItem[]>(() => {
    if (smartGuidanceFlow) {
      const parsedSteps = parseSmartGuidanceFlow(smartGuidanceFlow);
      if (parsedSteps.length > 0) {
        return parsedSteps;
      }
    }

    // Fallback to default steps if no smart guidance available
    return [
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
    ];
  });



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
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
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


        {/* AHJ Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                Jurisdiction Process Steps
                {jurisdictionName && (
                  <span className="text-blue-600 font-normal"> - {jurisdictionName}</span>
                )}
              </CardTitle>
              <CardDescription>
                {smartGuidanceFlow
                  ? `Based on your project location in ${jurisdictionName || 'your jurisdiction'}, here are the specific steps for permit approval`
                  : 'Based on your project location, here are the required steps for permit approval'
                }
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
                    className="p-4 rounded-lg border-2 bg-white border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-lg font-semibold text-gray-900"
                            dangerouslySetInnerHTML={{ __html: convertLinksInText(step.title) }}
                          />
                          {step.estimatedTime && step.estimatedTime !== 'TBD' && (
                            <span className="text-sm text-blue-600 font-medium">
                              {step.estimatedTime}
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p
                            className="text-gray-600 mt-1"
                            dangerouslySetInnerHTML={{ __html: convertLinksInText(step.description) }}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Extension Installation Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-orange-50 to-blue-50 border-orange-200 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Chrome className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-gray-900">Ready to Fill Out Forms?</CardTitle>
                  <CardDescription>
                    Install our Chrome extension to auto-fill permit forms with your uploaded documents
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Smart Form Assistant</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automatically detects form fields on permit websites</li>
                    <li>• Suggests values from your uploaded planset and utility bill</li>
                    <li>• Saves time and reduces data entry errors</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push('/extension')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Extension</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
                    className="border-orange-200 text-orange-700 hover:bg-orange-50 px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Learn More</span>
                  </Button>
                </div>
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
