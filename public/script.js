const allowedNames = ['curt', 'alice', 'bob', 'jane']; // lowercase
const reporterCounts = {
  curt: 4,
  alice: 2,
  bob: 3,
  jane: 5,
};

const chartCanvas = document.getElementById('reportChart').getContext('2d');
const responseMessage = document.getElementById('responseMessage');

// Draw chart
let chart = new Chart(chartCanvas, {
  type: 'bar',
  data: {
    labels: Object.keys(reporterCounts),
    datasets: [{
      label: 'Tickets Submitted',
      data: Object.values(reporterCounts),
      backgroundColor: 'white',
      borderColor: 'black',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      }
    }
  }
});

document.getElementById('ticketForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('name').value.trim().toLowerCase();
  const category = document.getElementById('category').value.trim();
  const issue = document.getElementById('issue').value.trim();

  if (!allowedNames.includes(nameInput)) {
    responseMessage.textContent = "Unauthorized reporter.";
    responseMessage.style.color = "red";
    return;
  }

  try {
    const res = await fetch('/submit-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: nameInput, category, issue })
    });

    const data = await res.json();

    if (res.ok) {
      responseMessage.textContent = "Ticket submitted successfully!";
      responseMessage.style.color = "lime";
      // Update chart
      reporterCounts[nameInput] = (reporterCounts[nameInput] || 0) + 1;
      chart.data.labels = Object.keys(reporterCounts);
      chart.data.datasets[0].data = Object.values(reporterCounts);
      chart.update();
    } else {
        responseMessage.textContent = `Failed to submit ticket: ${data.message || JSON.stringify(data)}`;
        responseMessage.style.color = "red";
    }
  } catch (err) {
    responseMessage.textContent = "Error connecting to server.";
    responseMessage.style.color = "red";
  }
});
