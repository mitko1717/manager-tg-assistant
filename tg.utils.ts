export function codeText(text: string | number) {
  return "<code>" + text + "</code>";
}

export function boldText(text: string | number) {
  return "<b>" + text + "</b>";
}

export function italicText(text: string | number) {
  return "<i>" + text + "</i>";
}

export function linkText(url: string, text: string) {
  return `<a href='${url!}'><b>${text}</b></a>`;
}

export function underscoredText(text: string | number) {
  return "<u>" + text + "</u>";
}

export function shText(text: string | number) {
  return `<pre>${text}</pre>`;
}

export function extractArgumentFromCbData(key: string, cbData: string) {
  const regex = new RegExp(`[\?&]${key}=([^&]+)`);
  const match = regex.exec(cbData);
  const argument = match ? match[1] : undefined;

  return argument;
}

export function extractKeyFromCbData(cbData: string) {
  const regex = /\?([^&=]+)=/;
  const match = regex.exec(cbData);

  return match ? match[1] : undefined;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}