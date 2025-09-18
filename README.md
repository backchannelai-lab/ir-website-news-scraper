# IR Website News Scraper

A Node.js application that automatically scrapes investor relations websites for press releases and sends daily email notifications with the latest news.

## Features

- **Automated Scraping**: Scrapes multiple company IR websites for press releases
- **Email Notifications**: Sends daily email summaries with the latest news
- **User Management**: Secure login/registration system
- **Company Management**: Add/remove companies to monitor
- **Email Configuration**: Configurable SMTP settings for email delivery
- **Duplicate Prevention**: Prevents sending duplicate news items
- **Space-Efficient Format**: One-line format for each news item
- **Manual Testing**: Test automation button for immediate testing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ir-website-news-scraper.git
cd ir-website-news-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Configure email settings:
   - Copy `settings.json` and update with your SMTP credentials
   - For Gmail, use App Passwords (not your regular password)
   - For Outlook, use App Passwords

4. Start the application:
```bash
npm start
```

5. Open your browser and go to `http://localhost:3000`

## Default Login

- **Username**: `admin`
- **Password**: `password`

## Configuration

### Email Settings

The application uses `settings.json` to store email configuration:

```json
{
  "email": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpUser": "your-email@gmail.com",
    "smtpPass": "your-app-password",
    "fromName": "IR News Scraper",
    "fromEmail": "your-email@gmail.com",
    "toEmails": ["recipient@example.com"],
    "subject": "Daily IR News Summary"
  },
  "schedule": {
    "cron": "0 8 * * *"
  }
}
```

### Company Management

Add companies to monitor in the web interface or directly in `companies.json`:

```json
[
  {
    "name": "Company Name",
    "ticker": "TICKER",
    "url": "https://company.com/investors/"
  }
]
```

## Usage

1. **Login**: Use the default credentials or create a new account
2. **Add Companies**: Add companies you want to monitor
3. **Configure Email**: Set up your email settings in the Settings page
4. **Test**: Use the "Test Automation Now" button to test the scraper
5. **Schedule**: The scraper runs daily at 8 AM (configurable via cron)

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/companies` - Get company list
- `POST /api/companies` - Save company list
- `GET /api/settings` - Get email settings
- `POST /api/settings/email` - Update email settings
- `POST /api/settings/schedule` - Update schedule settings
- `POST /api/test-email` - Send test email
- `POST /api/test-automation` - Run automation test

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Scraping**: Axios, Cheerio
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Authentication**: bcrypt, express-session
- **Data Storage**: JSON files

## File Structure

```
ir-website-news-scraper/
├── public/                 # Frontend files
│   ├── index.html         # Main dashboard
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── settings.html      # Settings page
│   ├── script.js          # Frontend JavaScript
│   └── style.css          # CSS styles
├── server.js              # Main server file
├── package.json           # Dependencies
├── companies.json         # Company data
├── users.json             # User data
├── settings.json          # Email configuration
├── sent-items.json        # Duplicate prevention
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
