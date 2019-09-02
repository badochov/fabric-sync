import { CanvasObject } from './types';

export interface DataChannel {
	onmessage: ((...args: any) => any) | null;
	send: (...args: any) => void;
}

export interface TransferData {
	fabricSync?: FabricSyncData;
	data: any;
}

export interface FabricSyncData {
	canvasJSON?: any;
	init?: boolean;
	obj?: { data: any; type: string };
	modified?: { ids: number[]; prev: fabric.Object | undefined };
	undo?: boolean;
}

export interface CObject {
	id?: number;
	extra?: any;
	_objects?: CanvasObject[];
	_translateX?: number;
	_translateY?: number;
	ignore?: boolean;
}

export interface UpdateData {
	id: number;
	top?: number;
	left?: number;
	translateX?: number;
	translateY?: number;
	zoomX?: number;
	zoomY?: number;
	scaleX?: number;
	scaleY?: number;
}
