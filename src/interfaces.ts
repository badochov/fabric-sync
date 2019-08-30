export interface DataChannel {
	onmessage: ((...args: any) => any) | null;
	send: (...args: any) => void;
}

export interface TransferData {
	fabricSync?: FabricSyncData;
	data: any;
}

export interface FabricSyncData {
	canvasJSON?: string;
	init?: boolean;
	obj?: any;
}
