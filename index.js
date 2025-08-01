const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();
const { OpenAI } = require('openai');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const TOKEN = process.env.DISCORD_TOKEN;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//List the top 5 most important current technologies or skills for a software engineer to learn. When choosing this list, focus on time cost, leverage, utility, and market value. Individually rank all 5 on each of these metrics (1–5). Exclude these technologies: ${exclude.join(', ')}. Respond in 5 ranked lists and state the optimal choice of the 5 with reasoning
async function getLearningChart(exclude = []) {
    const prompt = exclude.length
        ? `You are a career advisor for software engineers.

List the **top 5 current technologies or skills** that a software engineer should learn, based on the following 4 criteria:
- Time Cost (1 = fast to learn, 5 = slow to learn)
- Leverage (1 = highly impactful, 5 = less impactful)
- Utility (1 = widely applicable, 5 = narrow use)
- Market Value (1 = highest demand, 5 = lowest)
Exclude these technologies: ${exclude.join(', ')}
Output the response in this exact format:
1. Technology Name  
Time Cost: #  
Leverage: #  
Utility: #  
Market Value: #

(repeat for 2–5)

At the end, add:
Optimal choice: <tech name> — <1–2 sentence reasoning>..`
        : `You are a career advisor for software engineers.

List the **top 5 current technologies or skills** that a software engineer should learn, based on the following 4 criteria:
- Time Cost (1 = fast to learn, 5 = slow to learn)
- Leverage (1 = highly impactful, 5 = less impactful)
- Utility (1 = widely applicable, 5 = narrow use)
- Market Value (1 = highest demand, 5 = lowest)

Output the response in this exact format:
1. Technology Name  
Time Cost: #  
Leverage: #  
Utility: #  
Market Value: #

(repeat for 2–5)

At the end, add:
Optimal choice: <tech name> — <1–2 sentence reasoning>.`;

    const res = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
    });

    return res.choices[0].message.content;
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // !hello
    if (content === '!hello') {
        const displayName = message.member?.nickname || message.author.username;
        message.channel.send(`Hello, ${displayName}! 👋`);
        return;
    }

    // !weather <location>
    if (content.startsWith('!weather')) {
        const location = content.slice(8).trim();

        if (!location) {
            message.channel.send('Please specify a location. Example: `!weather New York, NY`');
            return;
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=imperial`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (parseInt(data.cod) !== 200) {
                message.channel.send(`⚠️ Could not find weather for "${location}". Please use format: City, State Abbreviation, Country Abbreviation.`);
                return;
            }

            const temp = data.main.temp;
            const condition = data.weather[0].description;

            message.channel.send(`🌤️ The current weather in ${data.name} is ${temp}°F with ${condition}.`);
        } catch (err) {
            console.error('Weather fetch error:', err);
            message.channel.send('⚠️ Error fetching weather. Please try again later.');
        }

        return;
    }

    // !learn
    if (content === '!learn') {
        try {
            const reply = await getLearningChart();
            message.channel.send(`📚 Top 5 Techs to Learn, 1-5 with 1 being best in terms of time usage, leverage, utility, value:\n\`\`\`markdown\n${reply}\n\`\`\``);
        } catch (err) {
            console.error('OpenAI error:', err);
            message.channel.send('⚠️ Error getting learning suggestions. Please try again later.');
        }
        return;
    }

    // !learn-except <comma-separated-topics>
    if (content.startsWith('!learn-except')) {
        const parts = content.split(' ');
        const topics = parts.slice(1).join(' ').split(',').map(t => t.trim()).filter(Boolean);

        if (topics.length === 0) {
            message.channel.send('Please specify topics to exclude. Example: `!learn-except JavaScript, Python`');
            return;
        }

        try {
            const response = await getLearningChart(topics);
            message.channel.send(`📚 Top 5 other Techs to Learn 1-5 with 1 being best in terms of time usage, leverage, utility, value:\n\`\`\`markdown\n${response}\n\`\`\``);
        } catch (err) {
            console.error('OpenAI error:', err);
            message.channel.send('⚠️ Error getting learning suggestions. Please try again later.');
        }

        return;
    }
});

client.login(TOKEN);
