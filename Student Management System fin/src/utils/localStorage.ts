// Local storage utilities for offline operation
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  department?: string;
  year?: string;
  rollNumber?: string;
  course?: string;
}

export interface Event {
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
  registeredUsers?: string[];
}

export interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  studentName: string;
  studentEmail: string;
  department: string;
  year: string;
  registeredAt: string;
  attended?: boolean;
  category: string;
  eventDate: string;
  eventVenue: string;
  rollNumber?: string;
}

export interface NonCGPAClaim {
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

// Initialize default data
const initializeDefaultData = () => {
  if (!localStorage.getItem('sms_users')) {
    const defaultUsers: User[] = [
      {
        id: 'admin-1',
        email: 'admin@klu.ac.in',
        name: 'Admin User',
        role: 'admin'
      },
      {
        id: 'student-1',
        email: 'john@klu.ac.in',
        name: 'John Smith',
        role: 'student',
        department: 'Computer Science',
        year: '3',
        rollNumber: 'CS21001',
        course: 'B.Tech Computer Science'
      }
    ];
    localStorage.setItem('sms_users', JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem('sms_events')) {
    const defaultEvents: Event[] = [
      {
        id: 'event-1',
        name: 'Annual Tech Fest',
        description: 'A comprehensive technology festival featuring coding competitions, hackathons, and tech talks.',
        category: 'technical',
        venue: 'Main Auditorium',
        date: '2025-10-15',
        time: '09:00',
        capacity: 200,
        contactPerson: 'Dr. Smith',
        contactEmail: 'dr.smith@klu.ac.in',
        registrations: 45,
        status: 'upcoming',
        createdBy: 'admin-1',
        createdByName: 'Admin User',
        createdByRole: 'admin',
        approvalStatus: 'approved',
        registeredUsers: []
      },
      {
        id: 'event-2',
        name: 'Cultural Night 2025',
        description: 'An evening of music, dance, and cultural performances by students.',
        category: 'cultural',
        venue: 'College Ground',
        date: '2025-11-20',
        time: '18:00',
        capacity: 500,
        contactPerson: 'Prof. Johnson',
        contactEmail: 'prof.johnson@klu.ac.in',
        registrations: 123,
        status: 'upcoming',
        createdBy: 'admin-1',
        createdByName: 'Admin User',
        createdByRole: 'admin',
        approvalStatus: 'approved',
        registeredUsers: []
      },
      {
        id: 'event-3',
        name: 'Sports Championship',
        description: 'Inter-departmental sports competition including cricket, football, and basketball.',
        category: 'sports',
        venue: 'Sports Complex',
        date: '2025-12-05',
        time: '08:00',
        capacity: 300,
        contactPerson: 'Coach Williams',
        contactEmail: 'coach.williams@klu.ac.in',
        registrations: 89,
        status: 'upcoming',
        createdBy: 'admin-1',
        createdByName: 'Admin User',
        createdByRole: 'admin',
        approvalStatus: 'approved',
        registeredUsers: []
      }
    ];
    localStorage.setItem('sms_events', JSON.stringify(defaultEvents));
  }

  if (!localStorage.getItem('sms_registrations')) {
    localStorage.setItem('sms_registrations', JSON.stringify([]));
  }

  if (!localStorage.getItem('sms_pending_events')) {
    localStorage.setItem('sms_pending_events', JSON.stringify([]));
  }

  if (!localStorage.getItem('sms_non_cgpa_claims')) {
    localStorage.setItem('sms_non_cgpa_claims', JSON.stringify([]));
  }
};

// Data migration function to update old email domains
const migrateEmailDomains = () => {
  const users = getUsers();
  let updated = false;
  
  const updatedUsers = users.map(user => {
    if (user.email.endsWith('@college.edu')) {
      updated = true;
      return {
        ...user,
        email: user.email.replace('@college.edu', '@klu.ac.in')
      };
    }
    return user;
  });
  
  if (updated) {
    saveUsers(updatedUsers);
  }
  
  // Also update events contact emails
  const events = getEvents();
  let eventsUpdated = false;
  
  const updatedEvents = events.map(event => {
    if (event.contactEmail.endsWith('@college.edu')) {
      eventsUpdated = true;
      return {
        ...event,
        contactEmail: event.contactEmail.replace('@college.edu', '@klu.ac.in')
      };
    }
    return event;
  });
  
  if (eventsUpdated) {
    saveEvents(updatedEvents);
  }
  
  // Update registrations student emails
  const registrations = getRegistrations();
  let registrationsUpdated = false;
  
  const updatedRegistrations = registrations.map(registration => {
    if (registration.studentEmail.endsWith('@college.edu')) {
      registrationsUpdated = true;
      return {
        ...registration,
        studentEmail: registration.studentEmail.replace('@college.edu', '@klu.ac.in')
      };
    }
    return registration;
  });
  
  if (registrationsUpdated) {
    saveRegistrations(updatedRegistrations);
  }
};

// User management
export const getUsers = (): User[] => {
  return JSON.parse(localStorage.getItem('sms_users') || '[]');
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem('sms_users', JSON.stringify(users));
};

export const authenticateUser = (email: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  // Simple password check - in real app this would be hashed
  if (user && password.length > 0) {
    return user;
  }
  return null;
};

export const registerUser = (userData: Omit<User, 'id'>): User => {
  const users = getUsers();
  const newUser: User = {
    ...userData,
    id: `user-${Date.now()}`
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// Event management
export const getEvents = (): Event[] => {
  return JSON.parse(localStorage.getItem('sms_events') || '[]');
};

export const saveEvents = (events: Event[]): void => {
  localStorage.setItem('sms_events', JSON.stringify(events));
};

export const getPendingEvents = (): Event[] => {
  return JSON.parse(localStorage.getItem('sms_pending_events') || '[]');
};

export const savePendingEvents = (events: Event[]): void => {
  localStorage.setItem('sms_pending_events', JSON.stringify(events));
};

export const createEvent = (eventData: Omit<Event, 'id' | 'registrations' | 'registeredUsers'>, userId: string): Event => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  
  const newEvent: Event = {
    ...eventData,
    id: `event-${Date.now()}`,
    registrations: 0,
    registeredUsers: [],
    createdBy: userId,
    createdByName: user?.name || 'Unknown',
    createdByRole: user?.role || 'student',
    approvalStatus: user?.role === 'admin' ? 'approved' : 'pending'
  };

  if (user?.role === 'admin') {
    const events = getEvents();
    events.push(newEvent);
    saveEvents(events);
  } else {
    const pendingEvents = getPendingEvents();
    pendingEvents.push(newEvent);
    savePendingEvents(pendingEvents);
  }

  return newEvent;
};

export const approveEvent = (eventId: string, approved: boolean): boolean => {
  const pendingEvents = getPendingEvents();
  const eventIndex = pendingEvents.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) return false;
  
  const event = pendingEvents[eventIndex];
  
  if (approved) {
    event.approvalStatus = 'approved';
    const events = getEvents();
    events.push(event);
    saveEvents(events);
  } else {
    event.approvalStatus = 'rejected';
  }
  
  pendingEvents.splice(eventIndex, 1);
  savePendingEvents(pendingEvents);
  
  return true;
};

export const deleteEvent = (eventId: string): boolean => {
  // Delete from approved events
  const events = getEvents();
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex !== -1) {
    events.splice(eventIndex, 1);
    saveEvents(events);
    
    // Also remove related registrations
    const registrations = getRegistrations();
    const updatedRegistrations = registrations.filter(r => r.eventId !== eventId);
    saveRegistrations(updatedRegistrations);
    
    return true;
  }
  
  // Delete from pending events
  const pendingEvents = getPendingEvents();
  const pendingIndex = pendingEvents.findIndex(e => e.id === eventId);
  
  if (pendingIndex !== -1) {
    pendingEvents.splice(pendingIndex, 1);
    savePendingEvents(pendingEvents);
    return true;
  }
  
  return false;
};

// Registration management
export const getRegistrations = (): Registration[] => {
  return JSON.parse(localStorage.getItem('sms_registrations') || '[]');
};

export const saveRegistrations = (registrations: Registration[]): void => {
  localStorage.setItem('sms_registrations', JSON.stringify(registrations));
};

export const registerForEvent = (eventId: string, userId: string): boolean | string => {
  const events = getEvents();
  const users = getUsers();
  
  const event = events.find(e => e.id === eventId);
  const user = users.find(u => u.id === userId);
  
  if (!event) {
    return 'Event not found';
  }
  
  if (!user) {
    return 'User not found';
  }
  
  if (user.role === 'student' && !isValidCollegeEmail(user.email)) {
    return 'Students must have a valid college email (@klu.ac.in) to register for events';
  }
  
  if (event.registrations >= event.capacity) {
    return 'Event is at full capacity';
  }
  
  // Check if already registered
  if (event.registeredUsers?.includes(userId)) {
    return 'Already registered for this event';
  }
  
  // Create registration
  const registration: Registration = {
    id: `reg-${Date.now()}`,
    eventId: event.id,
    eventName: event.name,
    studentName: user.name,
    studentEmail: user.email,
    department: user.department || '',
    year: user.year || '',
    registeredAt: new Date().toISOString(),
    category: event.category,
    eventDate: event.date,
    eventVenue: event.venue,
    rollNumber: user.rollNumber || ''
  };
  
  const registrations = getRegistrations();
  registrations.push(registration);
  saveRegistrations(registrations);
  
  // Update event registration count
  event.registrations += 1;
  event.registeredUsers = event.registeredUsers || [];
  event.registeredUsers.push(userId);
  saveEvents(events);
  
  return true;
};

export const unregisterFromEvent = (eventId: string, userId: string): boolean | string => {
  const registrations = getRegistrations();
  const events = getEvents();
  const user = getUsers().find(u => u.id === userId);
  
  if (!user) return 'User not found';
  
  const regIndex = registrations.findIndex(r => r.eventId === eventId && r.studentEmail === user.email);
  
  if (regIndex === -1) return 'Registration not found';
  
  registrations.splice(regIndex, 1);
  saveRegistrations(registrations);
  
  // Update event registration count
  const event = events.find(e => e.id === eventId);
  if (event) {
    event.registrations = Math.max(0, event.registrations - 1);
    event.registeredUsers = event.registeredUsers?.filter(id => id !== userId) || [];
    saveEvents(events);
  }
  
  return true;
};

export const updateAttendance = (registrationId: string, attended: boolean): boolean => {
  const registrations = getRegistrations();
  const registration = registrations.find(r => r.id === registrationId);
  
  if (!registration) return false;
  
  registration.attended = attended;
  saveRegistrations(registrations);
  
  return true;
};

export const getUserRegistrations = (userId: string): Registration[] => {
  const registrations = getRegistrations();
  const user = getUsers().find(u => u.id === userId);
  
  if (!user) return [];
  
  return registrations.filter(r => r.studentEmail === user.email);
};

export const getEventsWithRegistrationStatus = (userId: string): Event[] => {
  const events = getEvents();
  const user = getUsers().find(u => u.id === userId);
  
  if (!user) return events;
  
  return events.map(event => ({
    ...event,
    isRegistered: event.registeredUsers?.includes(userId) || false
  }));
};

// Non-CGPA Claims management
export const getNonCGPAClaims = (): NonCGPAClaim[] => {
  return JSON.parse(localStorage.getItem('sms_non_cgpa_claims') || '[]');
};

export const saveNonCGPAClaims = (claims: NonCGPAClaim[]): void => {
  localStorage.setItem('sms_non_cgpa_claims', JSON.stringify(claims));
};

export const createNonCGPAClaim = (claimData: Omit<NonCGPAClaim, 'id' | 'status' | 'createdAt'>, userId: string): NonCGPAClaim => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) throw new Error('User not found');
  
  const newClaim: NonCGPAClaim = {
    ...claimData,
    id: `claim-${Date.now()}`,
    studentId: userId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  const claims = getNonCGPAClaims();
  claims.push(newClaim);
  saveNonCGPAClaims(claims);
  
  return newClaim;
};

export const reviewNonCGPAClaim = (claimId: string, status: 'approved' | 'rejected', adminId: string, comments?: string): boolean => {
  const claims = getNonCGPAClaims();
  const claim = claims.find(c => c.id === claimId);
  
  if (!claim) return false;
  
  claim.status = status;
  claim.reviewedAt = new Date().toISOString();
  claim.reviewedBy = adminId;
  claim.adminComments = comments;
  
  saveNonCGPAClaims(claims);
  return true;
};

export const getUserNonCGPAClaims = (userId: string): NonCGPAClaim[] => {
  const claims = getNonCGPAClaims();
  return claims.filter(c => c.studentId === userId);
};

export const getPendingNonCGPAClaims = (): NonCGPAClaim[] => {
  const claims = getNonCGPAClaims();
  return claims.filter(c => c.status === 'pending');
};

// Enhanced search functions
export const searchStudents = (query: string, filterBy?: { department?: string; year?: string }): User[] => {
  const users = getUsers().filter(u => u.role === 'student');
  
  let filtered = users;
  
  if (query) {
    const searchLower = query.toLowerCase();
    filtered = filtered.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.rollNumber?.toLowerCase().includes(searchLower) ||
      user.course?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }
  
  if (filterBy?.department) {
    filtered = filtered.filter(user => user.department === filterBy.department);
  }
  
  if (filterBy?.year) {
    filtered = filtered.filter(user => user.year === filterBy.year);
  }
  
  return filtered;
};

export const getStudentParticipationStats = (rollNumber: string): {
  student: User | null;
  registrations: Registration[];
  totalEvents: number;
  attendedEvents: number;
  upcomingEvents: number;
} => {
  const users = getUsers();
  const student = users.find(u => u.rollNumber === rollNumber && u.role === 'student');
  
  if (!student) {
    return {
      student: null,
      registrations: [],
      totalEvents: 0,
      attendedEvents: 0,
      upcomingEvents: 0
    };
  }
  
  const registrations = getRegistrations().filter(r => r.studentEmail === student.email);
  const attendedEvents = registrations.filter(r => r.attended === true).length;
  const upcomingEvents = registrations.filter(r => {
    const eventDate = new Date(r.eventDate);
    return eventDate > new Date() && !r.attended;
  }).length;
  
  return {
    student,
    registrations,
    totalEvents: registrations.length,
    attendedEvents,
    upcomingEvents
  };
};

// Export functionality
export const exportStudentData = (): string => {
  const users = getUsers().filter(u => u.role === 'student');
  const registrations = getRegistrations();
  
  const csvHeaders = ['Name', 'Roll Number', 'Email', 'Department', 'Year', 'Course', 'Total Events', 'Attended Events'];
  const csvRows = users.map(user => {
    const userRegistrations = registrations.filter(r => r.studentEmail === user.email);
    const attendedEvents = userRegistrations.filter(r => r.attended === true).length;
    
    return [
      user.name,
      user.rollNumber || '',
      user.email,
      user.department || '',
      user.year || '',
      user.course || '',
      userRegistrations.length,
      attendedEvents
    ].join(',');
  });
  
  return [csvHeaders.join(','), ...csvRows].join('\n');
};

// Validate college email
export const isValidCollegeEmail = (email: string): boolean => {
  return email.endsWith('@klu.ac.in');
};

// Initialize data on first load
initializeDefaultData();
migrateEmailDomains();