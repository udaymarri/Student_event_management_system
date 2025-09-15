import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase client with service role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Supabase client for auth operations
const supabaseAuth = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Helper function to verify user authentication
async function verifyAuth(c: any) {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.split(' ')[1];
  
  if (!accessToken) {
    console.error('No access token provided in request');
    return { user: null, error: 'No access token provided' };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) {
      console.error('Invalid access token:', error);
      return { user: null, error: 'Invalid access token' };
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      console.error('User profile not found for user:', user.id);
      return { user: null, error: 'User profile not found' };
    }
    
    return { user: { ...user, ...userProfile }, error: null };
  } catch (error) {
    console.error('Error in verifyAuth:', error);
    return { user: null, error: 'Authentication verification failed' };
  }
}

// Health check endpoint
app.get("/make-server-09b1ed99/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-09b1ed99/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, department, year } = body;

    console.log('Signup attempt for:', email);

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, department, year },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      console.error('No user returned from Supabase');
      return c.json({ error: 'User creation failed' }, 500);
    }

    // Store user profile in KV store
    const userProfile = {
      id: data.user.id,
      email,
      name,
      role,
      department: role === 'student' ? department : undefined,
      year: role === 'student' ? year : undefined,
      createdAt: new Date().toISOString()
    };

    await kv.set(`user:${data.user.id}`, userProfile);

    // Generate access token
    const { data: sessionData } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    return c.json({
      user: userProfile,
      access_token: sessionData?.session?.access_token
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

app.post("/make-server-09b1ed99/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    console.log('Login attempt for:', email);

    // Sign in with Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    if (!data.session?.access_token) {
      console.error('No access token in login response');
      return c.json({ error: 'Authentication failed' }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${data.user.id}`);
    if (!userProfile) {
      console.error('User profile not found for:', data.user.id);
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json({
      user: userProfile,
      access_token: data.session.access_token
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error during login' }, 500);
  }
});

// Event management endpoints
app.get("/make-server-09b1ed99/events", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const events = await kv.getByPrefix('event:');
    const formattedEvents = events.map((event: any) => ({
      ...event,
      registrations: 0 // Will be calculated below
    }));

    // Get registration counts for each event
    for (const event of formattedEvents) {
      const registrations = await kv.getByPrefix(`registration:${event.id}:`);
      event.registrations = registrations.length;
    }

    return c.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

app.get("/make-server-09b1ed99/events/available", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const events = await kv.getByPrefix('event:');
    const userRegistrations = await kv.getByPrefix(`registration:user:${user.id}:`);
    const registeredEventIds = userRegistrations.map((reg: any) => reg.eventId);

    // Filter only approved events for students, all events for admins
    const availableEvents = events.filter((event: any) => 
      user.role === 'admin' || event.approvalStatus === 'approved'
    );

    const formattedEvents = await Promise.all(
      availableEvents.map(async (event: any) => {
        const registrations = await kv.getByPrefix(`registration:${event.id}:`);
        return {
          ...event,
          registrations: registrations.length,
          isRegistered: registeredEventIds.includes(event.id)
        };
      })
    );

    return c.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching available events:', error);
    return c.json({ error: 'Failed to fetch available events' }, 500);
  }
});

app.post("/make-server-09b1ed99/events", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      console.error('Auth error in event creation:', error);
      return c.json({ error }, 401);
    }

    console.log('Creating event for user:', user.id, 'role:', user.role);
    
    const body = await c.req.json();
    console.log('Event creation request body:', body);

    // Validate required fields
    if (!body.name || !body.description || !body.category || !body.venue || !body.date || !body.time || !body.capacity) {
      console.error('Missing required fields in event creation', {
        name: !!body.name,
        description: !!body.description,
        category: !!body.category,
        venue: !!body.venue,
        date: !!body.date,
        time: !!body.time,
        capacity: !!body.capacity
      });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event = {
      id: eventId,
      ...body,
      createdBy: user.id,
      createdByName: user.name,
      createdByRole: user.role,
      createdAt: new Date().toISOString(),
      status: user.role === 'admin' ? 'upcoming' : 'pending', // Students create pending events
      approvalStatus: user.role === 'admin' ? 'approved' : 'pending'
    };

    console.log('Saving event to KV store:', event);
    await kv.set(`event:${eventId}`, event);

    console.log('Event created successfully:', eventId, 'by', user.role);
    return c.json({ event });
  } catch (error) {
    console.error('Error creating event - details:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    return c.json({ error: `Failed to create event: ${error.message}` }, 500);
  }
});

// Event approval endpoint for admins
app.put("/make-server-09b1ed99/events/:id/approve", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const eventId = c.req.param('id');
    const { approved } = await c.req.json();
    
    const event = await kv.get(`event:${eventId}`);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const updatedEvent = {
      ...event,
      approvalStatus: approved ? 'approved' : 'rejected',
      status: approved ? 'upcoming' : 'rejected',
      approvedBy: user.id,
      approvedAt: new Date().toISOString()
    };

    await kv.set(`event:${eventId}`, updatedEvent);

    console.log('Event approval updated:', eventId, 'approved:', approved);
    return c.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating event approval:', error);
    return c.json({ error: 'Failed to update event approval' }, 500);
  }
});

// Get pending events for admin approval
app.get("/make-server-09b1ed99/events/pending", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const events = await kv.getByPrefix('event:');
    const pendingEvents = events.filter((event: any) => event.approvalStatus === 'pending');

    return c.json({ events: pendingEvents });
  } catch (error) {
    console.error('Error fetching pending events:', error);
    return c.json({ error: 'Failed to fetch pending events' }, 500);
  }
});

app.delete("/make-server-09b1ed99/events/:id", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const eventId = c.req.param('id');
    const event = await kv.get(`event:${eventId}`);
    
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Delete event and all related registrations
    await kv.del(`event:${eventId}`);
    const registrations = await kv.getByPrefix(`registration:${eventId}:`);
    for (const reg of registrations) {
      await kv.del(`registration:${eventId}:${reg.userId}`);
      await kv.del(`registration:user:${reg.userId}:${eventId}`);
    }

    console.log('Event deleted:', eventId);
    return c.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

// Registration endpoints
app.post("/make-server-09b1ed99/events/:id/register", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const eventId = c.req.param('id');
    const event = await kv.get(`event:${eventId}`);
    
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Check if already registered
    const existingRegistration = await kv.get(`registration:${eventId}:${user.id}`);
    if (existingRegistration) {
      return c.json({ error: 'Already registered for this event' }, 400);
    }

    // Check capacity
    const registrations = await kv.getByPrefix(`registration:${eventId}:`);
    if (registrations.length >= event.capacity) {
      return c.json({ error: 'Event is full' }, 400);
    }

    // Create registration
    const registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      eventName: event.name,
      eventDate: event.date,
      eventVenue: event.venue,
      userId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      department: user.department,
      year: user.year,
      category: event.category,
      registeredAt: new Date().toISOString(),
      attended: false
    };

    await kv.set(`registration:${eventId}:${user.id}`, registration);
    await kv.set(`registration:user:${user.id}:${eventId}`, registration);

    console.log('Registration created for user:', user.id, 'event:', eventId);
    return c.json({ registration });
  } catch (error) {
    console.error('Error creating registration:', error);
    return c.json({ error: 'Failed to register for event' }, 500);
  }
});

app.delete("/make-server-09b1ed99/events/:id/unregister", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const eventId = c.req.param('id');
    const registration = await kv.get(`registration:${eventId}:${user.id}`);
    
    if (!registration) {
      return c.json({ error: 'Registration not found' }, 404);
    }

    await kv.del(`registration:${eventId}:${user.id}`);
    await kv.del(`registration:user:${user.id}:${eventId}`);

    console.log('Registration deleted for user:', user.id, 'event:', eventId);
    return c.json({ message: 'Unregistered successfully' });
  } catch (error) {
    console.error('Error unregistering:', error);
    return c.json({ error: 'Failed to unregister' }, 500);
  }
});

app.get("/make-server-09b1ed99/registrations", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const allRegistrations = await kv.getByPrefix('registration:');
    const registrations = allRegistrations.filter((reg: any) => 
      reg.id && reg.id.startsWith('reg_')
    );

    return c.json({ registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return c.json({ error: 'Failed to fetch registrations' }, 500);
  }
});

app.get("/make-server-09b1ed99/registrations/my", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const registrations = await kv.getByPrefix(`registration:user:${user.id}:`);
    return c.json({ registrations });
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    return c.json({ error: 'Failed to fetch your registrations' }, 500);
  }
});

app.put("/make-server-09b1ed99/registrations/:id/attendance", async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    if (user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const registrationId = c.req.param('id');
    const { attended } = await c.req.json();

    // Find the registration
    const allRegistrations = await kv.getByPrefix('registration:');
    const registration = allRegistrations.find((reg: any) => reg.id === registrationId);
    
    if (!registration) {
      return c.json({ error: 'Registration not found' }, 404);
    }

    // Update attendance
    const updatedRegistration = { ...registration, attended };
    await kv.set(`registration:${registration.eventId}:${registration.userId}`, updatedRegistration);
    await kv.set(`registration:user:${registration.userId}:${registration.eventId}`, updatedRegistration);

    console.log('Attendance updated for registration:', registrationId, 'attended:', attended);
    return c.json({ registration: updatedRegistration });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return c.json({ error: 'Failed to update attendance' }, 500);
  }
});

// Clear all data endpoint for testing
app.delete("/make-server-09b1ed99/clear-data", async (c) => {
  try {
    console.log('Clearing all data...');
    
    // Get all events and registrations
    const events = await kv.getByPrefix('event:');
    const registrations = await kv.getByPrefix('registration:');
    
    // Delete all events
    for (const event of events) {
      await kv.del(`event:${event.id}`);
    }
    
    // Delete all registrations
    for (const reg of registrations) {
      // Try to determine the key format and delete appropriately
      if (reg.id && reg.eventId && reg.userId) {
        await kv.del(`registration:${reg.eventId}:${reg.userId}`);
        await kv.del(`registration:user:${reg.userId}:${reg.eventId}`);
      }
    }
    
    console.log('All data cleared successfully');
    return c.json({ message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return c.json({ error: 'Failed to clear data' }, 500);
  }
});

// Seed data endpoint for demo purposes
app.post("/make-server-09b1ed99/seed", async (c) => {
  try {
    const sampleEvents = [
      {
        id: 'event_tech_symposium_2025',
        name: 'Annual Tech Symposium 2025',
        description: 'A comprehensive technology conference featuring industry experts, workshops on emerging technologies, and networking opportunities for students and professionals.',
        category: 'technical',
        venue: 'Main Auditorium',
        date: '2025-03-15',
        time: '09:00',
        capacity: 150,
        contactPerson: 'Dr. Sarah Johnson',
        contactEmail: 'sarah.johnson@college.edu',
        createdBy: 'admin_seed',
        createdByName: 'System Admin',
        createdByRole: 'admin',
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        approvalStatus: 'approved'
      },
      {
        id: 'event_cultural_fest_2025',
        name: 'Spring Cultural Festival',
        description: 'Celebrate diversity and talent with performances, art exhibitions, food stalls, and cultural competitions. Students from all departments are welcome to participate.',
        category: 'cultural',
        venue: 'College Grounds',
        date: '2025-04-20',
        time: '10:00',
        capacity: 300,
        contactPerson: 'Prof. Michael Chen',
        contactEmail: 'michael.chen@college.edu',
        createdBy: 'admin_seed',
        createdByName: 'System Admin',
        createdByRole: 'admin',
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        approvalStatus: 'approved'
      },
      {
        id: 'event_sports_tournament',
        name: 'Inter-Department Sports Tournament',
        description: 'Annual sports competition featuring cricket, football, basketball, and track events. Teams representing different departments will compete for the championship trophy.',
        category: 'sports',
        venue: 'Sports Complex',
        date: '2025-05-10',
        time: '08:00',
        capacity: 200,
        contactPerson: 'Coach David Wilson',
        contactEmail: 'david.wilson@college.edu',
        createdBy: 'admin_seed',
        createdByName: 'System Admin',
        createdByRole: 'admin',
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        approvalStatus: 'approved'
      },
      {
        id: 'event_ai_workshop',
        name: 'AI & Machine Learning Workshop',
        description: 'Hands-on workshop covering the fundamentals of artificial intelligence and machine learning. Participants will work on real-world projects using Python and popular ML libraries.',
        category: 'workshop',
        venue: 'Computer Lab 1',
        date: '2025-03-25',
        time: '14:00',
        capacity: 40,
        contactPerson: 'Dr. Emily Rodriguez',
        contactEmail: 'emily.rodriguez@college.edu',
        createdBy: 'admin_seed',
        createdByName: 'System Admin',
        createdByRole: 'admin',
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        approvalStatus: 'approved'
      },
      {
        id: 'event_career_fair',
        name: 'Career Fair 2025',
        description: 'Meet recruiters from top companies, attend career guidance sessions, and explore internship and job opportunities across various industries.',
        category: 'academic',
        venue: 'Exhibition Hall',
        date: '2025-04-05',
        time: '11:00',
        capacity: 500,
        contactPerson: 'Ms. Lisa Thompson',
        contactEmail: 'lisa.thompson@college.edu',
        createdBy: 'admin_seed',
        createdByName: 'System Admin',
        createdByRole: 'admin',
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        approvalStatus: 'approved'
      }
    ];

    // Check if events already exist
    const existingEvents = await kv.getByPrefix('event:');
    if (existingEvents.length === 0) {
      for (const event of sampleEvents) {
        await kv.set(`event:${event.id}`, event);
      }
      console.log('Sample events seeded successfully');
    }

    return c.json({ message: 'Sample data seeded successfully', events: sampleEvents.length });
  } catch (error) {
    console.error('Error seeding data:', error);
    return c.json({ error: 'Failed to seed data' }, 500);
  }
});

// Initialize sample events on server start
(async () => {
  try {
    const existingEvents = await kv.getByPrefix('event:');
    if (existingEvents.length === 0) {
      console.log('No events found, seeding sample data...');
      const sampleEvents = [
        {
          id: 'event_tech_symposium_2025',
          name: 'Annual Tech Symposium 2025',
          description: 'A comprehensive technology conference featuring industry experts, workshops on emerging technologies, and networking opportunities for students and professionals.',
          category: 'technical',
          venue: 'Main Auditorium',
          date: '2025-03-15',
          time: '09:00',
          capacity: 150,
          contactPerson: 'Dr. Sarah Johnson',
          contactEmail: 'sarah.johnson@college.edu',
          createdBy: 'admin_seed',
          createdByName: 'System Admin',
          createdByRole: 'admin',
          createdAt: new Date().toISOString(),
          status: 'upcoming',
          approvalStatus: 'approved'
        },
        {
          id: 'event_cultural_fest_2025',
          name: 'Spring Cultural Festival',
          description: 'Celebrate diversity and talent with performances, art exhibitions, food stalls, and cultural competitions. Students from all departments are welcome to participate.',
          category: 'cultural',
          venue: 'College Grounds',
          date: '2025-04-20',
          time: '10:00',
          capacity: 300,
          contactPerson: 'Prof. Michael Chen',
          contactEmail: 'michael.chen@college.edu',
          createdBy: 'admin_seed',
          createdByName: 'System Admin',
          createdByRole: 'admin',
          createdAt: new Date().toISOString(),
          status: 'upcoming',
          approvalStatus: 'approved'
        },
        {
          id: 'event_sports_tournament',
          name: 'Inter-Department Sports Tournament',
          description: 'Annual sports competition featuring cricket, football, basketball, and track events. Teams representing different departments will compete for the championship trophy.',
          category: 'sports',
          venue: 'Sports Complex',
          date: '2025-05-10',
          time: '08:00',
          capacity: 200,
          contactPerson: 'Coach David Wilson',
          contactEmail: 'david.wilson@college.edu',
          createdBy: 'admin_seed',
          createdByName: 'System Admin',
          createdByRole: 'admin',
          createdAt: new Date().toISOString(),
          status: 'upcoming',
          approvalStatus: 'approved'
        },
        {
          id: 'event_ai_workshop',
          name: 'AI & Machine Learning Workshop',
          description: 'Hands-on workshop covering the fundamentals of artificial intelligence and machine learning. Participants will work on real-world projects using Python and popular ML libraries.',
          category: 'workshop',
          venue: 'Computer Lab 1',
          date: '2025-03-25',
          time: '14:00',
          capacity: 40,
          contactPerson: 'Dr. Emily Rodriguez',
          contactEmail: 'emily.rodriguez@college.edu',
          createdBy: 'admin_seed',
          createdByName: 'System Admin',
          createdByRole: 'admin',
          createdAt: new Date().toISOString(),
          status: 'upcoming',
          approvalStatus: 'approved'
        },
        {
          id: 'event_career_fair',
          name: 'Career Fair 2025',
          description: 'Meet recruiters from top companies, attend career guidance sessions, and explore internship and job opportunities across various industries.',
          category: 'academic',
          venue: 'Exhibition Hall',
          date: '2025-04-05',
          time: '11:00',
          capacity: 500,
          contactPerson: 'Ms. Lisa Thompson',
          contactEmail: 'lisa.thompson@college.edu',
          createdBy: 'admin_seed',
          createdByName: 'System Admin',
          createdByRole: 'admin',
          createdAt: new Date().toISOString(),
          status: 'upcoming',
          approvalStatus: 'approved'
        }
      ];

      for (const event of sampleEvents) {
        await kv.set(`event:${event.id}`, event);
      }
      console.log('Sample events seeded on startup');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
})();

Deno.serve(app.fetch);