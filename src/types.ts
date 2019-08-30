import { CObject } from './interfaces';

export type onmessage = (data: any) => any;

export type CanvasObject = fabric.Object & CObject;
