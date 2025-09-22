

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cheerio = require('cheerio');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;
const saltRounds = 10;

const USERS_FILE = 'users.json';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'a-very-secret-key', // Replace with a real secret key
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        secure: false, // Set to true if using HTTPS
        httpOnly: true // Prevents client-side access to cookie
    }
}));

const COMPANIES_FILE = 'companies.json';
const RECIPIENTS_FILE = 'recipients.json';
const SETTINGS_FILE = 'settings.json';
const SENT_ITEMS_FILE = 'sent-items.json';

// --- API Endpoints ---

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        if (users.find(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        users.push({ username, password: hashedPassword });
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        const user = users.find(user => user.username === username);

        if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = username;
                return res.status(200).json({ message: 'Login successful' });
            }
        }
        res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// Companies API endpoints
app.get('/api/companies', async (req, res) => {
    try {
        const data = await fs.readFile(COMPANIES_FILE, 'utf8');
        const companies = JSON.parse(data);
        res.json(companies);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading companies:', error);
            res.status(500).json({ error: 'Error reading companies' });
        }
    }
});

app.post('/api/companies', async (req, res) => {
    try {
        const companies = req.body;
        
        if (!Array.isArray(companies)) {
            return res.status(400).json({ error: 'Companies data must be an array' });
        }
        
        await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2));
        res.status(200).json({ message: 'Companies saved successfully' });
    } catch (error) {
        console.error('Error saving companies:', error);
        res.status(500).json({ error: 'Error saving companies' });
    }
});

// Recipients API endpoints
app.get('/api/recipients', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPIENTS_FILE, 'utf8');
        const recipients = JSON.parse(data);
        res.json(recipients);
    } catch (error) {
        // If file doesn't exist, return empty array
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading recipients:', error);
            res.status(500).json({ error: 'Error reading recipients' });
        }
    }
});

app.post('/api/recipients', async (req, res) => {
    try {
        const recipients = req.body;
        
        if (!Array.isArray(recipients)) {
            return res.status(400).json({ error: 'Recipients data must be an array' });
        }
        
        await fs.writeFile(RECIPIENTS_FILE, JSON.stringify(recipients, null, 2));
        res.status(200).json({ message: 'Recipients saved successfully' });
    } catch (error) {
        console.error('Error saving recipients:', error);
        res.status(500).json({ error: 'Error saving recipients' });
    }
});

// Settings API endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        res.json(settings);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json({});
        } else {
            console.error('Error reading settings:', error);
            res.status(500).json({ error: 'Error reading settings' });
        }
    }
});

app.post('/api/settings/email', async (req, res) => {
    try {
        const emailSettings = req.body;
        
        // Validate required fields
        const requiredFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'fromName', 'fromEmail', 'toEmails', 'subject'];
        for (const field of requiredFields) {
            if (!emailSettings[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        settings.email = emailSettings;
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        
        res.status(200).json({ message: 'Email settings saved successfully' });
    } catch (error) {
        console.error('Error saving email settings:', error);
        res.status(500).json({ error: 'Error saving email settings' });
    }
});

app.post('/api/settings/schedule', async (req, res) => {
    try {
        const scheduleSettings = req.body;
        
        if (!scheduleSettings.cron) {
            return res.status(400).json({ error: 'Cron schedule is required' });
        }
        
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        settings.schedule = scheduleSettings;
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        
        res.status(200).json({ message: 'Schedule settings saved successfully' });
    } catch (error) {
        console.error('Error saving schedule settings:', error);
        res.status(500).json({ error: 'Error saving schedule settings' });
    }
});

app.post('/api/settings/email-template', async (req, res) => {
    try {
        const emailTemplate = req.body;
        
        if (!emailTemplate.subject || !emailTemplate.body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }
        
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        settings.emailTemplate = emailTemplate;
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        
        res.status(200).json({ message: 'Email template saved successfully' });
    } catch (error) {
        console.error('Error saving email template:', error);
        res.status(500).json({ error: 'Error saving email template' });
    }
});

app.post('/api/test-email', async (req, res) => {
    try {
        // Check if email settings exist
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        if (!settings.email) {
            return res.status(400).json({ error: 'Email settings not configured' });
        }
        
        const testHtml = `
            <h1>Test Email</h1>
            <p>This is a test email from your IR Website News Scraper.</p>
            <p>If you received this email, your email configuration is working correctly!</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
        `;
        
        await sendEmail(testHtml);
        res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Error sending test email' });
    }
});

app.post('/api/test-automation', async (req, res) => {
    try {
        // Check if email settings exist
        let settings = {};
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        if (!settings.email) {
            return res.status(400).json({ error: 'Email settings not configured' });
        }
        
        // For test automation, always send an email with results
        const testHtml = `
            <h1>Test Automation Results</h1>
            <p>This is a test run of your IR Website News Scraper automation.</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
            <hr>
        `;
        
        // Run the scraping but always send results
        await scrapeAndEmail();
        
        // Also send a test email to confirm the automation ran
        await sendEmail(testHtml + '<p>Automation test completed successfully!</p>');
        
        res.status(200).json({ message: 'Automation test completed successfully' });
    } catch (error) {
        console.error('Error in test automation:', error);
        res.status(500).json({ error: 'Error running automation test' });
    }
});

// --- Middleware to check if user is authenticated ---
const auth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login.html');
    }
};

// Static file serving with authentication
app.use('/login.html', express.static('public/login.html'));
app.use('/register.html', express.static('public/register.html'));
app.use('/', auth, express.static('public'));

// --- Web Scraping and Emailing Logic ---

async function scrapeAndEmail() {
    try {
        const data = await fs.readFile(COMPANIES_FILE, 'utf8');
        const companies = JSON.parse(data);
        
        if (!Array.isArray(companies) || companies.length === 0) {
            console.log('No companies to scrape');
            return;
        }
        
        // Load previously sent items to avoid duplicates
        let sentItems = {};
        try {
            const sentData = await fs.readFile(SENT_ITEMS_FILE, 'utf8');
            sentItems = JSON.parse(sentData);
        } catch (error) {
            // No previous sent items found, starting fresh
        }
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        let hasNewItems = false;
        
        // Load email template
        let emailTemplate = {
            subject: 'Daily Investor Relations Update - {DATE}',
            body: '<h1>Daily Investor Relations Update</h1>\n<p>Date: {DATE}</p>\n<hr>\n<p><strong>{COMPANY_NAME} ({TICKER})</strong> - <a href="{URL}" target="_blank">{TITLE}</a> - {PUBLISH_DATE}</p>'
        };
        
        try {
            const settingsData = await fs.readFile(SETTINGS_FILE, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.emailTemplate) {
                emailTemplate = settings.emailTemplate;
            }
        } catch (error) {
            // Use default template if settings not found
        }
        
        let emailBody = emailTemplate.body;
        let emailSubject = emailTemplate.subject;

        for (const company of companies) {
            try {
                const { data } = await axios.get(company.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                const $ = cheerio.load(data);
                
                let foundNews = false;
                let newsItems = [];

                // Try multiple selectors for different IR website structures
                const selectors = [
                    // Specific press release selectors
                    'a[href*="press-release"]',
                    'a[href*="announcement"]:not([href*="#"])', // Exclude anchor links
                    'a[href*="news"]:not([href*="#"])',
                    'a[href*="media"]:not([href*="#"])',
                    'a[href*="asx"]:not([href*="#"])',
                    'a[href*="asx-announcement"]',
                    'a[href*="asx-report"]',
                    // Content area selectors
                    '.news-item a',
                    '.press-release a',
                    '.announcement a',
                    '.media-release a',
                    '.asx-announcement a',
                    '[class*="news"] a:not([href*="#"])',
                    '[class*="press"] a:not([href*="#"])',
                    '[class*="announcement"] a:not([href*="#"])',
                    // PDF and document links
                    'a[href$=".pdf"]',
                    'a[href*="pdf"]',
                    // Headings that might be press releases
                    'h3 a:not([href*="#"]), h4 a:not([href*="#"]), h5 a:not([href*="#"])',
                    // Generic content links
                    '.content a:not([href*="#"])',
                    'article a:not([href*="#"])',
                    'main a:not([href*="#"])'
                ];

                // Try each selector to find the most recent release
                for (const selector of selectors) {
                    const links = $(selector);
                    if (links.length > 0) {
                        // Look for the most recent release (first one)
                        for (let i = 0; i < Math.min(links.length, 3); i++) {
                            const $link = $(links[i]);
                            let title = $link.text().trim();
                            const href = $link.attr('href');
                            
                            // Clean up the title
                            if (title) {
                                // Remove common navigation text
                                title = title.replace(/^(ASX Announcements?|News|Press Release|Announcement|Media|Investor Relations?)$/i, '').trim();
                                
                                // If title is too short or generic, try to get it from parent elements
                                if (title.length < 10 || /^(announcement|news|press|media|asx)$/i.test(title)) {
                                    const parentTitle = $link.parent().text().trim();
                                    const grandparentTitle = $link.parent().parent().text().trim();
                                    
                                    if (parentTitle.length > title.length && parentTitle.length < 200) {
                                        title = parentTitle;
                                    } else if (grandparentTitle.length > title.length && grandparentTitle.length < 200) {
                                        title = grandparentTitle;
                                    }
                                }
                                
                                // Clean up the title further
                                title = title.replace(/\s+/g, ' ').trim();
                            }
                            
                            if (title && href && title.length > 10 && !/^(announcement|news|press|media|asx|investor|relations?)$/i.test(title)) {
                                // Check if this looks like a recent release
                                const linkText = title.toLowerCase();
                                const parentText = $link.parent().text().toLowerCase();
                                const grandparentText = $link.parent().parent().text().toLowerCase();
                                
                                // Look for recent indicators
                                const isRecent = 
                                    linkText.includes('today') ||
                                    linkText.includes('yesterday') ||
                                    linkText.includes('latest') ||
                                    linkText.includes('new') ||
                                    // If it's the first item, assume it's recent
                                    i === 0;
                                
                                if (isRecent) {
                                    const fullUrl = new URL(href, company.url).href;
                                    
                                    // Extract publication date from the content
                                    let publishDate = 'Date not available';
                                    
                                    // Try to find date in various formats
                                    const datePatterns = [
                                        /(\d{1,2}\/\d{1,2}\/\d{4})/g,
                                        /(\d{1,2}-\d{1,2}-\d{4})/g,
                                        /(\d{4}-\d{1,2}-\d{1,2})/g,
                                        /(\d{1,2}\/\d{1,2}\/\d{2})/g,
                                        /(\d{1,2}-\d{1,2}-\d{2})/g,
                                        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi,
                                        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
                                        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/gi,
                                        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi,
                                        /(today|yesterday|this week|this month)/gi
                                    ];
                                    
                                    // Look for date in multiple sources
                                    const searchTexts = [
                                        $link.text(),
                                        $link.parent().text(),
                                        $link.parent().parent().text(),
                                        $link.siblings().text(),
                                        $link.closest('div').text(),
                                        $link.closest('article').text(),
                                        $link.closest('section').text()
                                    ].join(' ');
                                    
                                    // Try each pattern
                                    for (const pattern of datePatterns) {
                                        const match = searchTexts.match(pattern);
                                        if (match) {
                                            publishDate = match[0];
                                            break;
                                        }
                                    }
                                    
                                    // If no date found, try to get it from data attributes or nearby elements
                                    if (publishDate === 'Date not available') {
                                        const dateElement = $link.closest('*').find('[class*="date"], [class*="time"], [class*="publish"], [class*="created"], [class*="posted"]').first();
                                        if (dateElement.length > 0) {
                                            const dateText = dateElement.text().trim();
                                            if (dateText && dateText.length < 50) { // Reasonable date length
                                                publishDate = dateText;
                                            }
                                        }
                                    }
                                    
                                    // If still no date, try to get it from the URL
                                    if (publishDate === 'Date not available') {
                                        const urlMatch = fullUrl.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
                                        if (urlMatch) {
                                            const [, year, month, day] = urlMatch;
                                            publishDate = `${month}/${day}/${year}`;
                                        }
                                    }
                                    
                                    // Check if we've already sent this item today
                                    const itemKey = `${company.name}-${fullUrl}`;
                                    const sentDate = sentItems[itemKey];
                                    const isAlreadySentToday = sentDate && sentDate.split('T')[0] === today;
                                    
                                    if (!isAlreadySentToday) {
                                        newsItems.push({ 
                                            title, 
                                            url: fullUrl, 
                                            publishDate,
                                            company: company.name,
                                            ticker: company.ticker || 'N/A'
                                        });
                                        foundNews = true;
                                        hasNewItems = true;
                                        sentItems[itemKey] = new Date().toISOString();
                                        break; // Only get the most recent one
                                    }
                                }
                            }
                        }
                        
                        if (foundNews) break; // Stop at first successful selector
                    }
                }

                // If no specific news found, don't force a generic link

                // Add results to email
                if (foundNews && newsItems.length > 0) {
                    newsItems.forEach(item => {
                        const itemHtml = emailTemplate.body
                            .replace(/{COMPANY_NAME}/g, item.company)
                            .replace(/{TICKER}/g, item.ticker)
                            .replace(/{TITLE}/g, item.title)
                            .replace(/{URL}/g, item.url)
                            .replace(/{PUBLISH_DATE}/g, item.publishDate)
                            .replace(/{DATE}/g, today);
                        emailBody += itemHtml;
                    });
                } else {
                    const noNewsHtml = emailTemplate.body
                        .replace(/{COMPANY_NAME}/g, company.name)
                        .replace(/{TICKER}/g, company.ticker || 'N/A')
                        .replace(/{TITLE}/g, 'No new announcements found')
                        .replace(/{URL}/g, '#')
                        .replace(/{PUBLISH_DATE}/g, 'N/A')
                        .replace(/{DATE}/g, today);
                    emailBody += noNewsHtml;
                }
                
            } catch (error) {
                console.error(`Error scraping ${company.name}:`, error);
                const errorHtml = emailTemplate.body
                    .replace(/{COMPANY_NAME}/g, company.name)
                    .replace(/{TICKER}/g, company.ticker || 'N/A')
                    .replace(/{TITLE}/g, `<span style="color: #d63031;">Error: ${error.message}</span>`)
                    .replace(/{URL}/g, '#')
                    .replace(/{PUBLISH_DATE}/g, 'N/A')
                    .replace(/{DATE}/g, today);
                emailBody += errorHtml;
            }
        }

        // Only send email if there are new items
        if (hasNewItems) {
            // Replace template variables in subject
            const finalSubject = emailSubject
                .replace(/{DATE}/g, today)
                .replace(/{COMPANY_COUNT}/g, companies.length.toString());
            
            await sendEmail(emailBody, finalSubject);
            
            // Save the sent items to avoid duplicates
            await fs.writeFile(SENT_ITEMS_FILE, JSON.stringify(sentItems, null, 2));
        }
    } catch (error) {
        console.error('Error in scrapeAndEmail:', error);
    }
}

async function sendEmail(html, customSubject = null) {
    try {
        // Load settings from file
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        const emailConfig = settings.email;

        // Configure nodemailer with user settings
    const transporter = nodemailer.createTransport({
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort,
        auth: {
                user: emailConfig.smtpUser,
                pass: emailConfig.smtpPass
        }
    });

    const mailOptions = {
            from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
            to: emailConfig.toEmails.join(', '),
            subject: customSubject || emailConfig.subject,
        html: html
    };

    await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error in sendEmail:', error);
        throw error;
    }
}

// --- Cron Job ---

// Load and start cron job with dynamic schedule
async function startCronJob() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        const cronSchedule = settings.schedule?.cron || '0 8 * * *';
        
        console.log(`Starting cron job with schedule: ${cronSchedule}`);
        cron.schedule(cronSchedule, scrapeAndEmail);
    } catch (error) {
        console.error('Error starting cron job:', error);
        // Fallback to default schedule
cron.schedule('0 8 * * *', scrapeAndEmail);
    }
}

// Start the cron job
startCronJob();


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
