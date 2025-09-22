
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const companyList = document.getElementById('company-list');
    const addCompanyForm = document.getElementById('add-company-form');
    const toggleAddFormBtn = document.getElementById('toggle-add-form');
    const cancelAddFormBtn = document.getElementById('cancel-add-form');
    const companyNameInput = document.getElementById('company-name');
    const companyTickerInput = document.getElementById('company-ticker');
    const companyUrlInput = document.getElementById('company-url');
    
    // Page toggle elements
    const dashboardTab = document.getElementById('dashboard-tab');
    const recipientsTab = document.getElementById('recipients-tab');
    const settingsTab = document.getElementById('settings-tab');
    const dashboardPage = document.getElementById('dashboard-page');
    const recipientsPage = document.getElementById('recipients-page');
    const settingsPage = document.getElementById('settings-page');
    
    // Validate required elements
    if (!dashboardTab || !recipientsTab || !settingsTab || !dashboardPage || !recipientsPage || !settingsPage) {
        console.error('Required page elements not found');
        return;
    }
    
    // Recipients elements
    const recipientsList = document.getElementById('recipients-list');
    const addRecipientForm = document.getElementById('add-recipient-form');
    const toggleAddRecipientBtn = document.getElementById('toggle-add-recipient');
    const cancelAddRecipientBtn = document.getElementById('cancel-add-recipient');
    const recipientNameInput = document.getElementById('recipient-name');
    const recipientEmailInput = document.getElementById('recipient-email');

    let companies = [];
    let recipients = [];

    // Utility functions
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification status-message status-${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.minWidth = '300px';
        notification.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
            button.classList.remove('loading');
        }
    }

    function toggleForm(form, toggleButton) {
        const isVisible = form.style.display === 'block';
        form.style.display = isVisible ? 'none' : 'block';
        toggleButton.style.display = isVisible ? 'block' : 'none';
        
        if (!isVisible) {
            const firstInput = form.querySelector('input[required]');
            if (firstInput) firstInput.focus();
        }
    }

    // Fetch and display companies
    async function getCompanies() {
        try {
            const response = await fetch('/api/companies');
            if (!response.ok) throw new Error('Failed to fetch companies');
            companies = await response.json();
            renderCompanies();
        } catch (error) {
            console.error('Error fetching companies:', error);
            showNotification('Error loading companies', 'error');
        }
    }

    // Render companies to the list
    function renderCompanies() {
        // Keep the header row and clear only the company rows
        const existingHeader = companyList.querySelector('.company-list-header');
        const existingCompanies = companyList.querySelectorAll('.company-card');
        existingCompanies.forEach(card => card.remove());
        
        if (companies.length === 0) {
            document.getElementById('empty-state').style.display = 'block';
            return;
        }
        
        document.getElementById('empty-state').style.display = 'none';
        
        companies.forEach((company, index) => {
            const companyCard = document.createElement('div');
            companyCard.className = 'company-card';
            companyCard.innerHTML = `
                <div class="company-info">
                    <span class="company-name">${company.name}</span>
                    <span class="company-ticker">${company.ticker || 'N/A'}</span>
                    <a href="${company.url}" target="_blank" class="company-url" title="${company.url}">${company.url}</a>
                </div>
                <div class="company-actions">
                    <button class="delete-btn" data-index="${index}" title="Remove company">
                        ×
                    </button>
                </div>
            `;
            companyList.appendChild(companyCard);
        });
    }

    // Toggle add company form
    toggleAddFormBtn.addEventListener('click', () => {
        toggleForm(addCompanyForm, toggleAddFormBtn);
    });

    // Cancel add company form
    cancelAddFormBtn.addEventListener('click', () => {
        addCompanyForm.style.display = 'none';
        toggleAddFormBtn.style.display = 'block';
        addCompanyForm.reset();
    });

    // Add a new company
    addCompanyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = addCompanyForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Adding...');
        
        try {
            const newCompany = {
                name: companyNameInput.value.trim(),
                ticker: companyTickerInput.value.trim().toUpperCase(),
                url: companyUrlInput.value.trim()
            };
            
            companies.push(newCompany);
            await saveCompanies();
            renderCompanies();
            addCompanyForm.reset();
            
            // Hide form and show button
            addCompanyForm.style.display = 'none';
            toggleAddFormBtn.style.display = 'block';
            
            showNotification('Company added successfully!', 'success');
        } catch (error) {
            console.error('Error adding company:', error);
            showNotification('Error adding company. Please try again.', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // Delete a company
    companyList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.dataset.index;
            const companyName = companies[index].name;
            
            if (confirm(`Are you sure you want to remove ${companyName} from tracking?`)) {
                try {
                    companies.splice(index, 1);
                    await saveCompanies();
                    renderCompanies();
                    showNotification(`${companyName} removed successfully!`, 'success');
                } catch (error) {
                    console.error('Error deleting company:', error);
                    showNotification('Error removing company. Please try again.', 'error');
                }
            }
        }
    });

    // Save companies to the server
    async function saveCompanies() {
        try {
            const response = await fetch('/api/companies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(companies)
            });
            if (!response.ok) throw new Error('Failed to save companies');
        } catch (error) {
            console.error('Error saving companies:', error);
            throw error;
        }
    }




    // Load settings for page
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            
            // Populate email settings
            document.getElementById('smtp-host').value = settings.email?.smtpHost || '';
            document.getElementById('smtp-port').value = settings.email?.smtpPort || '';
            document.getElementById('smtp-user').value = settings.email?.smtpUser || '';
            document.getElementById('smtp-pass').value = settings.email?.smtpPass || '';
            document.getElementById('from-name').value = settings.email?.fromName || '';
            document.getElementById('from-email').value = settings.email?.fromEmail || '';
            document.getElementById('to-emails').value = settings.email?.toEmails?.join(', ') || '';
            document.getElementById('email-subject').value = settings.email?.subject || '';
            
            // Populate schedule settings
            document.getElementById('cron-schedule').value = settings.schedule?.cron || '0 8 * * *';
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotification('Error loading settings', 'error');
        }
    }

    // Settings form handlers
    document.getElementById('email-settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.querySelector('#email-settings-form button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Saving...');
        
        const emailSettings = {
            smtpHost: document.getElementById('smtp-host').value.trim(),
            smtpPort: parseInt(document.getElementById('smtp-port').value),
            smtpUser: document.getElementById('smtp-user').value.trim(),
            smtpPass: document.getElementById('smtp-pass').value,
            fromName: document.getElementById('from-name').value.trim(),
            fromEmail: document.getElementById('from-email').value.trim(),
            toEmails: document.getElementById('to-emails').value.split(',').map(email => email.trim()),
            subject: document.getElementById('email-subject').value.trim()
        };
        
        try {
            const response = await fetch('/api/settings/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailSettings)
            });
            
            if (response.ok) {
                showNotification('Email settings saved successfully!', 'success');
            } else {
                showNotification('Error saving email settings', 'error');
            }
        } catch (error) {
            console.error('Error saving email settings:', error);
            showNotification('Error saving email settings', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    document.getElementById('schedule-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.querySelector('#schedule-form button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Saving...');
        
        const scheduleSettings = {
            cron: document.getElementById('cron-schedule').value.trim()
        };
        
        try {
            const response = await fetch('/api/settings/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleSettings)
            });
            
            if (response.ok) {
                showNotification('Schedule settings saved successfully!', 'success');
            } else {
                showNotification('Error saving schedule settings', 'error');
            }
        } catch (error) {
            console.error('Error saving schedule settings:', error);
            showNotification('Error saving schedule settings', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // Settings test buttons
    document.getElementById('test-email-btn').addEventListener('click', async () => {
        const btn = document.getElementById('test-email-btn');
        setButtonLoading(btn, true, 'Sending...');
        
        try {
            const response = await fetch('/api/test-email', {
                method: 'POST'
            });
            
            if (response.ok) {
                showNotification('Test email sent successfully!', 'success');
            } else {
                showNotification('Error sending test email', 'error');
            }
        } catch (error) {
            console.error('Error sending test email:', error);
            showNotification('Error sending test email', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });

    document.getElementById('test-automation-settings-btn').addEventListener('click', async () => {
        const btn = document.getElementById('test-automation-settings-btn');
        const statusDiv = document.getElementById('settings-automation-status');
        
        setButtonLoading(btn, true, 'Running...');
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-message status-info';
        statusDiv.textContent = 'Running automation test...';

        try {
            const response = await fetch('/api/test-automation', {
                method: 'POST'
            });
            
            if (response.ok) {
                statusDiv.className = 'status-message status-success';
                statusDiv.textContent = 'Automation test completed successfully! Check your email.';
                showNotification('Automation test completed! Check your email for results.', 'success');
            } else {
                statusDiv.className = 'status-message status-error';
                statusDiv.textContent = 'Error running automation test.';
                showNotification('Automation test failed. Please check your settings.', 'error');
            }
        } catch (error) {
            console.error('Error testing automation:', error);
            statusDiv.className = 'status-message status-error';
            statusDiv.textContent = 'Error running automation test.';
            showNotification('Network error during automation test.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });

    // Page toggle functionality
    function showPage(activeTab, activePage) {
        // Remove active class from all tabs and pages
        [dashboardTab, recipientsTab, settingsTab].forEach(tab => tab.classList.remove('active'));
        [dashboardPage, recipientsPage, settingsPage].forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        
        // Show selected page
        activeTab.classList.add('active');
        activePage.classList.add('active');
        activePage.style.display = 'block';
    }

    dashboardTab.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(dashboardTab, dashboardPage);
    });

    recipientsTab.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(recipientsTab, recipientsPage);
        getRecipients(); // Load recipients when switching to this page
    });

    settingsTab.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(settingsTab, settingsPage);
        loadSettings();
    });

    // Recipients functionality
    async function getRecipients() {
        try {
            const response = await fetch('/api/recipients');
            if (!response.ok) throw new Error('Failed to fetch recipients');
            recipients = await response.json();
            renderRecipients();
        } catch (error) {
            console.error('Error fetching recipients:', error);
            showNotification('Error loading recipients', 'error');
        }
    }

    function renderRecipients() {
        // Keep the header row and clear only the recipient rows
        const existingHeader = recipientsList.querySelector('.company-list-header');
        const existingRecipients = recipientsList.querySelectorAll('.company-card');
        existingRecipients.forEach(card => card.remove());
        
        if (recipients.length === 0) {
            document.getElementById('recipients-empty-state').style.display = 'block';
            return;
        }
        
        document.getElementById('recipients-empty-state').style.display = 'none';
        
        recipients.forEach((recipient, index) => {
            const recipientCard = document.createElement('div');
            recipientCard.className = 'company-card';
            recipientCard.innerHTML = `
                <div class="company-info">
                    <span class="company-name">${recipient.name}</span>
                    <span class="company-url">${recipient.email}</span>
                </div>
                <div class="company-actions">
                    <button class="delete-btn" data-index="${index}" title="Remove recipient">
                        ×
                    </button>
                </div>
            `;
            recipientsList.appendChild(recipientCard);
        });
    }

    // Toggle add recipient form
    toggleAddRecipientBtn.addEventListener('click', () => {
        toggleForm(addRecipientForm, toggleAddRecipientBtn);
    });

    // Cancel add recipient form
    cancelAddRecipientBtn.addEventListener('click', () => {
        addRecipientForm.style.display = 'none';
        toggleAddRecipientBtn.style.display = 'block';
        addRecipientForm.reset();
    });

    // Add a new recipient
    addRecipientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = addRecipientForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Adding...');
        
        try {
            const newRecipient = {
                name: recipientNameInput.value.trim(),
                email: recipientEmailInput.value.trim()
            };
            
            recipients.push(newRecipient);
            await saveRecipients();
            renderRecipients();
            addRecipientForm.reset();
            
            // Hide form and show button
            addRecipientForm.style.display = 'none';
            toggleAddRecipientBtn.style.display = 'block';
            
            showNotification('Recipient added successfully!', 'success');
        } catch (error) {
            console.error('Error adding recipient:', error);
            showNotification('Error adding recipient. Please try again.', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // Delete a recipient
    recipientsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.dataset.index;
            const recipientName = recipients[index].name;
            
            if (confirm(`Are you sure you want to remove ${recipientName} from the recipient list?`)) {
                try {
                    recipients.splice(index, 1);
                    await saveRecipients();
                    renderRecipients();
                    showNotification(`${recipientName} removed successfully!`, 'success');
                } catch (error) {
                    console.error('Error deleting recipient:', error);
                    showNotification('Error removing recipient. Please try again.', 'error');
                }
            }
        }
    });

    // Save recipients to the server
    async function saveRecipients() {
        try {
            const response = await fetch('/api/recipients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recipients)
            });
            if (!response.ok) throw new Error('Failed to save recipients');
        } catch (error) {
            console.error('Error saving recipients:', error);
            throw error;
        }
    }

    // Initial load
    getCompanies();
});

