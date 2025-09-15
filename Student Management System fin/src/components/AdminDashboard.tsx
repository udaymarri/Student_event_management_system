import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, Users, Trophy, BarChart3, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, Sparkles, TrendingUp, Award, Zap, Shield, MapPin, Search, Filter, Download, Upload, FileSpreadsheet, User, AlertCircle, Image } from 'lucide-react';
import { toast } from "sonner@2.0.3";
import { 
  getEvents, 
  getPendingEvents, 
  getRegistrations, 
  createEvent, 
  deleteEvent, 
  approveEvent,
  updateAttendance,
  searchStudents,
  getStudentParticipationStats,
  exportStudentData,
  getNonCGPAClaims,
  getPendingNonCGPAClaims,
  reviewNonCGPAClaim,
  getUsers,
  saveUsers
} from '../utils/localStorage';

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  venue: string;
  date: string;
  time: string;
  capacity: number;
  contactPerson: string;
  contactEmail: string;
  registrations: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  studentName: string;
  studentEmail: string;
  department: string;
  year: string;
  registeredAt: string;
  attended?: boolean;
  rollNumber?: string;
}

interface NonCGPAClaim {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  department: string;
  year: string;
  reason: string;
  description: string;
  documents?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminComments?: string;
}

interface AdminDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, token, onLogout }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [pendingClaims, setPendingClaims] = useState<NonCGPAClaim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [participationSearch, setParticipationSearch] = useState('');
  const [participationStats, setParticipationStats] = useState<any>(null);
  const [showClaimReview, setShowClaimReview] = useState<NonCGPAClaim | null>(null);
  const [claimReviewComments, setClaimReviewComments] = useState('');
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    category: 'technical',
    venue: '',
    date: '',
    time: '',
    capacity: 50,
    contactPerson: '',
    contactEmail: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
    fetchPendingEvents();
    fetchPendingClaims();
  }, []);

  const fetchEvents = async () => {
    try {
      const events = getEvents();
      setEvents(events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const registrations = getRegistrations();
      setRegistrations(registrations || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const fetchPendingEvents = async () => {
    try {
      const pendingEvents = getPendingEvents();
      setPendingEvents(pendingEvents || []);
    } catch (error) {
      console.error('Error fetching pending events:', error);
    }
  };

  const fetchPendingClaims = async () => {
    try {
      const pendingClaims = getPendingNonCGPAClaims();
      setPendingClaims(pendingClaims || []);
    } catch (error) {
      console.error('Error fetching pending claims:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = user.id;
      
      const newEvent = createEvent({
        ...eventForm,
        status: 'upcoming' as const
      }, userId);

      toast.success('Event created successfully!');
      setShowCreateEvent(false);
      setEventForm({
        name: '',
        description: '',
        category: 'technical',
        venue: '',
        date: '',
        time: '',
        capacity: 50,
        contactPerson: '',
        contactEmail: ''
      });
      fetchEvents();
      fetchPendingEvents();
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Error during event creation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const success = deleteEvent(eventId);
      
      if (success) {
        toast.success('Event deleted successfully!');
        fetchEvents();
        fetchPendingEvents();
        fetchRegistrations();
      } else {
        toast.error('Failed to delete event');
      }
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error('Error during event deletion');
    }
  };

  const markAttendance = async (registrationId: string, attended: boolean) => {
    try {
      const success = updateAttendance(registrationId, attended);
      
      if (success) {
        toast.success(`Attendance ${attended ? 'marked' : 'unmarked'}`);
        fetchRegistrations();
      } else {
        toast.error('Failed to update attendance');
      }
    } catch (error) {
      console.error('Attendance update error:', error);
      toast.error('Error during attendance update');
    }
  };

  const handleApproveEvent = async (eventId: string, approved: boolean) => {
    try {
      const success = approveEvent(eventId, approved);
      
      if (success) {
        toast.success(`Event ${approved ? 'approved' : 'rejected'} successfully!`);
        fetchEvents();
        fetchPendingEvents();
      } else {
        toast.error('Failed to update event approval');
      }
    } catch (error) {
      console.error('Event approval error:', error);
      toast.error('Error during event approval');
    }
  };

  const handleParticipationSearch = () => {
    if (!participationSearch.trim()) return;
    
    const stats = getStudentParticipationStats(participationSearch.trim());
    setParticipationStats(stats);
    
    if (!stats.student) {
      toast.error('No student found with this roll number');
    }
  };

  const handleExportData = () => {
    try {
      const csvData = exportStudentData();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'student_data.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        // Expected headers: Name,Roll Number,Email,Department,Year,Course
        if (headers.length < 6) {
          toast.error('Invalid CSV format. Expected columns: Name,Roll Number,Email,Department,Year,Course');
          return;
        }

        let importedCount = 0;
        const users = getUsers();
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const data = line.split(',');
          if (data.length < 6) continue;
          
          const [name, rollNumber, email, department, year, course] = data;
          
          // Check if user already exists
          if (users.find(u => u.email === email.trim() || u.rollNumber === rollNumber.trim())) {
            continue;
          }

          // Validate email domain
          if (!email.trim().endsWith('@klu.ac.in')) {
            continue;
          }

          // Create new user
          try {
            const newUser = {
              id: `user-${Date.now()}-${importedCount}`,
              email: email.trim(),
              name: name.trim(),
              role: 'student' as const,
              department: department.trim(),
              year: year.trim(),
              rollNumber: rollNumber.trim(),
              course: course.trim()
            };
            
            users.push(newUser);
            importedCount++;
          } catch (err) {
            console.error('Error creating user:', err);
          }
        }
        
        if (importedCount > 0) {
          saveUsers(users);
          toast.success(`Successfully imported ${importedCount} students!`);
        } else {
          toast.error('No valid students found to import. Check email domain (@klu.ac.in) and data format.');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import data. Please check file format.');
      }
    };
    
    reader.readAsText(file);
  };

  const handleReviewClaim = async (claimId: string, status: 'approved' | 'rejected') => {
    try {
      const userId = atob(token).split('-')[0];
      const success = reviewNonCGPAClaim(claimId, status, userId, claimReviewComments);
      
      if (success) {
        toast.success(`Claim ${status} successfully!`);
        setShowClaimReview(null);
        setClaimReviewComments('');
        fetchPendingClaims();
      } else {
        toast.error('Failed to review claim');
      }
    } catch (error) {
      console.error('Claim review error:', error);
      toast.error('Error during claim review');
    }
  };

  const filteredStudents = searchQuery || departmentFilter !== 'all' || yearFilter !== 'all' 
    ? searchStudents(searchQuery, { 
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined
      })
    : [];

  const stats = {
    totalEvents: events.length,
    totalRegistrations: registrations.length,
    upcomingEvents: events.filter(e => e.status === 'upcoming').length,
    completedEvents: events.filter(e => e.status === 'completed').length,
    pendingApproval: pendingEvents.length,
    pendingClaims: pendingClaims.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Admin Dashboard
                </h1>
                <p className="text-blue-100">Welcome back, {user.name}</p>
              </div>
            </div>
            <Button onClick={onLogout} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-blue-100">Total Events</p>
                <p className="text-3xl font-bold">{stats.totalEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-green-100">Registrations</p>
                <p className="text-3xl font-bold">{stats.totalRegistrations}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-orange-100">Upcoming</p>
                <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Award className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-pink-100">Completed</p>
                <p className="text-3xl font-bold">{stats.completedEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-pink-500 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-red-100">Pending Events</p>
                <p className="text-3xl font-bold">{stats.pendingApproval}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-indigo-100">Pending Claims</p>
                <p className="text-3xl font-bold">{stats.pendingClaims}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList className="bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="events" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Events</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-red-500 data-[state=active]:text-white relative">
                Pending Approval
                {stats.pendingApproval > 0 && (
                  <Badge className="ml-2 bg-red-600 text-white text-xs">{stats.pendingApproval}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="registrations" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Registrations</TabsTrigger>
              <TabsTrigger value="students" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Student Management</TabsTrigger>
              <TabsTrigger value="claims" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white relative">
                Non-CGPA Claims
                {stats.pendingClaims > 0 && (
                  <Badge className="ml-2 bg-indigo-600 text-white text-xs">{stats.pendingClaims}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="events">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Event Management
                    </CardTitle>
                    <CardDescription>Create and manage college events</CardDescription>
                  </div>
                  <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 shadow-lg">
                        <Plus className="w-4 h-4 mr-2" />Create Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Event</DialogTitle>
                        <DialogDescription>Fill in the event details</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateEvent} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="event-name">Event Name</Label>
                          <Input
                            id="event-name"
                            value={eventForm.name}
                            onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-description">Description</Label>
                          <Textarea
                            id="event-description"
                            value={eventForm.description}
                            onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={eventForm.category}
                              onValueChange={(value) => setEventForm(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Technical</SelectItem>
                                <SelectItem value="cultural">Cultural</SelectItem>
                                <SelectItem value="sports">Sports</SelectItem>
                                <SelectItem value="academic">Academic</SelectItem>
                                <SelectItem value="workshop">Workshop</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="event-capacity">Capacity</Label>
                            <Input
                              id="event-capacity"
                              type="number"
                              value={eventForm.capacity}
                              onChange={(e) => setEventForm(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-venue">Venue</Label>
                          <Input
                            id="event-venue"
                            value={eventForm.venue}
                            onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="event-date">Date</Label>
                            <Input
                              id="event-date"
                              type="date"
                              value={eventForm.date}
                              onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="event-time">Time</Label>
                            <Input
                              id="event-time"
                              type="time"
                              value={eventForm.time}
                              onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-person">Contact Person</Label>
                          <Input
                            id="contact-person"
                            value={eventForm.contactPerson}
                            onChange={(e) => setEventForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Contact Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            value={eventForm.contactEmail}
                            onChange={(e) => setEventForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? 'Creating...' : 'Create Event'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event.id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/70 backdrop-blur-sm border-0">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <h3 className="text-xl font-semibold">{event.name}</h3>
                              {event.createdByRole === 'student' && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  Student Created
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-4">{event.description}</p>
                            
                            <div className="flex flex-wrap gap-3 mb-4">
                              <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                                {event.category}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {event.venue}
                              </Badge>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {event.date} at {event.time}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-blue-600 font-medium">Capacity: {event.capacity}</p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-green-600 font-medium">Registrations: {event.registrations || 0}</p>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <p className="text-purple-600 font-medium">Contact: {event.contactPerson}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-6">
                            <Button 
                              onClick={() => handleDeleteEvent(event.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No events found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-red-500/10 to-pink-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Approval
                </CardTitle>
                <CardDescription>Review and approve student-created events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingEvents.map((event) => (
                    <Card key={event.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{event.name}</h3>
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                                Pending Approval
                              </Badge>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                Created by: {event.createdByName}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-4">{event.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Category:</span>
                                <p className="text-gray-600">{event.category}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Venue:</span>
                                <p className="text-gray-600">{event.venue}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Date & Time:</span>
                                <p className="text-gray-600">{event.date} at {event.time}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Capacity:</span>
                                <p className="text-gray-600">{event.capacity}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-6">
                            <Button 
                              onClick={() => handleApproveEvent(event.id, true)}
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleApproveEvent(event.id, false)}
                              variant="outline"
                              className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {pendingEvents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No events pending approval</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Event Registrations
                </CardTitle>
                <CardDescription>Manage student registrations and attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.map((registration) => (
                        <TableRow key={registration.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{registration.studentName}</p>
                              <p className="text-sm text-gray-500">{registration.rollNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{registration.eventName}</TableCell>
                          <TableCell>{registration.department}</TableCell>
                          <TableCell>Year {registration.year}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {new Date(registration.registeredAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {registration.attended === true ? (
                              <Badge className="bg-green-100 text-green-800">Present</Badge>
                            ) : registration.attended === false ? (
                              <Badge className="bg-red-100 text-red-800">Absent</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => markAttendance(registration.id, true)}
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                disabled={registration.attended === true}
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => markAttendance(registration.id, false)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={registration.attended === false}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {registrations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No registrations found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Management
                </CardTitle>
                <CardDescription>Search students and import data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Import/Export Section */}
                <div className="flex flex-wrap gap-4">
                  <Button onClick={handleExportData} variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200">
                    <Download className="w-4 h-4 mr-2" />
                    Export Student Data
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Student Data (CSV)
                    </Button>
                  </div>
                </div>

                {/* Search and Filter Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                  />
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-gray-200/50">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Mechanical">Mechanical</SelectItem>
                      <SelectItem value="Civil">Civil</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-gray-200/50">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1">First Year</SelectItem>
                      <SelectItem value="2">Second Year</SelectItem>
                      <SelectItem value="3">Third Year</SelectItem>
                      <SelectItem value="4">Fourth Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Import Instructions */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">CSV Import Format</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          To import students, upload a CSV file with columns: Name, Roll Number, Email, Department, Year, Course
                        </p>
                        <p className="text-xs text-blue-600">
                          Note: Email must end with @klu.ac.in. Duplicate emails/roll numbers will be skipped.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Participation Search */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5" />
                      Student Participation Search
                    </CardTitle>
                    <CardDescription>Search by roll number to view participation statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <Input
                        placeholder="Enter roll number (e.g., CS21001)"
                        value={participationSearch}
                        onChange={(e) => setParticipationSearch(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleParticipationSearch}>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </Button>
                    </div>
                    
                    {participationStats && participationStats.student && (
                      <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-lg">{participationStats.student.name}</h4>
                            <p className="text-gray-600">Roll: {participationStats.student.rollNumber}</p>
                            <p className="text-gray-600">Department: {participationStats.student.department}</p>
                            <p className="text-gray-600">Year: {participationStats.student.year}</p>
                            <p className="text-gray-600">Course: {participationStats.student.course}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">{participationStats.totalEvents}</p>
                              <p className="text-sm text-blue-700">Total Events</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">{participationStats.attendedEvents}</p>
                              <p className="text-sm text-green-700">Attended</p>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <p className="text-2xl font-bold text-orange-600">{participationStats.upcomingEvents}</p>
                              <p className="text-sm text-orange-700">Upcoming</p>
                            </div>
                          </div>
                        </div>
                        
                        {participationStats.registrations.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Event Participation History:</h5>
                            <div className="space-y-2">
                              {participationStats.registrations.map((reg: any) => (
                                <div key={reg.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span>{reg.eventName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">{reg.eventDate}</span>
                                    {reg.attended === true ? (
                                      <Badge className="bg-green-100 text-green-800">Attended</Badge>
                                    ) : reg.attended === false ? (
                                      <Badge className="bg-red-100 text-red-800">Absent</Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Student List */}
                {filteredStudents.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Events Registered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => {
                          const studentRegs = registrations.filter(r => r.studentEmail === student.email);
                          return (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.department || 'N/A'}</TableCell>
                              <TableCell>{student.year || 'N/A'}</TableCell>
                              <TableCell>{student.course || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{studentRegs.length} events</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Non-CGPA Claims Management
                </CardTitle>
                <CardDescription>Review and approve student non-CGPA verification claims</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingClaims.map((claim) => (
                    <Card key={claim.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{claim.studentName}</h3>
                              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                                {claim.rollNumber}
                              </Badge>
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {claim.reason}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span>{claim.department} - Year {claim.year}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-600" />
                                <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                <span>Status: {claim.status}</span>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg">
                              <p className="font-medium mb-1">Description:</p>
                              <p className="text-gray-600">{claim.description}</p>
                            </div>
                            
                            {claim.documents && claim.documents.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Image className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">
                                    Certification Images Uploaded ({claim.documents.length})
                                  </span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  Click Review to view uploaded certification images
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-6">
                            <Button 
                              onClick={() => setShowClaimReview(claim)}
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-lg"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {pendingClaims.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No claims pending review</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analytics & Reports
                </CardTitle>
                <CardDescription>System insights and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                      <h3 className="text-2xl font-bold text-blue-700">{stats.totalEvents}</h3>
                      <p className="text-blue-600">Total Events</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200">
                    <CardContent className="p-6 text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
                      <h3 className="text-2xl font-bold text-green-700">{stats.totalRegistrations}</h3>
                      <p className="text-green-600">Total Registrations</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200">
                    <CardContent className="p-6 text-center">
                      <Award className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                      <h3 className="text-2xl font-bold text-purple-700">
                        {registrations.filter(r => r.attended === true).length}
                      </h3>
                      <p className="text-purple-600">Attended Events</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200">
                    <CardContent className="p-6 text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                      <h3 className="text-2xl font-bold text-orange-700">
                        {registrations.length > 0 ? Math.round((registrations.filter(r => r.attended === true).length / registrations.length) * 100) : 0}%
                      </h3>
                      <p className="text-orange-600">Attendance Rate</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Claim Review Dialog */}
      {showClaimReview && (
        <Dialog open={!!showClaimReview} onOpenChange={() => setShowClaimReview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Non-CGPA Claim</DialogTitle>
              <DialogDescription>Review and approve/reject the student's claim</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Student Name</Label>
                  <p className="text-lg">{showClaimReview.studentName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Roll Number</Label>
                  <p className="text-lg">{showClaimReview.rollNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p>{showClaimReview.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Year</Label>
                  <p>{showClaimReview.year}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{showClaimReview.reason}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{showClaimReview.description}</p>
              </div>
              
              {/* Certification Images */}
              {showClaimReview.documents && showClaimReview.documents.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">Uploaded Certification Images</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showClaimReview.documents.map((imageBase64, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Certificate {index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <img 
                            src={imageBase64} 
                            alt={`Certificate ${index + 1}`}
                            className="w-full h-48 object-contain bg-gray-50 rounded border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `
                                <div class="w-full h-48 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                                  <div class="text-center text-red-600">
                                    <p class="text-sm">Failed to load image</p>
                                    <p class="text-xs mt-1">Image may be corrupted</p>
                                  </div>
                                </div>
                              `;
                            }}
                          />
                          <div className="mt-2 flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFullSizeImage(imageBase64)}
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Full Size
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Admin Comments</Label>
                <Textarea
                  value={claimReviewComments}
                  onChange={(e) => setClaimReviewComments(e.target.value)}
                  placeholder="Add your comments..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => handleReviewClaim(showClaimReview.id, 'approved')}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Claim
                </Button>
                <Button 
                  onClick={() => handleReviewClaim(showClaimReview.id, 'rejected')}
                  variant="outline"
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Claim
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Full Size Image Modal */}
      {fullSizeImage && (
        <Dialog open={!!fullSizeImage} onOpenChange={() => setFullSizeImage(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-2">
            <DialogHeader className="pb-2">
              <DialogTitle>Full Size Certificate Image</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center max-h-[80vh] overflow-auto">
              <img 
                src={fullSizeImage} 
                alt="Certificate full size"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `
                    <div class="w-full h-64 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                      <div class="text-center text-red-600">
                        <p class="text-lg">Failed to load image</p>
                        <p class="text-sm mt-1">Image may be corrupted</p>
                      </div>
                    </div>
                  `;
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};