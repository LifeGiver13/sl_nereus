import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { IconActionButton } from '@/components/IconActionTooltip';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

interface User {
  id: number;
}

interface PasswordChangeFormProps {
  user: User;
  onUserUpdated: () => void;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ user, onUserUpdated }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Password strength validation
  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast({
        title: "Validation Error",
        description: "Password does not meet security requirements",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest(`/auth/user/${user.id}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      onUserUpdated();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                minLength={8}
                required
                className="pr-10"
              />
              <IconActionButton
                label={showPassword ? 'Hide password' : 'Show password'}
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rounded-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </IconActionButton>
            </div>
            
            {/* Password requirements */}
            <div className="space-y-1 text-sm">
              <div className="text-gray-600 font-medium">Password requirements:</div>
              <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordValidation.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 8 characters
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordValidation.hasLetter ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 letter
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordValidation.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 number
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordValidation.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 1 special character (!@#$%^&*(),.?":{}|&lt;&gt;)
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="pr-10"
              />
              <IconActionButton
                label={showConfirmPassword ? 'Hide password' : 'Show password'}
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rounded-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </IconActionButton>
            </div>
            
            {/* Password match indicator */}
            {confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordChangeForm;