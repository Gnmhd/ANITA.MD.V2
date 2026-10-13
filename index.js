const http = require('http');
http.createServer((req,res)=>res.end('ANITA-MD-V2 ONLINE 👑')).listen(process.env.PORT || 3000);

const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

const CONFIG = { ownerNumber: "22896352213", ownerName: "QUEEN ANITA", botName: "ANITA-MD-V2", prefix: ".", sessionFolder: "session" }

// === GESTION SESSION ID ===
if (process.env.SESSION_ID) {
  if (!fs.existsSync(CONFIG.sessionFolder)) fs.mkdirSync(CONFIG.sessionFolder, {recursive:true});
  try {
    const decoded = Buffer.from(process.env.SESSION_ID, 'base64').toString();
    fs.writeFileSync(`${CONFIG.sessionFolder}/creds.json`, decoded);
    console.log("✅ SESSION_ID restaurée !");
  } catch(e){ console.log("SESSION_ID invalide:", e.message) }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionFolder)
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) },
    logger: P({level:'silent'}),
    browser: [CONFIG.botName,'Safari','1.0']
  })

  if (!sock.authState.creds.registered && !process.env.SESSION_ID) {
    const phone = process.env.PHONE_NUMBER || "22896352213"
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phone)
        console.log(`\n🔑 CODE D'APPARIAGE: ${code}\n`)
        console.log(`Après connexion, va dans Shell > tape: cat session/creds.json | base64`)
        console.log(`Copie le résultat = ce sera ton SESSION_ID`);
      } catch(e){ console.log("Erreur:", e.message) }
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log(`✅ ${CONFIG.botName} CONNECTE! Va récupérer ton SESSION_ID dans Shell !`)
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
  })

  sock.ev.on('messages.upsert', async ({messages}) => {
    const m = messages[0]; if (!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const from = m.key.remoteJid
    if (!text.startsWith(CONFIG.prefix)) return
    const cmd = text.slice(1).split(' ')[0].toLowerCase()
    if (cmd === 'menu') await sock.sendMessage(from, {text: `👑 *${CONFIG.botName}* 👑\n.menu - menu\n.ping - vitesse\n.owner - moi`})
    if (cmd === 'ping') await sock.sendMessage(from, {text: `Pong! ⚡️ ${CONFIG.botName} en ligne`})
    if (cmd === 'session') {
      if(fs.existsSync(`${CONFIG.sessionFolder}/creds.json`)){
        const b64 = Buffer.from(fs.readFileSync(`${CONFIG.sessionFolder}/creds.json`)).toString('base64');
        await sock.sendMessage(from, {text: `Voici ton SESSION_ID (copie pour Render):\n\n${b64}`})
      }
    }
  })
}
startBot()
