'use strict';
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const button = document.querySelector('#studio-mic');
const input = document.querySelector('[name="prompt"]');
const status = document.querySelector('#studio-voice-status');
if (Recognition && button && input && status) {
  button.hidden = false;
  button.addEventListener('click', () => {
    const speech = new Recognition();
    speech.lang = navigator.language || 'en';
    speech.onstart = () => { button.disabled = true; status.textContent = 'Listening…'; };
    speech.onresult = (event) => {
      input.value = (input.value.trim() + ' ' + event.results[0][0].transcript).trim().slice(0,input.maxLength);
      status.textContent = 'Dictation added. Review it before sending.';
      input.focus();
    };
    speech.onerror = () => { status.textContent = 'Microphone unavailable. You can type the request instead.'; };
    speech.onend = () => { button.disabled = false; };
    try { speech.start(); }
    catch { status.textContent = 'Microphone unavailable. You can type the request instead.'; }
  });
} else if (status) {
  status.textContent = 'Voice dictation is unavailable in this browser. You can type your request.';
}

const thread = document.querySelector('#studio-thread');
if (thread) thread.scrollTop = thread.scrollHeight;
