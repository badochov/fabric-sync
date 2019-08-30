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
}

export interface CObject {
	id?: number;
	extra?: any;
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
