const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const path = require('path');
const bcrypt = require('bcrypt');  // To securely store and check passwords
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 8000;

// Middleware
app.use(express.json());  // Add this line to parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection URL
const url = 'mongodb://localhost:27017';
const dbName = 'local_services_marketplace';
let db;

// Create an async function to connect to MongoDB
async function connectToMongoDB() {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        db = client.db(dbName);
        console.log('Connected to MongoDB');
        
        // Start the server only after MongoDB connection is established
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1); // Exit the process with failure
    }
}
// Call the function to connect to MongoDB
connectToMongoDB();

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like Yahoo, Outlook, etc.
    auth: {
        user: 'ankuryadav89666@gmail.com',  // Your email address
        pass: 'yzvg kiaj cool vgze'    // Your email password or app-specific password
    }
});


// Serve the login page as the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve the actual home page
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Serve services page
app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

// Serve about page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// Serve contact page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// app.get('/search-results', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'search-results.html'));
// });

// Serve the service form page for service providers
app.get('/service-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service_form.html'));
});

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, email, password, confirm_password, role, address, phone, country, location, service_type, experience } = req.body;

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    try {
        // Check if the email already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already exists');
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`Hashed Password: ${hashedPassword}`); 

        // Create the user object
        const user = {
            username,
            email,
            password: hashedPassword,
            role,
            hasSubmittedService: role === 'service_provider' ? false : undefined, 
            address: role === 'customer' ? address : undefined,
            phone: role === 'customer' ? phone : undefined,
            country: role === 'service_provider' ? country : undefined,
            location: role === 'service_provider' ? location : undefined,
            service_type: role === 'service_provider' ? service_type : undefined,
            experience: role === 'service_provider' ? experience : undefined,
        };

        // Insert the new user
        const result = await db.collection('users').insertOne(user);
        console.log('User inserted:', result);

        // Redirect to login page after successful signup
        res.redirect('/');
    } catch (err) {
        console.error('Error occurred while signing up:', err);
        res.status(500).send('Error occurred while signing up');
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid password');
        }

        // Redirect based on role and submission status
        if (user.role === 'service_provider') {
            if (!user.hasSubmittedService) {
                // Redirect to service form if not submitted
                return res.redirect('/service-form');
            }
            // Redirect to home page if already submitted
            return res.redirect('/home');
        }

        // Store email in localStorage and redirect based on role and submission status
        res.send(`
            <script>
                localStorage.setItem('userEmail', '${user.email}');
                window.location.href = '/home';
            </script>
        `);
    } catch (err) {
        console.error('Error occurred during login:', err);
        res.status(500).send('Error occurred during login');
    }
});

// Server-side route to handle contact form submission
app.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Basic validation (you can add more validation logic)
    if (!name || !email || !message) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // 1. Send acknowledgment email to the user
        const userMailOptions = {
            from: 'ankuryadav89666@gmail.com',  // Your platform's email
            to: email,  // The user's email
            subject: 'Contact Form Submission Confirmation',
            text: `Hello ${name},\n\nThank you for reaching out to us. We have received your message:\n"${message}"\n\nWe will get back to you shortly!\n\nBest regards,\nLocal Services Team`
        };

        // Send acknowledgment email
        await transporter.sendMail(userMailOptions);

        // 2. Forward the user's message to the support team
        const supportMailOptions = {
            from: email,
            to: 'ankuryadav89666@gmail.com.com',  // Support team email
            subject: `New Contact Form Message from ${name}`,
            text: `You have received a new message from ${name} (${email}):\n\n"${message}"`
        };

        // Send the message to the support team
        await transporter.sendMail(supportMailOptions);

        // Send a response back to the frontend (for AJAX success handling)
        res.status(200).send('Your message has been sent successfully!');
    } catch (error) {
        console.error('Error handling contact form submission:', error);
        res.status(500).send('Server error. Please try again later.');
    }
});


// Service Submission Route
app.post('/submit-service', async (req, res) => {
    const { name, category, location, priceRange, description, email } = req.body;

    try {
        // Find the user by email
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }

        // Insert the service into the services collection, including the service provider's email
        const service = {
            name,
            category,
            location,
            priceRange,
            description,
            rating: 0, // Initialize rating
            serviceProviderEmail: email, // Add the service provider's email
        };

        await db.collection('services').insertOne(service);

        // Update the user's hasSubmittedService status
        await db.collection('users').updateOne(
            { email },
            { $set: { hasSubmittedService: true } }
        );

        // Send an email to the service provider with the form details
        const mailOptions = {
            from: 'ankuryadav89666@gmail.com',
            to: email,  // The service provider's email address
            subject: 'Service Form Submission Confirmation',
            text: `
                Hi ${user.username},

                Thank you for submitting your service information. Here are the details you entered:

                - Service Name: ${name}
                - Category: ${category}
                - Location: ${location}
                - Price Range: ${priceRange}
                - Description: ${description}

                Best regards,
                Local Services Marketplace
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
                return res.status(500).send('Failed to send confirmation email');
            }
            console.log('Email sent: ' + info.response);
        });

        // Redirect to home page after submission
        res.redirect('/home');
    } catch (err) {
        console.error('Error occurred while submitting service:', err);
        res.status(500).send('Error occurred while submitting service');
    }
});


// Handle search request
app.get('/services/search', async (req, res) => {
    const { query } = req.query;
    
    try {
        const services = await db.collection('services').find({
            name: { $regex: query, $options: 'i' }  // Case-insensitive search
        }).toArray();
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).send('Server error');
    }
});

// Handle filter request
app.get('/services/filter', async (req, res) => {
    const { category, location, priceRange, rating } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (location) filters.location = location;
    if (priceRange) filters.priceRange = priceRange;
    if (rating) filters.rating = { $gte: parseInt(rating) };

    try {
        const services = await db.collection('services').find(filters).toArray();
        res.json(services);
    } catch (err) {
        console.error('Error fetching filtered services:', err);
        res.status(500).send('Server error');
    }
});

// Handle search request
app.get('/services/search', async (req, res) => {
    const { query } = req.query;
    
    try {
        // Search for services matching the query in MongoDB
        const services = await db.collection('services').find({
            name: { $regex: query, $options: 'i' }  // Case-insensitive search
        }).toArray();
        
        // Return search results as JSON
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).send('Server error');
    }
});

// Serve the booking page
app.get('/booking', async (req, res) => {
    const { serviceId } = req.query;
    console.log('Received serviceId:', serviceId);
    
    try {
        // Check if the serviceId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            return res.status(400).send('Invalid service ID');
        }
        
        // Find the service by ID
        const service = await db.collection('services').findOne({ _id: new mongoose.Types.ObjectId(serviceId) });
        if (!service) {
            return res.status(404).send('Service not found');
        }
        
        // Serve the booking page
        res.sendFile(path.join(__dirname, 'public', 'booking.html'));
    } catch (err) {
        console.error('Error loading booking page:', err);
        res.status(500).send('Server error');
    }
});


// Fetch a service by ID
app.get('/services/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    
    try {
        const service = await db.collection('services').findOne({ _id: new mongoose.Types.ObjectId(serviceId) });
        if (!service) {
            return res.status(404).send('Service not found');
        }
        res.json(service);
    } catch (err) {
        console.error('Error fetching service:', err);
        res.status(500).send('Server error');
    }
});

app.post('/submit-booking', async (req, res) => {
    const { serviceId, date, time, notes, email } = req.body;
    console.log('Received email:', email);

    // Log incoming data for debugging
    console.log('Booking data:', { serviceId, date, time, notes, email });

    const bookingId = uuidv4();

    // Check if email is provided
    if (!email) {
        return res.status(400).send('Customer email is required to send a confirmation.');
    }

    // Check if serviceId is valid
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).send('Invalid service ID');
    }

    try {
        // Fetch the service by ID
        const service = await db.collection('services').findOne({ _id: new mongoose.Types.ObjectId(serviceId) });
        if (!service) {
            return res.status(404).send('Service not found');
        }

        // Extract service details including service provider's email
        const serviceName = service.category;  // Assuming 'category' is the service name
        const serviceProviderEmail = service.serviceProviderEmail;  // Get service provider's email

        // Insert booking into bookings collection with service provider email
        const booking = {
            bookingId,  // Storing generated bookingId
            serviceId: new mongoose.Types.ObjectId(serviceId),
            date,
            time,
            notes,
            email,  // Customer's email
            serviceProviderEmail,  // Add service provider's email to the booking
            status: 'pending', // Initialize status as pending
            createdAt: new Date(),
        };
        
        console.log('Booking object to be inserted:', booking);
        await db.collection('bookings').insertOne(booking);

        // Set up email options for customer confirmation
        const mailOptions = {
            from: 'ankuryadav89666@gmail.com',
            to: email,  // Customer's email
            subject: 'Booking Confirmation',
            text: `Dear customer,

            Your booking has been confirmed for the following service:
            - Service: ${serviceName}
            - Date: ${date}
            - Time: ${time}

            Thank you for using our platform!

            Best regards,
            Local Services Marketplace`
        };

        // Send the confirmation email to the customer
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
                return res.status(500).send('Failed to send booking confirmation email');
            }

            console.log('Email sent: ' + info.response);

            // Send response to the client
            res.send('Booking successful! A confirmation email has been sent.');
        });

    } catch (err) {
        console.error('Error occurred during booking:', err);
        res.status(500).send('Error occurred while processing the booking.');
    }
});

// Serve My Bookings page
app.get('/my-bookings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'my-bookings.html'));
});

app.get('/bookings', async (req, res) => {
    const { email } = req.query;

    try {
        const bookings = await db.collection('bookings').find({ email }).toArray();

        if (bookings.length === 0) {
            return res.status(404).send('No bookings found for this user');
        }

        const bookingsWithServiceNames = await Promise.all(bookings.map(async (booking) => {
            const service = await db.collection('services').findOne({ _id: new mongoose.Types.ObjectId(booking.serviceId) });
            return {
                ...booking,
                serviceName: service ? service.category : 'Service not found',
            };
        }));

        res.json(bookingsWithServiceNames);
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).send('Server error');
    }
});

// Cancel a booking
app.post('/cancel-booking', async (req, res) => {
    const { bookingId, email } = req.body;

    // Debugging logs
    console.log('Received bookingId:', bookingId);
    console.log('Received email:', email);

    if (!bookingId || !email) {
        return res.status(400).send('Booking ID and email are required');
    }

    try {
        // Update booking status to 'cancelled'
        const bookingResult = await db.collection('bookings').updateOne(
            { bookingId: bookingId, email: email },
            { $set: { status: 'cancelled' } }
        );

        if (bookingResult.matchedCount === 0) {
            return res.status(404).send('Booking not found or invalid email');
        }

        // Fetch booking details to retrieve service provider's email
        const booking = await db.collection('bookings').findOne({ bookingId: bookingId });

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const serviceProviderEmail = booking.serviceProviderEmail;

        if (!serviceProviderEmail) {
            return res.status(404).send('Service provider email not found');
        }

        // Send email to the service provider about cancellation
        const mailOptions = {
            from: 'ankuryadav89666@gmail.com', // Replace with your email
            to: serviceProviderEmail,    // Send email to the service provider
            subject: 'Service Booking Cancelled',
            text: `Dear Service Provider,

            A booking for your service scheduled on ${booking.date} has been cancelled by the user.

            Best regards,
            Local Services Marketplace`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending email');
            }
            console.log('Email sent:', info.response);
        });

        // Send response back to the user
        res.send('Booking cancelled successfully and notification sent to the service provider');
    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).send('Server error');
    }
});


// Mark booking as completed
app.post('/complete-booking', async (req, res) => {
    const { bookingId, email } = req.body;

    try {
        const result = await db.collection('bookings').updateOne(
            { _id: new mongoose.Types.ObjectId(bookingId), email: email },
            { $set: { status: 'completed' } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send('Booking not found or invalid email');
        }

        res.send('Booking marked as completed');
    } catch (err) {
        console.error('Error completing booking:', err);
        res.status(500).send('Server error');
    }
});





