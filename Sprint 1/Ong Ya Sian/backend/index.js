const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const eventRoutes = require('./routes/events');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/events', eventRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'UTM Event Management API is running!' });
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📱 Access from emulator: http://10.0.2.2:${PORT}`); 
  console.log(`📁 File uploads will be stored in: ${path.join(__dirname, 'uploads')}`);

});
