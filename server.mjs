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

// Get the allowed reporters from the environment variable and split it into an array
const allowedReporters = process.env.ALLOWED_REPORTERS.split(',');

app.post('/submit-ticket', async (req, res) => {
    const { reporter, category, description } = req.body;
    console.log('Incoming body:', req.body);

    // Check if the reporter is in the allowed list (case-insensitive)
    if (!allowedReporters.includes(reporter.trim().toLowerCase())) {
        return res.status(403).json({ error: 'You are not authorized to submit a ticket.' });
    }

    try {
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: process.env.NOTION_DATABASE_ID },
                properties: {
                    'Reporter': {
                        title: [
                            {
                                text: { content: reporter }
                            }
                        ]
                    },
                    'Category': {
                        select: {
                            name: category
                        }
                    },
                    'Description': {
                        rich_text: [
                            {
                                text: { content: description }
                            }
                        ]
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
