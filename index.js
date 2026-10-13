const http = require('http');
http.createServer((req,res)=>res.end('ANITA-MD-V2 ONLINE 👑')).listen(process.env.PORT || 3000);

const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

const CONFIG = { ownerNumber: "22896352213", botName: "ANITA-MD-V2", prefix: ".", sessionFolder: "session" }

if (!process.env.SESSION_ID) {
  console.log("❌ SESSION_ID MANQUANT! Ajoute SESSION_ID dans Environment");
  console.log("Pour l'avoir, déploie d'abord le générateur.");
} else {
  if (!fs.existsSync(CONFIG.sessionFolder)) fs.mkdirSync(CONFIG.sessionFolder, {recursive:true});
  const decoded = Buffer.from(process.env.SESSION_ID, 'base64').toString();
  fs.writeFileSync(`${CONFIG.sessionFolder}/creds.json`, decoded);
  console.log("✅ SESSION_ID OK!");
}

async function startBot() {
  if (!process.env.SESSION_ID) return;
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionFolder)
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) },
    logger: P({level:'silent'}),
    browser: [CONFIG.botName,'Safari','1.0']
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log(`✅ ${CONFIG.botName} CONNECTE AVEC SESSION_ID!`);
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot()
  })
  sock.ev.on('messages.upsert', async ({messages}) => {
    const m = messages[0]; if (!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const from = m.key.remoteJid
    if (!text.startsWith(CONFIG.prefix)) return
    const cmd = text.slice(1).split(' ')[0].toLowerCase()
    if (cmd === 'menu') await sock.sendMessage(from, {text: `👑 ${CONFIG.botName} 👑\n.menu\n.ping\n.owner`})
    if (cmd === 'ping') await sock.sendMessage(from, {text: `Pong! ⚡️`})
  })
}
startBot()
