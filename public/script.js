
document.addEventListener('DOMContentLoaded', () => {
    const companyList = document.getElementById('company-list');
    const addCompanyForm = document.getElementById('add-company-form');
    const companyNameInput = document.getElementById('company-name');
    const companyTickerInput = document.getElementById('company-ticker');
    const companyUrlInput = document.getElementById('company-url');

    let companies = [];

    // Fetch and display companies
    async function getCompanies() {
        try {
            const response = await fetch('/api/companies');
            companies = await response.json();
            renderCompanies();
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    }

    // Render companies to the list
    function renderCompanies() {
        companyList.innerHTML = '';
        companies.forEach((company, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${company.url}" target="_blank">${company.name} (${company.ticker || 'N/A'})</a>
                <span class="delete-btn" data-index="${index}">X</span>
            `;
            companyList.appendChild(li);
        });
    }

    // Add a new company
    addCompanyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCompany = {
            name: companyNameInput.value,
            ticker: companyTickerInput.value,
            url: companyUrlInput.value
        };
        companies.push(newCompany);
        await saveCompanies();
        renderCompanies();
        addCompanyForm.reset();
    });

    // Delete a company
    companyList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.dataset.index;
            companies.splice(index, 1);
            await saveCompanies();
            renderCompanies();
        }
    });

    // Save companies to the server
    async function saveCompanies() {
        try {
            await fetch('/api/companies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(companies)
            });
        } catch (error) {
            console.error('Error saving companies:', error);
        }
    }

    // Test automation functionality
    const testAutomationBtn = document.getElementById('test-automation-btn');
    const automationStatus = document.getElementById('automation-status');

    testAutomationBtn.addEventListener('click', async () => {
        testAutomationBtn.disabled = true;
        testAutomationBtn.textContent = 'Running...';
        automationStatus.style.display = 'block';
        automationStatus.className = 'status-info';
        automationStatus.textContent = 'Running automation test...';

        try {
            const response = await fetch('/api/test-automation', {
                method: 'POST'
            });

            if (response.ok) {
                automationStatus.className = 'status-success';
                automationStatus.textContent = 'Automation test completed successfully! Check your email.';
            } else {
                automationStatus.className = 'status-error';
                automationStatus.textContent = 'Error running automation test.';
            }
        } catch (error) {
            console.error('Error testing automation:', error);
            automationStatus.className = 'status-error';
            automationStatus.textContent = 'Error running automation test.';
        } finally {
            testAutomationBtn.disabled = false;
            testAutomationBtn.textContent = 'Test Automation Now';
        }
    });

    // Initial load
    getCompanies();
});
