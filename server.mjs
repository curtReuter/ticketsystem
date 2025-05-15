import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

const allowedReporters = process.env.ALLOWED_REPORTERS.split(',').map(r => r.trim().toLowerCase());

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TICKETS_DATABASE_ID = process.env.TICKETS_DATABASE_ID;
const COUNTS_DATABASE_ID = process.env.COUNTS_DATABASE_ID;

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function queryCountsDatabase(reporter) {
  const response = await fetch(`${NOTION_API_URL}/databases/${COUNTS_DATABASE_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: {
        property: 'Reporter',
        title: {
          equals: reporter
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to query counts database: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

async function updateCountPage(pageId, newCount) {
  const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        Number: {
          number: newCount
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update count page: ${response.statusText}`);
  }

  return await response.json();
}

async function createCountPage(reporter) {
  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: COUNTS_DATABASE_ID },
      properties: {
        Reporter: {
          title: [
            {
              text: { content: reporter }
            }
          ]
        },
        Number: {
          number: 1
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create count page: ${response.statusText}`);
  }

  return await response.json();
}

app.post('/submit-ticket', async (req, res) => {
  const { reporter, description, priority, title } = req.body;
  const normalizedReporter = reporter.trim().toLowerCase();

  if (!allowedReporters.includes(normalizedReporter)) {
    return res.status(403).json({ error: 'You are not authorized to submit a ticket.' });
  }

  try {
    const createdDate = new Date().toISOString();

    // Build the properties object
    const properties = {
      Reporter: {
        rich_text: [
          {
            text: { content: reporter }
          }
        ]
      },
      Title: {
        title: [
          {
            text: { content: title }
          }
        ]
      },
      Description: {
        rich_text: [
          {
            text: { content: description }
          }
        ]
      },
      Priority: {
        select: {
          name: priority
        }
      },
      Created: {
        date: {
          start: createdDate,
          time_zone: 'America/New_York'
        }
      }
    };

    // If title is numeric, assign "gun" category
    if (/^\d+$/.test(title)) {
      properties.Category = {
        multi_select: [{ name: "gun" }]
      };
    }

    // Create ticket in the tickets database
    const ticketResponse = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: TICKETS_DATABASE_ID },
        properties
      })
    });

    if (!ticketResponse.ok) {
      const error = await ticketResponse.text();
      return res.status(500).json({ error });
    }

    // Update counts database
    const existingPages = await queryCountsDatabase(reporter);

    if (existingPages.length > 0) {
      const page = existingPages[0];
      const currentCount = page.properties.Number.number || 0;
      await updateCountPage(page.id, currentCount + 1);
    } else {
      await createCountPage(reporter);
    }

    res.status(200).json({ success: true, message: `Ticket submitted successfully, thank you ${reporter}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ticket-counts', async (req, res) => {
  try {
    const response = await fetch(`${NOTION_API_URL}/databases/${COUNTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ticket counts: ${response.statusText}`);
    }

    const data = await response.json();

    const counts = {};
    data.results.forEach(page => {
      const reporter = page.properties.Reporter.title[0]?.text?.content || 'Unknown';
      const count = page.properties.Number.number || 0;
      counts[reporter.toLowerCase()] = count;
    });

    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
