export const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const all = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function stickToBottom(container: HTMLElement, update: () => void) {
  const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  update();
  if (atBottom) container.scrollTop = container.scrollHeight;
}

export function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

export function showError(message: string) {
  byId('bannerText').textContent = message;
  byId('banner').hidden = false;
}

export function hideError() {
  byId('banner').hidden = true;
}

let toastTimer = 0;
export function toast(message: string) {
  const box = byId('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { box.hidden = true; }, 3500);
}
