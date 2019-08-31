import { CObject } from './interfaces';
import { fabric } from 'fabric';

export type onmessage = (data: any) => any;

export type change = {
	type: string;
	objs: CanvasObject[];
};

export type CanvasEvent = {
	target?: CanvasObject;
	ids?: number[];
};

export type CanvasObject = fabric.Object & CObject;
