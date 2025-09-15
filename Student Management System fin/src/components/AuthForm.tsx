import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from "sonner@2.0.3";
import { authenticateUser, registerUser, isValidCollegeEmail } from '../utils/localStorage';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  department?: string;
  year?: string;
  rollNumber?: string;
  course?: string;
}

interface AuthFormProps {
  onAuth: (user: User, token: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuth }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student' as 'admin' | 'student',
    department: '',
    year: '',
    rollNumber: '',
    course: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = authenticateUser(loginData.email, loginData.password);
      
      if (user) {
        toast.success('Login successful!');
        // Generate a simple token for session management
        const token = btoa(`${user.id}-${Date.now()}`);
        onAuth(user, token);
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate college email for students
      if (signupData.role === 'student' && !isValidCollegeEmail(signupData.email)) {
        toast.error('Students must use college email (@klu.ac.in)');
        setIsLoading(false);
        return;
      }

      const newUser = registerUser({
        email: signupData.email,
        name: signupData.name,
        role: signupData.role,
        department: signupData.department,
        year: signupData.year,
        rollNumber: signupData.rollNumber,
        course: signupData.course
      });
      
      toast.success('Account created successfully!');
      // Generate a simple token for session management
      const token = btoa(`${newUser.id}-${Date.now()}`);
      onAuth(newUser, token);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-600/20"></div>
      <Card className="w-full max-w-md relative bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <div className="text-white text-2xl">🎓</div>
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Student Management System
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">College Events & Programs Platform</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 backdrop-blur-sm">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={signupData.name}
                    onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email {signupData.role === 'student' && <span className="text-sm text-gray-500">(must be college email)</span>}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={signupData.role === 'student' ? 'student@klu.ac.in' : 'email@example.com'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Role</Label>
                  <Select
                    value={signupData.role}
                    onValueChange={(value: 'admin' | 'student') => setSignupData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="admin">Admin/Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {signupData.role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-department">Department</Label>
                      <Input
                        id="signup-department"
                        value={signupData.department}
                        onChange={(e) => setSignupData(prev => ({ ...prev, department: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-year">Year</Label>
                      <Select
                        value={signupData.year}
                        onValueChange={(value) => setSignupData(prev => ({ ...prev, year: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">First Year</SelectItem>
                          <SelectItem value="2">Second Year</SelectItem>
                          <SelectItem value="3">Third Year</SelectItem>
                          <SelectItem value="4">Fourth Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-rollnumber">Roll Number</Label>
                      <Input
                        id="signup-rollnumber"
                        value={signupData.rollNumber}
                        onChange={(e) => setSignupData(prev => ({ ...prev, rollNumber: e.target.value }))}
                        placeholder="e.g., CS21001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-course">Course</Label>
                      <Input
                        id="signup-course"
                        value={signupData.course}
                        onChange={(e) => setSignupData(prev => ({ ...prev, course: e.target.value }))}
                        placeholder="e.g., B.Tech Computer Science"
                        required
                      />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};