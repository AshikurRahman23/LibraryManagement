import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/student.js';

const app = express();

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.static('public'));


app.use(session({
    secret: 'library_secret',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

// Global variables (for web)
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);

// Default route
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Start server
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
