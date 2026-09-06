import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import type { EditorElement } from '../../types/editor';
export function SelectionTransformer({ element, stageRef, editing }: {
  element: EditorElement | undefined; stageRef: React.RefObject<Konva.Stage | null>; editing: boolean;
}) {
  const ref = useRef<Konva.Transformer>(null);
  const enabled = element && element.visible && !element.locked && !editing;
  useEffect(() => {
    const node = enabled ? stageRef.current?.findOne(`#${element.id}`) : undefined;
    ref.current?.nodes(node ? [node] : []);
  }, [element, enabled, stageRef]);
  const linear = element?.type === 'line' || element?.type === 'arrow';
  return <Transformer ref={ref} name="selection-controls" visible={Boolean(enabled)}
    flipEnabled={false} rotateEnabled borderStroke="#7757ee" anchorStroke="#7757ee"
    anchorFill="#fff" anchorSize={9} anchorCornerRadius={2} padding={5}
    enabledAnchors={linear ? ['middle-left', 'middle-right'] : undefined}
    boundBoxFunc={(oldBox, newBox) => newBox.width < 12 || (!linear && newBox.height < 12) ? oldBox : newBox} />;
}
