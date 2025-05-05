const allowedReporters = ['alice', 'bob', 'charlie', 'diana']; // lowercase names
const exampleData = {
    'alice': 3,
    'bob': 5,
    'charlie': 2,
    'diana': 4
};

const form = document.getElementById('ticket-form');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const ctx = document.getElementById('ticketChart').getContext('2d');

let chart;

// Initialize bar chart with example data
function renderChart(data) {
    const labels = Object.keys(data);
    const counts = Object.values(data);

    if (chart) chart.destroy(); // re-render chart

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tickets Reported',
                data: counts,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

renderChart(exampleData);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    successDiv.textContent = '';

    const reporter = document.getElementById('reporter').value.trim();
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    const reporterLower = reporter.toLowerCase();

    if (!allowedReporters.includes(reporterLower)) {
        errorDiv.textContent = 'You are not authorized to report an issue.';
        return;
    }

    try {
        const res = await fetch('/submit-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reporter, category, description })
        });

        const data = await res.json();

        if (res.ok) {
            successDiv.textContent = 'Ticket submitted successfully!';
            form.reset();

            // Update chart data
            exampleData[reporterLower] = (exampleData[reporterLower] || 0) + 1;
            renderChart(exampleData);
        } else {
            throw new Error(data.error || 'Submission failed.');
        }
    } catch (err) {
        errorDiv.textContent = err.message;
    }
});
