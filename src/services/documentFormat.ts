import type { AerialDocument } from '../types/document';

export function createDocument(): AerialDocument {
  const now = new Date().toISOString();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
    : `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  return { version: 1, id, name: 'Untitled Design', width: 1080, height: 1080,
    background: { type: 'solid', color: '#ffffff' }, elements: [], createdAt: now, updatedAt: now };
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const color = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid Aerial document: ${message}`);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  requireValid(Object.keys(value).every((key) => allowed.includes(key)), 'unexpected fields');
}
function validateV1(value: unknown): AerialDocument {
  requireValid(record(value), 'expected an object');
  keys(value, ['version','id','name','width','height','background','elements','createdAt','updatedAt']);
  requireValid(value.version === 1, 'unsupported version');
  requireValid(string(value.id, 200) && string(value.name, 200) && Boolean(value.name.trim()), 'id/name');
  requireValid(number(value.width, 1, 8192) && Number.isInteger(value.width) && number(value.height, 1, 8192) && Number.isInteger(value.height), 'dimensions must be integer pixels from 1 to 8192');
  requireValid(record(value.background) && value.background.type === 'solid' && color(value.background.color), 'background');
  keys(value.background, ['type','color']);
  requireValid(timestamp(value.createdAt) && timestamp(value.updatedAt), 'timestamps');
  requireValid(Array.isArray(value.elements) && value.elements.length <= 5000, 'elements');
  const ids = new Set<string>();
  for (const element of value.elements) {
    requireValid(record(element), 'element must be an object');
    requireValid(string(element.id, 200) && !ids.has(element.id), 'missing/duplicate element ID');
    ids.add(element.id);
    requireValid(string(element.name, 200) && typeof element.locked === 'boolean' && typeof element.visible === 'boolean', 'element name/flags');
    requireValid(number(element.x, -1e7, 1e7) && number(element.y, -1e7, 1e7) && number(element.rotation, -1e7, 1e7), 'element position/rotation');
    requireValid(number(element.scaleX, 0.000001, 1e6) && number(element.scaleY, 0.000001, 1e6) && number(element.opacity, 0, 1), 'element scale/opacity');
    requireValid(number(element.width, 0.000001, 1e7) && color(element.fill), 'element width/fill');
    const common = ['id','type','name','locked','visible','x','y','rotation','scaleX','scaleY','opacity','width','fill'];
    if (element.type === 'text') {
      keys(element, [...common,'text','fontSize','fontFamily','fontStyle','align']);
      requireValid(typeof element.text === 'string' && element.text.length <= 100000 && number(element.fontSize, 1, 1000) && string(element.fontFamily, 200), 'text/font');
      requireValid(typeof element.fontStyle === 'string' && ['normal','bold','italic','bold italic'].includes(element.fontStyle) && typeof element.align === 'string' && ['left','center','right'].includes(element.align), 'text style/alignment');
    } else {
      requireValid(typeof element.type === 'string' && ['rectangle','circle','line','triangle','arrow'].includes(element.type), 'unknown element type');
      keys(element, [...common,'height','stroke','strokeWidth', ...(element.type === 'arrow' ? ['pointerLength','pointerWidth'] : [])]);
      const linear = element.type === 'line' || element.type === 'arrow';
      requireValid(number(element.height, linear ? 0 : 0.000001, 1e7) && (!linear || element.height === 0), 'shape height');
      requireValid(color(element.stroke) && number(element.strokeWidth, 0, 200), 'shape stroke');
      if (element.type === 'arrow') requireValid(number(element.pointerLength, 1, 200) && number(element.pointerWidth, 1, 200), 'arrowhead');
    }
  }
  // All fields and discriminants are checked above; clone to avoid mutable caller aliases.
  return structuredClone(value) as unknown as AerialDocument;
}
export function deserializeDocument(json: string): AerialDocument {
  if (json.length > 10_000_000) throw new Error('Document exceeds the 10 MB import limit.');
  const value: unknown = JSON.parse(json);
  requireValid(record(value), 'expected an object');
  // Future version readers/migrations belong here; unknown versions are never guessed.
  switch (value.version) {
    case 1: return validateV1(value);
    default: throw new Error(`Unsupported Aerial document version: ${String(value.version)}`);
  }
}
export function serializeDocument(document: AerialDocument): string {
  // Explicit projection prevents editor UI state from entering a saved document.
  const { version, id, name, width, height, background, elements, createdAt, updatedAt } = document;
  return JSON.stringify(validateV1({ version, id, name, width, height, background, elements, createdAt, updatedAt }), null, 2);
}

