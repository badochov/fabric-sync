import { CObject } from './interfaces';
import { fabric } from 'fabric';

export type onmessage = (data: any) => any;

export type change = {
	type: string;
	objs: CanvasObject[];
	prev?: fabric.Object | undefined;
};

export type CanvasEvent = fabric.IEvent & {
	target?: CanvasObject;
	ids?: number[];
	prev?: fabric.Object;
};

export type CanvasObject = fabric.Object & CObject;
