import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const WIN = process.platform === 'win32';

function stateDir() {
  if (WIN && process.env.APPDATA) {
    const d = path.join(process.env.APPDATA, 'MoltSOC');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }
  const d = path.join(process.cwd(), '.moltsoc');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function statePath() {
  return path.join(stateDir(), 'state.json');
}

function loadState() {
  try {
    const p = statePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data;
    }
  } catch (_) {}
  return {};
}

function saveState(data) {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(data, null, 0), 'utf8');
  } catch (_) {}
}

export function getOrCreateBotId(explicitBotId) {
  if (explicitBotId) return explicitBotId;
  const state = loadState();
  if (state.bot_id) return state.bot_id;
  const host = os.hostname();
  const uuid = crypto.randomUUID();
  const botId = `${host}-${uuid.slice(0, 8)}`;
  state.bot_id = botId;
  state.uuid = uuid;
  saveState(state);
  return botId;
}

export function getStatePath() {
  return statePath();
}
