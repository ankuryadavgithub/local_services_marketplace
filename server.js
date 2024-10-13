const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const path = require('path');
const bcrypt = require('bcrypt');  // To securely store and check passwords


const app = express();
const port = 8000;

// Middleware
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
        console.log(`Hashed Password: ${hashedPassword}`);  // Debugging log

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

        // Redirect customers to home page
        res.redirect('/home');
    } catch (err) {
        console.error('Error occurred during login:', err);
        res.status(500).send('Error occurred during login');
    }
});

// Service Submission Route
app.post('/submit-service', async (req, res) => {
    const { name, category, location, priceRange, description, email } = req.body; // Ensure email is captured here
    console.log("Submission Data:", req.body); // Log the entire request body for debugging

    try {
        // Find the user by email
        const user = await db.collection('users').findOne({ email });
        console.log("Found User:", user); // Log the found user for debugging

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Insert the service into the services collection
        const service = {
            name,
            category,
            location,
            priceRange,
            description,
            rating: 0, // Initialize rating
        };

        await db.collection('services').insertOne(service);

        // Update the user's hasSubmittedService status
        await db.collection('users').updateOne(
            { email },
            { $set: { hasSubmittedService: true } }
        );

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

