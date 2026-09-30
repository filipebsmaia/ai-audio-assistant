
import { stopAudioCapture } from './audioCapture.js';
import { byId, showError } from './dom.js';
import { notify, onChange, state, type View } from './state.js';
import { initAskView } from './views/askView.js';
import { initCaptureControls } from './views/captureControls.js';
import { initHeader } from './views/header.js';
import { initSidebar } from './views/sidebar.js';
import { appendSegment, appendTranscriptDelta, initTranscribeView } from './views/transcribeView.js';
import { appendTranslation, initTranslateView } from './views/translateView.js';

const VIEWS: View[] = ['translate', 'transcribe', 'ask'];

window.api.onEvent((event) => {
  switch (event.kind) {
    case 'state':
      state.mode = event.mode;
      notify();
      break;
    case 'translation':
      appendTranslation(event.part, event.text);
      break;
    case 'transcript-delta':
      appendTranscriptDelta(event.text);
      break;
    case 'segment':
      appendSegment(event.segment);
      break;
    case 'error':
      stopAudioCapture();
      showError(event.message);
      break;
  }
});

initHeader();
initSidebar();
initCaptureControls();
initTranslateView();
initTranscribeView();
initAskView();
onChange(() => {
  for (const view of VIEWS) byId(`view-${view}`).hidden = view !== state.view;
});
notify();
