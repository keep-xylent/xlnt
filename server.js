require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ActivityType, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// --- SECURE CONFIGURATION (LOADED FROM .ENV) ---
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const STATS_FILE = path.join(__dirname, 'stats.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const BOT_TOKEN = process.env.BOT_TOKEN;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const STATS_CHANNEL_ID = NOTIFY_CHANNEL_ID;

function readProjects() {
    if (!fs.existsSync(PROJECTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(PROJECTS_FILE));
    } catch(e) { return []; }
}

function saveProjects(data) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
}
// -----------------------------------------------

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Slash Commands Definition
const commands = [
    new SlashCommandBuilder().setName('info').setDescription('Show visitor statistics and growth chart'),
    new SlashCommandBuilder().setName('temp').setDescription('List staged files in temporary storage'),
    new SlashCommandBuilder().setName('clear').setDescription('Purge all files from temporary storage'),
    new SlashCommandBuilder().setName('project').setDescription('Manage Web Projects list')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a new web project')
            .addStringOption(opt => opt.setName('name').setDescription('Project Name').setRequired(true))
            .addStringOption(opt => opt.setName('url').setDescription('Project URL').setRequired(true))
            .addStringOption(opt => opt.setName('tag').setDescription('Project Tag (e.g. Web App)')))
        .addSubcommand(sub => sub.setName('list').setDescription('List all web projects'))
        .addSubcommand(sub => sub.setName('update').setDescription('Update a project URL'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete a project'))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

client.once('clientReady', async () => {
    client.user.setPresence({
        activities: [{ 
            name: 'xlnt.my.id : active', 
            type: ActivityType.Playing,
            assets: {
                largeImage: 'icon',
                largeText: 'XLNT'
            }
        }],
        status: 'online',
    });

    console.log(`[DISCORD] Logged in as ${client.user.tag}`);

    try {
        // 1. Hapus SEMUA Global Commands (untuk membersihkan /active dan duplikat)
        console.log('[SYSTEM] Cleaning up Global Commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });

        // 2. Daftar Ulang Guild Commands (agar instan dan tidak dobel)
        console.log('[SYSTEM] Registering fresh Guild Commands...');
        const guilds = await client.guilds.fetch();
        for (const [guildId, guild] of guilds) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands }
            );
            console.log(`[SUCCESS] Commands live on: ${guild.name}`);
        }

        console.log('[SYSTEM] Clean up and registration complete.');
    } catch (error) {
        console.error('[ERROR] Sync failed:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

    if (commandName === 'info') {
        if (!fs.existsSync(STATS_FILE)) return interaction.reply('No stats recorded yet.');

        const stats = JSON.parse(fs.readFileSync(STATS_FILE));
        const months = Object.keys(stats.monthly).sort();
        const counts = months.map(m => stats.monthly[m]);

        const chartConfig = {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Visitors per Month',
                    data: counts,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgb(0, 123, 255)',
                    borderWidth: 1
                }]
            },
            options: {
                title: { display: true, text: 'VISITOR GROWTH CHART' }
            }
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

        const embed = new EmbedBuilder()
            .setColor(0x007BFF)
            .setTitle('SYSTEM ANALYTICS')
            .addFields(
                { name: 'Total Visitors', value: stats.total.toString(), inline: true },
                { name: 'Current Month', value: stats.monthly[months[months.length - 1]].toString(), inline: true }
            )
            .setImage(chartUrl)
            .setTimestamp()
            .setFooter({ text: 'XLNT MONITORING SYSTEM' });

        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'temp') {
        if (!fs.existsSync(uploadDir)) return interaction.reply('Staging directory not found.');

        const files = fs.readdirSync(uploadDir);
        if (files.length === 0) return interaction.reply('Staging zone is empty [0 files].');

        let totalSize = 0;
        let fileList = files.map(file => {
            const stats = fs.statSync(path.join(uploadDir, file));
            totalSize += stats.size;
            return `- \`${file}\` (${(stats.size / 1024 / 1024).toFixed(2)} MB)`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x007BFF)
            .setTitle('STAGING ZONE AUDIT')
            .setDescription(fileList.length > 2000 ? fileList.substring(0, 1900) + '...' : fileList)
            .addFields(
                { name: 'Total Files', value: files.length.toString(), inline: true },
                { name: 'Total Size', value: `${(totalSize / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'clear') {
        if (!interaction.memberPermissions.has('Administrator')) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        if (!fs.existsSync(uploadDir)) return interaction.reply('Staging directory not found.');

        const files = fs.readdirSync(uploadDir);
        if (files.length === 0) return interaction.reply('Staging zone is already clean.');

        files.forEach(file => {
            fs.unlinkSync(path.join(uploadDir, file));
        });

        await interaction.reply(`PURGE SUCCESSFUL: ${files.length} files removed from staging zone.`);
    }

    if (commandName === 'project') {
        if (!interaction.memberPermissions.has('Administrator')) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        const subCmd = interaction.options.getSubcommand();
        const projects = readProjects();

        if (subCmd === 'add') {
            const name = interaction.options.getString('name');
            const url = interaction.options.getString('url');
            const tag = interaction.options.getString('tag') || 'Web App';
            
            projects.push({ id: Date.now().toString(), name, url, tag });
            saveProjects(projects);
            return interaction.reply(`✅ Added project **${name}** (${url})`);
        }

        if (subCmd === 'list') {
            if (projects.length === 0) return interaction.reply('No projects found.');
            const embed = new EmbedBuilder().setTitle('WEB PROJECTS')
                .setDescription(projects.map((p, i) => `**${i+1}. ${p.name}**\n[${p.url}](${p.url}) - \`${p.tag}\``).join('\n\n'));
            return interaction.reply({ embeds: [embed] });
        }

        if (subCmd === 'delete') {
            if (projects.length === 0) return interaction.reply('No projects to delete.');
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_project_delete')
                .setPlaceholder('Select a project to delete')
                .addOptions(projects.map(p => ({
                    label: p.name,
                    description: p.url.substring(0, 50),
                    value: p.id
                })));
                
            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({ content: 'Choose which project to **DELETE**:', components: [row], ephemeral: true });
        }

        if (subCmd === 'update') {
            if (projects.length === 0) return interaction.reply('No projects to update.');
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_project_update')
                .setPlaceholder('Select a project to update URL')
                .addOptions(projects.map(p => ({
                    label: p.name,
                    description: p.url.substring(0, 50),
                    value: p.id
                })));
                
            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({ content: 'Choose which project to **UPDATE**:', components: [row], ephemeral: true });
        }
    }
    } else if (interaction.isStringSelectMenu()) {
        const { customId, values } = interaction;
        const projects = readProjects();
        const projectId = values[0];
        const project = projects.find(p => p.id === projectId);

        if (!project) return interaction.reply({ content: 'Project not found.', ephemeral: true });

        if (customId === 'select_project_delete') {
            const newProjects = projects.filter(p => p.id !== projectId);
            saveProjects(newProjects);
            return interaction.update({ content: `✅ Deleted project **${project.name}**.`, components: [] });
        }

        if (customId === 'select_project_update') {
            const modal = new ModalBuilder()
                .setCustomId(`modal_update_project_${projectId}`)
                .setTitle(`Update URL`);

            const urlInput = new TextInputBuilder()
                .setCustomId('newUrlInput')
                .setLabel('New Project URL')
                .setStyle(TextInputStyle.Short)
                .setValue(project.url)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
            return interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_update_project_')) {
            const projectId = interaction.customId.replace('modal_update_project_', '');
            const newUrl = interaction.fields.getTextInputValue('newUrlInput');
            
            const projects = readProjects();
            const projectIndex = projects.findIndex(p => p.id === projectId);
            
            if (projectIndex === -1) return interaction.reply({ content: 'Project not found.', ephemeral: true });
            
            projects[projectIndex].url = newUrl;
            saveProjects(projects);
            
            return interaction.reply({ content: `✅ Updated **${projects[projectIndex].name}** URL to <${newUrl}>`, ephemeral: true });
        }
    }
});

client.login(BOT_TOKEN);
// ----------------------------

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const allowedExts = /\.(jpg|jpeg|png|gif|webp|pdf|txt|docx|zip)$/i;
        if (!allowedExts.test(path.extname(file.originalname))) {
            return cb(new Error('Format file tidak diizinkan.'));
        }
        cb(null, true);
    }
});

// --- Security: Rate Limiting ---
const submitLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
});

app.use(cors());

app.get('/api/projects', (req, res) => {
    res.json(readProjects());
});
// Helper: Get/Update Stats
function updateStats() {
    let stats = { total: 0, monthly: {} };
    if (fs.existsSync(STATS_FILE)) {
        stats = JSON.parse(fs.readFileSync(STATS_FILE));
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    stats.total++;
    stats.monthly[monthKey] = (stats.monthly[monthKey] || 0) + 1;

    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    return { total: stats.total, currentMonth: stats.monthly[monthKey] };
}

// Function to update Discord Channel Topic
async function updateChannelTopic(stats) {
    try {
        console.log(`[DEBUG] Attempting to update channel ${STATS_CHANNEL_ID}...`);
        const channel = await client.channels.fetch(STATS_CHANNEL_ID);
        if (channel) {
            // Template deskripsi yang lebih rapi dan industrial
            const newTopic = `MONTHLY: [ ${stats.currentMonth} ] | TOTAL: [ ${stats.total} ] | STATUS: ACTIVE`;
            await channel.setTopic(newTopic);
            console.log(`[SYSTEM] Discord Channel Topic updated to: ${newTopic}`);
        } else {
            console.error(`[ERROR] Channel with ID ${STATS_CHANNEL_ID} not found.`);
        }
    } catch (err) {
        console.error('[ERROR] Failed to update Channel Topic:', err.message);
        if (err.message.includes('rate limited')) {
            console.warn('[WARN] Discord is rate-limiting channel updates. Please wait 10 minutes.');
        }
    }
}

// Bot Command: !info
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === '/info') {
        if (!fs.existsSync(STATS_FILE)) return message.reply('No stats recorded yet.');

        const stats = JSON.parse(fs.readFileSync(STATS_FILE));
        const months = Object.keys(stats.monthly).sort();
        const counts = months.map(m => stats.monthly[m]);

        // Generate Chart URL (QuickChart)
        const chartConfig = {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Visitors per Month',
                    data: counts,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgb(0, 123, 255)',
                    borderWidth: 1
                }]
            },
            options: {
                title: { display: true, text: 'VISITOR GROWTH CHART' }
            }
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

        const embed = new EmbedBuilder()
            .setColor(0x007BFF)
            .setTitle('SYSTEM ANALYTICS')
            .addFields(
                { name: 'Total Visitors', value: stats.total.toString(), inline: true },
                { name: 'Current Month', value: stats.monthly[months[months.length - 1]].toString(), inline: true }
            )
            .setImage(chartUrl)
            .setTimestamp()
            .setFooter({ text: 'XLNT MONITORING SYSTEM' });

        message.reply({ embeds: [embed] });
    }

    // Command: /temp (List temp files)
    if (message.content.toLowerCase() === '/temp') {
        if (!fs.existsSync(uploadDir)) return message.reply('Staging directory not found.');

        const files = fs.readdirSync(uploadDir);
        if (files.length === 0) return message.reply('Staging zone is empty [0 files].');

        let totalSize = 0;
        let fileList = files.map(file => {
            const stats = fs.statSync(path.join(uploadDir, file));
            totalSize += stats.size;
            return `- \`${file}\` (${(stats.size / 1024 / 1024).toFixed(2)} MB)`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x007BFF)
            .setTitle('STAGING ZONE AUDIT')
            .setDescription(fileList.length > 2000 ? fileList.substring(0, 1900) + '...' : fileList)
            .addFields(
                { name: 'Total Files', value: files.length.toString(), inline: true },
                { name: 'Total Size', value: `${(totalSize / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }

    // Command: /clear (Purge temp files)
    if (message.content.toLowerCase() === '/clear') {
        if (!fs.existsSync(uploadDir)) return message.reply('Staging directory not found.');

        const files = fs.readdirSync(uploadDir);
        if (files.length === 0) return message.reply('Staging zone is already clean.');

        files.forEach(file => {
            fs.unlinkSync(path.join(uploadDir, file));
        });

        message.reply(`PURGE SUCCESSFUL: ${files.length} files removed from staging zone.`);
    }
});

// URL Clean Up Middleware (Redirect .html and index.html)
app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.endsWith('.html')) {
        let newPath = req.path;
        if (newPath.endsWith('/index.html')) {
            newPath = newPath.replace(/\/index\.html$/, '/');
        } else if (newPath === '/index.html') {
            newPath = '/';
        } else {
            newPath = newPath.replace(/\.html$/, '');
        }
        
        // Prevent redirect loop if the new path is same
        if (newPath !== req.path) {
            const query = req.url.slice(req.path.length); // get query string if any
            return res.redirect(301, newPath + query);
        }
    }
    
    // Also redirect bare /index
    if (req.method === 'GET' && (req.path.endsWith('/index') || req.path === '/index')) {
        const newPath = req.path.replace(/\/index$/, '/');
        const query = req.url.slice(req.path.length);
        return res.redirect(301, (newPath === '' ? '/' : newPath) + query);
    }
    
    next();
});

// Visitor Middleware
app.get('/', (req, res, next) => {
    const cookies = req.headers.cookie || '';
    const hasVisited = cookies.includes('xlnt_session=active');

    if (!hasVisited) {
        const stats = updateStats();
        updateChannelTopic(stats);

        client.channels.fetch(NOTIFY_CHANNEL_ID).then(channel => {
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle("NEW VISITOR DETECTED")
                    .setDescription(`A unique session just landed on the home page.\n\n**Total:** ${stats.total}\n**Month:** ${stats.currentMonth}`)
                    .setTimestamp();
                channel.send({ embeds: [embed] });
            }
        }).catch(err => console.error('[ERROR] Failed to send notification:', err.message));

        res.setHeader('Set-Cookie', 'xlnt_session=active; Path=/; HttpOnly; SameSite=Lax');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use(express.json());

// Real upload endpoint
app.post('/upload', submitLimiter, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    console.log(`[SYSTEM] File staged: ${req.file.filename}`);
    res.json({ success: true, filename: req.file.filename });
});

// Transmission endpoint
app.post('/transmit', submitLimiter, async (req, res) => {
    console.log('>>> [VERIFIED-LOG] Body Received:', req.body);
    const { filename, message, sender } = req.body;

    try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const autoLinks = message.match(urlRegex) || [];

        const content = autoLinks.length > 0 ? autoLinks.join('\n') : '';
        const payload = {
            content: content,
            embeds: [{
                color: 0x0000FF,
                author: { name: `FROM: ${sender.toUpperCase()}` },
                description: message,
                footer: { text: 'xlnt.my.id' },
                timestamp: new Date().toISOString()
            }]
        };

        if (filename) {
            const safeFilename = path.basename(filename);
            const filePath = path.join(uploadDir, safeFilename);
            if (!fs.existsSync(filePath)) {
                console.error(`[ERROR] File not found at ${filePath}`);
                return res.status(404).json({ error: 'File not found' });
            }

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(safeFilename);
            if (isImage) {
                payload.embeds[0].image = { url: `attachment://${safeFilename}` };
            }

            const form = new FormData();
            // Use 'files[0]' which is preferred by Discord for multipart payloads
            form.append('files[0]', fs.createReadStream(filePath), safeFilename);
            form.append('payload_json', JSON.stringify(payload));

            console.log(`[SYSTEM] Transmitting with Media: ${safeFilename} as files[0]`);
            
            await axios.post(DISCORD_WEBHOOK, form, { 
                headers: { 
                    ...form.getHeaders()
                } 
            });

            fs.unlinkSync(filePath);
            console.log(`[SUCCESS] Transmission complete: ${safeFilename}`);
        } else {
            await axios.post(DISCORD_WEBHOOK, payload);
            console.log(`[SUCCESS] Transmission: [Text Only]`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[SYSTEM] Transmission failed:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Transmission failed' });
    }
});

// --- Security: Auto-Cleanup Orphaned Files ---
setInterval(() => {
    if (!fs.existsSync(uploadDir)) return;
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    let cleaned = 0;
    files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 60 * 60 * 1000) { // Older than 1 hour
            fs.unlinkSync(filePath);
            cleaned++;
        }
    });
    if (cleaned > 0) console.log(`[SYSTEM] Auto-cleanup removed ${cleaned} orphaned file(s).`);
}, 60 * 60 * 1000); // Run every 1 hour

const IP = process.env.IP || '0.0.0.0';
app.listen(PORT, IP, () => {
    console.log(`[XLNT] Server running at http://${IP}:${PORT}`);
    console.log(`[SYSTEM] Active staging zone: ${uploadDir}`);
});
