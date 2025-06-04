
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NEREUS_LOGO_URL } from '../config/env';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#000009] to-[#712B71] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={NEREUS_LOGO_URL} 
            alt="Nereus Logo" 
            className="mx-auto h-16 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Nereus</h1>
          <p className="text-[#45f0df]">Admin Panel Login</p>
        </div>

        <Card className="border-[#712B71] bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-center">Sign In</CardTitle>
            <CardDescription className="text-[#45f0df] text-center">
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/10 border-[#712B71] text-white placeholder-gray-400 focus:border-[#45f0df] focus:ring-[#45f0df]"
                  placeholder="Enter your username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-[#712B71] text-white placeholder-gray-400 focus:border-[#45f0df] focus:ring-[#45f0df]"
                  placeholder="Enter your password"
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#712B71] hover:bg-[#45f0df] hover:text-[#000009] text-white font-semibold py-2 px-4 rounded transition-all duration-200"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
