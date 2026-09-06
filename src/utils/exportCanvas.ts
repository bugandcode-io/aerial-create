import type Konva from 'konva';
import type { DocumentMetadata } from '../types/document';
export function exportCanvas(stage: Konva.Stage, design: Pick<DocumentMetadata, 'width' | 'name'>) {
  const controls = stage.find('.selection-controls');
  const editingNodes = stage.find('.inline-editing-text');
  const visibility = [...controls, ...editingNodes].map((node) => ({ node, visible: node.visible() }));
  controls.forEach((control) => control.hide());
  editingNodes.forEach((node) => node.show());
  try {
    const url = stage.toDataURL({ x: 0, y: 0, width: stage.width(), height: stage.height(),
      pixelRatio: design.width / stage.width(), mimeType: 'image/png' });
    const link = document.createElement('a');
    link.download = `${design.name.replace(/[<>:"/\\|?*]/g, '_')}.png`;
    link.href = url; link.click();
  } finally {
    visibility.forEach(({ node, visible }) => node.visible(visible)); stage.batchDraw();
  }
}
