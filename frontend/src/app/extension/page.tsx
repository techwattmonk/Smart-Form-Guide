'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Chrome, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  Shield, 
  Smartphone,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function ExtensionPage() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

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

  const installSteps = [
    {
      title: "Download Extension Files",
      description: "Download the Smart Form Guide Chrome extension",
      action: "Download ZIP",
      detail: "chrome-extension.zip"
    },
    {
      title: "Extract Files",
      description: "Extract the downloaded ZIP file to a folder on your computer",
      action: "Extract to folder",
      detail: "Choose an easy-to-find location"
    },
    {
      title: "Open Chrome Extensions",
      description: "Go to Chrome Extensions page",
      action: "Copy URL",
      detail: "chrome://extensions/"
    },
    {
      title: "Enable Developer Mode",
      description: "Toggle the 'Developer mode' switch in the top right corner",
      action: "Enable toggle",
      detail: "Required for loading unpacked extensions"
    },
    {
      title: "Load Extension",
      description: "Click 'Load unpacked' and select the extracted folder",
      action: "Load unpacked",
      detail: "Select the chrome-extension folder"
    },
    {
      title: "Start Using",
      description: "The extension icon will appear in your browser toolbar",
      action: "Click icon",
      detail: "Sign in and start auto-filling forms!"
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
                <h1 className="text-2xl font-bold text-gray-900">Chrome Extension</h1>
                <p className="text-gray-600">Auto-fill permit forms with your uploaded documents</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Download Extension</span>
            </motion.button>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Supercharge Your Permit Applications
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Install our Chrome extension to automatically fill permit forms using data from your uploaded documents. 
            Save time and reduce errors with intelligent form assistance.
          </p>
          
          {/* Demo Video Placeholder */}
          <div className="bg-gray-900 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">See It In Action</h3>
                <p className="text-blue-100">Watch how the extension auto-fills permit forms</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why Use Our Extension?
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

        {/* Installation Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Installation Guide
          </h3>
          <div className="max-w-4xl mx-auto">
            {installSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start space-x-4 mb-8 last:mb-0"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
                    {step.detail === "chrome://extensions/" ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => copyToClipboard(step.detail, index)}
                        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                      >
                        {copiedStep === index ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </motion.button>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                        {step.action}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{step.description}</p>
                  <p className="text-sm text-gray-500">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            If you encounter any issues during installation or while using the extension, 
            we're here to help you get up and running.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span>View Documentation</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
