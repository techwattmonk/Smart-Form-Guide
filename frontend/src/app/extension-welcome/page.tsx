'use client';

import { motion } from 'framer-motion';
import { Chrome, CheckCircle, ArrowRight, Zap, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ExtensionWelcomePage() {
  const router = useRouter();

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Form Detection",
      description: "Automatically detects and analyzes form fields on permit websites"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Auto-Fill",
      description: "Uses your uploaded documents to suggest accurate field values"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Seamless Integration",
      description: "Single sign-on with your Smart Form Guide account"
    }
  ];

  const steps = [
    {
      number: 1,
      title: "Sign In",
      description: "Click the extension icon and sign in with your Smart Form Guide account"
    },
    {
      number: 2,
      title: "Select Project",
      description: "Choose which project's documents to use for form filling"
    },
    {
      number: 3,
      title: "Visit Permit Site",
      description: "Navigate to any government permit website"
    },
    {
      number: 4,
      title: "Auto-Fill Forms",
      description: "Let the extension detect fields and suggest values from your documents"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Chrome className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome to Smart Form Guide Extension!</h1>
                <p className="text-gray-600">Your intelligent permit form assistant is ready</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Extension Installed Successfully!
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            You're all set! The Smart Form Guide Chrome extension is now installed and ready to help you 
            auto-fill permit forms with data from your uploaded documents.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            What Your Extension Can Do
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How to Use */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            How to Get Started
          </h3>
          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start space-x-4 mb-8 last:mb-0"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {step.number}
                </div>
                <div className="flex-1 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-4">Ready to Start?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Click the extension icon in your browser toolbar to sign in and start using the Smart Form Guide extension.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => window.open('/downloads/INSTALLATION_GUIDE.txt', '_blank')}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
            >
              View Installation Guide
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
