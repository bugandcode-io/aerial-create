export const CANVAS_SIZE = 1080;
export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'triangle' | 'arrow';
export type ElementKind = 'text' | ShapeKind;
export interface BaseElement {
  id: string; type: ElementKind; name: string; locked: boolean; visible: boolean;
  x: number; y: number; rotation: number; scaleX: number; scaleY: number; opacity: number;
}
export interface TextElement extends BaseElement {
  type: 'text'; text: string; width: number; fontSize: number;
  fontFamily: string; fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  fill: string; align: 'left' | 'center' | 'right';
}
interface ShapeBase extends BaseElement {
  width: number; height: number; fill: string; stroke: string; strokeWidth: number;
}
export interface RectangleElement extends ShapeBase { type: 'rectangle' }
export interface CircleElement extends ShapeBase { type: 'circle' }
export interface LineElement extends ShapeBase { type: 'line' }
export interface TriangleElement extends ShapeBase { type: 'triangle' }
export interface ArrowElement extends ShapeBase { type: 'arrow'; pointerLength: number; pointerWidth: number }
export type ShapeElement = RectangleElement | CircleElement | LineElement | TriangleElement | ArrowElement;
export type EditorElement = TextElement | ShapeElement;
export type TextPreset = 'heading' | 'subheading' | 'body';
export type TextPatch = Partial<Omit<TextElement, 'id' | 'type' | 'locked' | 'visible'>>;
export type ShapePatch = Partial<Pick<ShapeBase, 'width' | 'height' | 'fill' | 'stroke' | 'strokeWidth'>>;
export type TransformPatch = Partial<Pick<BaseElement, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY' | 'opacity'>>;
export type OrderAction = 'forward' | 'backward' | 'front' | 'back';
