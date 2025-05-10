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

const allowedReporters = process.env.ALLOWED_REPORTERS.split(',');

app.post('/submit-ticket', async (req, res) => {
    const { reporter, category, description, priority, title } = req.body;
    console.log('Incoming body:', req.body);

    if (!allowedReporters.includes(reporter.trim().toLowerCase())) {
        return res.status(403).json({ error: 'You are not authorized to submit a ticket.' });
    }

    try {
        const createdDate = new Date().toISOString();

        // console.log('Title being sent to Notion:', title);

        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: process.env.TICKETS_DATABASE_ID },
                properties: {
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
                    },
                    Category: {
                        multi_select: Array.isArray(category)
                            ? category.map(cat => ({ name: cat }))
                            : []
                    }
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return res.status(500).json({ error });
        }

        res.status(200).json({ success: true, message: `Ticket submitted successfully, thank you ${reporter}!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});