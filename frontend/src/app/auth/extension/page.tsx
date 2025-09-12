'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, CheckCircle, ArrowRight, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ExtensionAuthPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    // If user is already authenticated, send credentials to extension
    if (user && !authComplete) {
      sendAuthToExtension();
    }
  }, [user, authComplete]);

  const sendAuthToExtension = async () => {
    try {
      setAuthComplete(true);

      // Get the actual JWT token from localStorage (used by the main app)
      const actualToken = localStorage.getItem('auth_token');

      if (!actualToken) {
        console.error('No auth token found in localStorage');
        return;
      }

      // Send authentication data to the extension
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage({
          type: 'AUTH_SUCCESS',
          token: actualToken, // Use the real JWT token
          user: {
            id: user.id,
            name: user.full_name,
            email: user.email,
            picture: user.profile_picture
          }
        }, (response) => {
          if (window.chrome.runtime.lastError) {
            console.error('Error sending auth to extension:', window.chrome.runtime.lastError);
          } else {
            console.log('Auth sent to extension successfully:', response);
            // Close this tab after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          }
        });
      } else {
        // Fallback: use postMessage for communication
        window.postMessage({
          type: 'AUTH_SUCCESS',
          token: actualToken, // Use the real JWT token
          user: {
            id: user.id,
            name: user.full_name,
            email: user.email,
            picture: user.profile_picture
          }
        }, '*');

        // Close tab after delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending auth to extension:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithGoogle();
      // sendAuthToExtension will be called automatically via useEffect
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsAuthenticating(false);
    }
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (authComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Authentication Complete!</CardTitle>
              <CardDescription>
                You're now signed in to the Smart Form Guide extension
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ Extension authentication successful<br/>
                    ✅ User profile synchronized<br/>
                    ✅ Projects will be available in the extension
                  </p>
                </div>
                
                <p className="text-sm text-gray-600">
                  This tab will close automatically, or you can return to your dashboard.
                </p>
                
                <Button 
                  onClick={handleReturnToDashboard}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Return to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Chrome className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">
              Sign in to Chrome Extension
            </CardTitle>
            <CardDescription>
              Authenticate your Smart Form Guide extension to access your projects and enable auto-fill features
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">Auto-fill permit forms instantly</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">Secure access to your uploaded documents</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-700">Seamless project synchronization</span>
              </div>
            </div>

            {/* Sign In Button */}
            {user ? (
              <div className="text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Welcome back, {user.full_name}!<br/>
                    Connecting to your extension...
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isAuthenticating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </div>
                )}
              </Button>
            )}

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By signing in, you authorize the Chrome extension to access your Smart Form Guide account and projects.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
