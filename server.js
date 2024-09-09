const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');  // To securely store and check passwords

const app = express();
const port = 3000;

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

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
        // Check if user exists
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }

        // Check if password is correct
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`Password Valid: ${isPasswordValid}`);  // Debugging log

        if (!isPasswordValid) {
            return res.status(400).send('Invalid password');
        }

        // Redirect to the home page or dashboard after successful login
        res.redirect('/home'); // Redirecting to the home page
    } catch (err) {
        console.error('Error occurred during login:', err);
        res.status(500).send('Error occurred during login');
    }
});
