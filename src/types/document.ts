import type { EditorElement } from './editor';
export interface AerialDocument {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  background: { type: 'solid'; color: string };
  elements: EditorElement[];
  createdAt: string;
  updatedAt: string;
}
export type DocumentMetadata = Omit<AerialDocument, 'elements'>;
