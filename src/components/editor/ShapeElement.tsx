import { Arrow, Ellipse, Line, Rect } from 'react-konva';
import type { ShapeElement as ShapeModel } from '../../types/editor';
export function ShapeElement({ element }: { element: ShapeModel }) {
  const { width, height, fill, stroke, strokeWidth } = element;
  const style = { fill, stroke, strokeWidth, strokeScaleEnabled: false };
  switch (element.type) {
    case 'rectangle': return <Rect width={width} height={height} {...style} />;
    case 'circle': return <Ellipse x={width / 2} y={height / 2} radiusX={width / 2} radiusY={height / 2} {...style} />;
    case 'triangle': return <Line points={[width / 2, 0, width, height, 0, height]} closed {...style} />;
    case 'line': return <Line points={[0, 0, width, 0]} stroke={stroke} strokeWidth={strokeWidth} strokeScaleEnabled={false} hitStrokeWidth={16} />;
    case 'arrow': return <Arrow points={[0, 0, width, 0]} {...style} fill={stroke}
      pointerLength={element.pointerLength} pointerWidth={element.pointerWidth} hitStrokeWidth={16} />;
  }
}
