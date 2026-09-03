import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface AccountDetails {
  id: string;
  username: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

const AccountChange = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, changeUserPassword, fetchAccountDetails } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(
    Boolean((location.state as { requirePasswordChange?: boolean } | null)?.requirePasswordChange)
  );

  // Fetch account details on mount
  useEffect(() => {
    const loadDetails = async () => {
      if (!user?.id) {
        setDetailsLoading(false);
        return;
      }

      const details = await fetchAccountDetails(user.id);
      setAccountDetails(details);
      setDetailsLoading(false);
    };

    loadDetails();
  }, [user?.id]);

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const res = await changeUserPassword(password, user.id);
    setLoading(false);

    if (!res.success) {
      toast({
        title: 'Error',
        description: res.error || 'Failed to change password',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Password changed successfully',
    });

    setPassword('');
    setConfirmPassword('');
    navigate('/dashboard');
  };

  return (
    <AdminLayout>
      <Dialog open={showPasswordPrompt} onOpenChange={setShowPasswordPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Update Your Password
            </DialogTitle>
            <DialogDescription>
              Your account is using a temporary, system-generated password. For security, please
              set a new password before continuing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowPasswordPrompt(false);
                navigate(location.pathname, { replace: true, state: {} });
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Change Password</h1>
            <p className="text-gray-600 mt-1">Change Your Password</p>
          </div>
        </div>

        {/* Account details */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Account Info</CardTitle>
            <CardDescription>Your current account details</CardDescription>
          </CardHeader>
          <CardContent>
            {detailsLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading account details...
              </div>
            ) : accountDetails ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-[#000009]">Username:</span>{' '}
                  <span className="text-gray-600">{accountDetails.username}</span>
                </p>
                {accountDetails.email && (
                  <p>
                    <span className="font-medium text-[#000009]">Email:</span>{' '}
                    <span className="text-gray-600">{accountDetails.email}</span>
                  </p>
                )}
                {accountDetails.role && (
                  <p>
                    <span className="font-medium text-[#000009]">Role:</span>{' '}
                    <span className="text-gray-600">{accountDetails.role}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Unable to load account details.</p>
            )}
          </CardContent>
        </Card>

        {/* Password change form */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Password Change</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleChangePassword} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AccountChange;