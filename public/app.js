import { stories } from './stories.js';

const el = (id) => document.getElementById(id);
const maximumQuestions = 3;
const audio = new Audio();
audio.autoplay = true;
const connections = new Map();
const heard = new Set();
let storyIndex = 0;
let selected = 0;
let used = 0;
let busy = false;
let recording;
let config;
let demo = true;
let modeChosen = false;

const story = () => stories[storyIndex];
const witness = () => story().people[selected];

function message(name, text) {
  const row = document.createElement('p');
  const label = document.createElement('strong');
  row.className = 'message';
  label.textContent = name;
  row.append(label, document.createTextNode(text));
  el('log').append(row);
  el('log').scrollTop = el('log').scrollHeight;
}

function render() {
  el('conversation-title').textContent = `Talk to ${witness().name}`;
  el('count').textContent = `${maximumQuestions - used} of ${maximumQuestions} questions left`;
  el('change').disabled = busy || Boolean(recording);
  el('mode').hidden = !config?.live;
  el('mode').disabled = busy || Boolean(recording);
  el('mode').textContent = demo ? 'Use live voice' : 'Use demo mode';
  el('ask').hidden = demo;
  el('ask').disabled = busy || (!recording && (!heard.has(selected) || used >= maximumQuestions));
  el('ask').textContent = recording ? 'Send question' : 'Start question';
  el('demo').hidden = !demo;
  for (const [index, card] of Array.from(el('people').children).entries()) {
    card.classList.toggle('selected', index === selected);
    const button = card.querySelector('button');
    button.textContent = heard.has(index) ? 'Listen again' : 'Listen to ' + story().people[index].name;
    button.disabled = busy || Boolean(recording);
  }
  for (const button of el('demo-questions').children) {
    button.disabled = busy || !heard.has(selected) || used >= maximumQuestions;
  }
}

function showStory() {
  el('title').textContent = story().title;
  el('place').textContent = story().place;
  el('intro').textContent = story().intro;
  el('log').replaceChildren();
  el('notes').value = '';
  el('people').replaceChildren();
  story().people.forEach((person, index) => {
    const card = document.createElement('article');
    card.className = 'person';
    card.innerHTML = '<div class="person-head"><span class="avatar" aria-hidden="true"></span><div><h2></h2><p></p></div></div><button type="button" class="outline"></button>';
    card.querySelector('.avatar').textContent = person.name[0];
    card.querySelector('h2').textContent = person.name;
    card.querySelector('p').textContent = person.role;
    card.querySelector('button').addEventListener('click', () => listen(index));
    el('people').append(card);
  });
  el('status').textContent = demo ? 'Demo mode. Choose a person to hear their story.' : 'Choose a person to hear their story.';
  render();
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.lang = 'en-US';
  line.rate = 0.85;
  window.speechSynthesis.speak(line);
}

function closeConnections() {
  for (const connection of connections.values()) connection.pc.close();
  connections.clear();
  audio.srcObject = null;
  window.speechSynthesis?.cancel();
}

function exchange(dc, event, receive, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => fail('The voice service took too long. Please try again.'), timeout);
    function cleanup() {
      clearTimeout(timer);
      dc.removeEventListener('message', onMessage);
      dc.removeEventListener('close', onClose);
    }
    function fail(text) {
      cleanup();
      reject(new Error(text));
    }
    function onClose() { fail('Voice disconnected. Please try again.'); }
    function onMessage({ data }) {
      const reply = JSON.parse(data);
      if (reply.type === 'error') return fail(reply.error?.message || 'Voice could not answer.');
      const result = receive(reply);
      if (result !== undefined) {
        cleanup();
        resolve(result);
      }
    }
    dc.addEventListener('message', onMessage);
    dc.addEventListener('close', onClose);
    try {
      dc.send(JSON.stringify(event));
    } catch {
      onClose();
    }
  });
}

async function connect() {
  const previous = connections.get(selected);
  if (previous?.dc.readyState === 'open' && previous.pc.connectionState === 'connected') {
    audio.srcObject = previous.stream;
    return previous;
  }
  previous?.pc.close();
  const pc = new RTCPeerConnection();
  const sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
  const dc = pc.createDataChannel('oai-events');
  const stream = new MediaStream();
  const connection = { pc, sender, dc, stream };
  connections.set(selected, connection);
  pc.ontrack = ({ track }) => {
    stream.addTrack(track);
    if (connections.get(selected) === connection) audio.srcObject = stream;
  };
  try {
    await pc.setLocalDescription(await pc.createOffer());
    const response = await fetch(`./api/session?story=${story().id}&person=${selected}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription.sdp,
      signal: AbortSignal.timeout(20000),
    });
    const sdp = await response.text();
    if (!response.ok) throw new Error(sdp.startsWith('<') ? 'Live voice is unavailable.' : sdp);
    await pc.setRemoteDescription({ type: 'answer', sdp });
    if (dc.readyState !== 'open') {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Voice could not connect. Please try again.')), 10000);
        dc.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
    audio.srcObject = stream;
    return connection;
  } catch (error) {
    pc.close();
    connections.delete(selected);
    throw error;
  }
}

async function respond(connection, instructions) {
  const response = { output_modalities: ['audio'] };
  if (instructions) response.instructions = instructions;
  let transcript = '';
  let finished = false;
  let audioStopped = false;
  audio.play().catch(() => {});
  const completed = await exchange(connection.dc, { type: 'response.create', response }, (event) => {
    if (event.type === 'response.output_audio_transcript.done') transcript += event.transcript;
    if (event.type === 'output_audio_buffer.stopped') audioStopped = true;
    if (event.type === 'response.done') {
      if (event.response.status !== 'completed') return { ok: false };
      finished = true;
    }
    if (finished && audioStopped) return { ok: true, transcript };
  });
  if (!completed.ok) throw new Error('The witness could not finish. Please try again.');
  return completed.transcript;
}

async function perform(status, task) {
  busy = true;
  el('status').textContent = status;
  render();
  try {
    await task();
  } catch (error) {
    closeConnections();
    el('status').textContent = error.name === 'NotAllowedError'
      ? 'Allow microphone access in your browser to ask a question.' : error.message;
  } finally {
    busy = false;
    render();
  }
}

async function listen(index) {
  selected = index;
  const person = witness();
  await perform(`Getting ${person.name}’s story…`, async () => {
    const text = demo ? person.opening : await respond(await connect(),
      `You are ${person.name}. Read this statement aloud slowly, exactly as written: ${person.opening}`);
    if (demo) speak(text);
    message(person.name, text || person.opening);
    heard.add(index);
    el('status').textContent = used < maximumQuestions
      ? `Ask ${person.name} a question or listen to the other person.`
      : 'Use details from both people to tell what you think happened.';
  });
}

async function startQuestion() {
  await perform('Getting the microphone ready…', async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open this activity on HTTPS or localhost to use your microphone.');
    const connection = await connect();
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
    const track = mic.getAudioTracks()[0];
    try {
      await exchange(connection.dc, { type: 'input_audio_buffer.clear' },
        (event) => event.type === 'input_audio_buffer.cleared' ? true : undefined);
      await connection.sender.replaceTrack(track);
    } catch (error) {
      track.stop();
      throw error;
    }
    recording = { connection, track, timer: setTimeout(sendQuestion, 20000) };
    el('status').textContent = 'Speak now. Ask one question, then choose Send question.';
  });
}

async function sendQuestion() {
  if (!recording || busy) return;
  const { connection, track, timer } = recording;
  clearTimeout(timer);
  recording = undefined;
  track.stop();
  await perform(`${witness().name} is listening…`, async () => {
    await connection.sender.replaceTrack(null);
    await exchange(connection.dc, { type: 'input_audio_buffer.commit' },
      (event) => event.type === 'input_audio_buffer.committed' ? true : undefined);
    const answer = await respond(connection);
    used++;
    message(witness().name, answer || 'The witness answered by voice.');
    afterQuestion();
  });
}

function afterQuestion() {
  el('status').textContent = used === maximumQuestions
    ? 'You asked all three questions. Tell what you think happened.'
    : 'Ask another question or talk to the other person.';
  render();
}

const sampleQuestions = ['Where were you?', 'Why do you think it happened?', 'What else did you see?'];
sampleQuestions.forEach((question, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'outline';
  button.textContent = question;
  button.addEventListener('click', () => {
    const person = witness();
    const sentences = person.opening.match(/[^.!?]+[.!?]/g).map((sentence) => sentence.trim());
    const answer = [sentences[0], sentences.at(-1), person.details.split('. ')[0].replace(/\.$/, '') + '.'][index];
    message('You', question);
    message(person.name, answer);
    speak(answer);
    used++;
    afterQuestion();
  });
  el('demo-questions').append(button);
});

el('ask').addEventListener('click', () => recording ? sendQuestion() : startQuestion());
el('mode').addEventListener('click', () => {
  modeChosen = true;
  demo = !demo;
  closeConnections();
  el('status').textContent = demo ? 'Demo mode. Choose a sample question.' : 'Live voice. Choose Start question when you are ready.';
  render();
});
el('change').addEventListener('click', () => {
  closeConnections();
  storyIndex = (storyIndex + 1) % stories.length;
  selected = 0;
  used = 0;
  heard.clear();
  showStory();
});
window.addEventListener('pagehide', () => {
  recording?.track.stop();
  closeConnections();
});

showStory();
fetch('./api/config', { signal: AbortSignal.timeout(5000) })
  .then((response) => response.ok ? response.json() : null)
  .then((value) => {
    config = value;
    if (config?.live && !heard.size && !modeChosen) {
      demo = false;
      el('status').textContent = 'Choose a person to hear their story.';
    }
    render();
  })
  .catch(() => {});
