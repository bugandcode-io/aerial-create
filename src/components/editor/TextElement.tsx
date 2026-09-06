import { Text } from 'react-konva';
import type { TextElement as TextModel } from '../../types/editor';
export function TextElement({ element }: { element: TextModel }) {
  return <Text text={element.text} width={element.width} fontFamily={element.fontFamily}
    fontSize={element.fontSize} fontStyle={element.fontStyle} fill={element.fill} align={element.align} />;
}
