import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, Clock, MapPin, Users, Trophy, BookOpen, Search, Filter, Plus, Sparkles, TrendingUp, Award, Zap, AlertCircle, FileText, CheckCircle, XCircle, Image } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from "sonner@2.0.3";
import { 
  getEventsWithRegistrationStatus, 
  getUserRegistrations, 
  registerForEvent, 
  unregisterFromEvent,
  createEvent,
  createNonCGPAClaim,
  getUserNonCGPAClaims
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
  isRegistered?: boolean;
  createdByRole?: string;
}

interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  registeredAt: string;
  attended?: boolean;
  category: string;
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

interface StudentDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, token, onLogout }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [nonCGPAClaims, setNonCGPAClaims] = useState<NonCGPAClaim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateClaim, setShowCreateClaim] = useState(false);
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
  const [claimForm, setClaimForm] = useState({
    description: '',
    certificationImage: null as File | null
  });

  useEffect(() => {
    fetchEvents();
    fetchMyRegistrations();
    fetchNonCGPAClaims();
  }, []);

  useEffect(() => {
    let filtered = events;
    
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }
    
    setFilteredEvents(filtered);
  }, [events, searchTerm, categoryFilter]);

  const fetchEvents = async () => {
    try {
      const userId = user.id;
      const events = getEventsWithRegistrationStatus(userId);
      setEvents(events || []);
      setFilteredEvents(events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const userId = user.id;
      const registrations = getUserRegistrations(userId);
      setRegistrations(registrations || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const fetchNonCGPAClaims = async () => {
    try {
      const userId = user.id;
      const claims = getUserNonCGPAClaims(userId);
      setNonCGPAClaims(claims || []);
    } catch (error) {
      console.error('Error fetching non-CGPA claims:', error);
    }
  };

  const handleRegister = async (eventId: string) => {
    setIsLoading(true);
    
    try {
      const userId = user.id;
      const result = registerForEvent(eventId, userId);

      if (result === true) {
        toast.success('Successfully registered for the event!');
        fetchEvents();
        fetchMyRegistrations();
      } else {
        toast.error(typeof result === 'string' ? result : 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Error during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!confirm('Are you sure you want to unregister from this event?')) return;
    
    setIsLoading(true);
    
    try {
      const userId = user.id;
      const result = unregisterFromEvent(eventId, userId);

      if (result === true) {
        toast.success('Successfully unregistered from the event');
        fetchEvents();
        fetchMyRegistrations();
      } else {
        toast.error(typeof result === 'string' ? result : 'Failed to unregister from event');
      }
    } catch (error) {
      console.error('Unregister error:', error);
      toast.error('Error during unregistration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = user.id;
      
      const newEvent = createEvent({
        ...eventForm,
        contactPerson: eventForm.contactPerson || user.name,
        contactEmail: eventForm.contactEmail || user.email,
        status: 'upcoming' as const
      }, userId);

      toast.success('Event created successfully! It will be visible after admin approval.');
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
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Error during event creation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = user.id;
      
      // Convert file to base64 for storage
      let certificationImageBase64 = '';
      if (claimForm.certificationImage) {
        const reader = new FileReader();
        certificationImageBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(claimForm.certificationImage!);
        });
      }

      const newClaim = createNonCGPAClaim({
        studentName: user.name,
        studentEmail: user.email,
        rollNumber: user.rollNumber || '',
        department: user.department || '',
        year: user.year || '',
        reason: 'Non-CGPA Claim',
        description: claimForm.description,
        documents: certificationImageBase64 ? [certificationImageBase64] : []
      }, userId);

      toast.success('Non-CGPA claim submitted successfully! It will be reviewed by admin.');
      setShowCreateClaim(false);
      setClaimForm({
        description: '',
        certificationImage: null
      });
      fetchNonCGPAClaims();
    } catch (error) {
      console.error('Create claim error:', error);
      toast.error('Error during claim submission');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalRegistrations: registrations.length,
    upcomingEvents: registrations.filter(r => new Date(r.eventDate) > new Date()).length,
    completedEvents: registrations.filter(r => r.attended).length,
    participationRate: registrations.length > 0 ? Math.round((registrations.filter(r => r.attended).length / registrations.length) * 100) : 0
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <BookOpen className="w-4 h-4" />;
      case 'cultural': return <Trophy className="w-4 h-4" />;
      case 'sports': return <Trophy className="w-4 h-4" />;
      case 'academic': return <BookOpen className="w-4 h-4" />;
      case 'workshop': return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="ring-4 ring-white/20">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                    {user.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Welcome, {user.name}
                </h1>
                <p className="text-blue-100">{user.department} - Year {user.year}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-blue-100">Registered Events</p>
                <p className="text-3xl font-bold">{stats.totalRegistrations}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-green-100">Upcoming</p>
                <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Award className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-orange-100">Completed</p>
                <p className="text-3xl font-bold">{stats.completedEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="flex items-center p-6 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Zap className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-pink-100">Participation Rate</p>
                <p className="text-3xl font-bold">{stats.participationRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList className="bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="events" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Available Events</TabsTrigger>
              <TabsTrigger value="create-event" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Create Event</TabsTrigger>
              <TabsTrigger value="my-events" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">My Registrations</TabsTrigger>
              <TabsTrigger value="non-cgpa" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Non-CGPA Claims</TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Profile</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="events">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Available Events
                </CardTitle>
                <CardDescription>Browse and register for upcoming events</CardDescription>
                
                {/* Search and Filter */}
                <div className="flex gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200/50"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48 bg-white/50 backdrop-blur-sm border-gray-200/50">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {filteredEvents.map((event) => (
                    <Card key={event.id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/70 backdrop-blur-sm border-0">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                {getCategoryIcon(event.category)}
                              </div>
                              <h3 className="text-xl">{event.name}</h3>
                              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                                {event.category}
                              </Badge>
                              {event.createdByRole === 'student' && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  Student Event
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-4">{event.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span>{event.date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg">
                                <Clock className="w-4 h-4 text-green-600" />
                                <span>{event.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-purple-50 p-2 rounded-lg">
                                <MapPin className="w-4 h-4 text-purple-600" />
                                <span>{event.venue}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">
                                  {event.registrations || 0} / {event.capacity} registered
                                </span>
                              </div>
                              <Progress 
                                value={(event.registrations || 0) / event.capacity * 100} 
                                className="flex-1 max-w-32"
                              />
                            </div>

                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              <p>Contact: {event.contactPerson}</p>
                              <p>Email: {event.contactEmail}</p>
                            </div>
                          </div>
                          
                          <div className="ml-6">
                            {event.isRegistered ? (
                              <Button 
                                variant="outline" 
                                onClick={() => handleUnregister(event.id)}
                                disabled={isLoading}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              >
                                Unregister
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleRegister(event.id)}
                                disabled={isLoading || (event.registrations || 0) >= event.capacity}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg"
                              >
                                {(event.registrations || 0) >= event.capacity ? 'Full' : 'Register'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-event">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Event
                </CardTitle>
                <CardDescription>Propose a new event for your college community</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateEvent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="event-name">Event Name</Label>
                      <Input
                        id="event-name"
                        value={eventForm.name}
                        onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white/50 backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={eventForm.category}
                        onValueChange={(value) => setEventForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="bg-white/50 backdrop-blur-sm">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white/50 backdrop-blur-sm min-h-24"
                      placeholder="Describe your event in detail..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-venue">Venue</Label>
                      <Input
                        id="event-venue"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                        className="bg-white/50 backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Date</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-white/50 backdrop-blur-sm"
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
                        className="bg-white/50 backdrop-blur-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-capacity">Expected Capacity</Label>
                      <Input
                        id="event-capacity"
                        type="number"
                        value={eventForm.capacity}
                        onChange={(e) => setEventForm(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                        className="bg-white/50 backdrop-blur-sm"
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">Contact Person</Label>
                      <Input
                        id="contact-person"
                        value={eventForm.contactPerson}
                        onChange={(e) => setEventForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                        placeholder={user.name}
                        className="bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={eventForm.contactEmail}
                        onChange={(e) => setEventForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder={user.email}
                        className="bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Event Approval Process</h4>
                        <p className="text-sm text-blue-700">
                          Student-created events require admin approval before being published. 
                          You'll be notified once your event is reviewed. Make sure to provide 
                          complete and accurate information to speed up the approval process.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Event...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Event
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-events">
            <Card>
              <CardHeader>
                <CardTitle>My Registrations</CardTitle>
                <CardDescription>Track your registered events and participation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {registrations.map((registration) => (
                    <Card key={registration.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getCategoryIcon(registration.category)}
                              <h4 className="text-lg">{registration.eventName}</h4>
                              <Badge variant="secondary">{registration.category}</Badge>
                              {registration.attended && <Badge variant="default">Attended</Badge>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{registration.eventDate}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{registration.eventVenue}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Registered: {new Date(registration.registeredAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            {new Date(registration.eventDate) > new Date() && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUnregister(registration.eventId)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {registrations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No registrations yet. Browse available events to get started!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-cgpa">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Claim Form */}
              <div className="lg:col-span-1">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create Non-CGPA Claim
                    </CardTitle>
                    <CardDescription>Submit a non-CGPA verification request</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleCreateClaim} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="claim-description">Detailed Description</Label>
                        <Textarea
                          id="claim-description"
                          value={claimForm.description}
                          onChange={(e) => setClaimForm(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-white/50 backdrop-blur-sm min-h-32"
                          placeholder="Provide detailed explanation for your non-CGPA request..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certification-image">Upload Certification Image</Label>
                        <Input
                          id="certification-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setClaimForm(prev => ({ ...prev, certificationImage: file }));
                          }}
                          className="bg-white/50 backdrop-blur-sm"
                        />
                        {claimForm.certificationImage && (
                          <p className="text-sm text-green-600">
                            ✓ {claimForm.certificationImage.name} selected
                          </p>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg"
                        disabled={isLoading || !claimForm.description}
                      >
                        {isLoading ? 'Submitting...' : 'Submit Claim'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Claims List */}
              <div className="lg:col-span-2">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      My Non-CGPA Claims
                    </CardTitle>
                    <CardDescription>Track your submitted claims and their status</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {nonCGPAClaims.map((claim) => (
                        <Card key={claim.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                  {claim.reason}
                                </Badge>
                                <Badge 
                                  variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'}
                                  className={
                                    claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }
                                >
                                  {claim.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                  {claim.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {claim.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(claim.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg mb-3">
                              <p className="text-sm text-gray-700">{claim.description}</p>
                            </div>

                            {claim.documents && claim.documents.length > 0 && (
                              <div className="mb-3">
                                <Label className="text-sm text-gray-600 mb-2 block">Uploaded Certification:</Label>
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                  <Image className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-700">Certification image uploaded</span>
                                </div>
                              </div>
                            )}

                            {claim.adminComments && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-1">Admin Comments:</p>
                                <p className="text-sm text-blue-700">{claim.adminComments}</p>
                                {claim.reviewedAt && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Reviewed on: {new Date(claim.reviewedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {nonCGPAClaims.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No non-CGPA claims submitted yet.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Student Profile
                </CardTitle>
                <CardDescription>Your academic and personal information</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl">{user.name}</h3>
                        <p className="text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <Label className="text-sm text-gray-600">Roll Number</Label>
                        <p className="font-medium">{user.rollNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Department</Label>
                        <p className="font-medium">{user.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Year</Label>
                        <p className="font-medium">Year {user.year}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Course</Label>
                        <p className="font-medium">{user.course}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Activity Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{stats.totalRegistrations}</p>
                          <p className="text-sm text-gray-600">Total Events</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{stats.completedEvents}</p>
                          <p className="text-sm text-gray-600">Attended</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{stats.upcomingEvents}</p>
                          <p className="text-sm text-gray-600">Upcoming</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{stats.participationRate}%</p>
                          <p className="text-sm text-gray-600">Participation</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};