const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/connectDB');
const documentRoutes = require('./routes/documentRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Modular Attachment Service API is running'
    });
});

app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Modular Attachment Service API');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
