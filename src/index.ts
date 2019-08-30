import { DataChannel, TransferData, FabricSyncData } from './interfaces';
import { cryptoObj, dec2hex, generateId } from './helpers';

import _ from 'lodash';
import { fabric } from 'fabric';

export default class FabricSync {
	private idsToSupress: Array<number> = [];

	constructor(private _fabric: fabric.Canvas, private channel: DataChannel, private _master: boolean = false) {
		channel.onmessage = this.receive.bind(this);

		if (!_master) {
			this.sendFabricData({
				init: true
			});
		}

		this.addFabricListeners();
	}

	private sendFabricData(data: FabricSyncData) {
		this.channel.send(JSON.stringify({ fabricSync: data }));
	}

	public send(data: any): void {
		this.channel.send(JSON.stringify({ data: data }));
	}

	public receive(event: MessageEvent): any {
		const data: TransferData = JSON.parse(event.data);

		if (data.fabricSync) {
			this.parseFabricData(data.fabricSync);
		} else {
			return data.data;
		}
	}

	private parseFabricData(data: FabricSyncData): void {
		if (data.init === true) {
			this.sendFabricData({
				canvasJSON: this.serialize()
			});
		}
		if (data.canvasJSON) {
			this._fabric.loadFromJSON(data.canvasJSON, () => {
				this.refresh();
			});
		}
		if (data.obj) {
			const dataObj = data.obj;

			if (dataObj.type === 'remove') {
				const instances = [];
				for (const id of dataObj.data) {
					this.idsToSupress.push(id);
					const instance = this.getObjectById(id);

					instances.push(instance);
				}
				this.deleteObjs(instances);
			} else {
				fabric.util.enlivenObjects(
					dataObj,
					(objects: any) => {
						objects.forEach((obj: any) => {
							const instance = this.getObjectById(obj.id);
							if (instance === undefined) {
								this.idsToSupress.push(obj.id);
								this._fabric.add(obj);
							} else {
								instance.set(obj);
								instance.set({ left: obj.left });
								instance.set({ top: obj.top });

								instance.calcCoords();
							}
						});
					},
					'fabric'
				);
			}

			this.refresh();
		}
	}

	get master(): boolean {
		return this._master;
	}

	set master(val: boolean) {
		this._master = val;
	}

	get fabric(): fabric.Canvas {
		return this._fabric;
	}

	private addFabricListeners(): void {
		this._fabric.on('object:added', (e: any) => {
			const target = e.target;

			const targets = target._objects ? target._objects.map(this.transformObj) : [ target ];

			targets.forEach((obj: any) => {
				if (obj.id === undefined) obj.set('id', generateId());
			});

			this.syncObjs(targets);
		});
		this._fabric.on('object:removed', (e: any) => {
			const target = e.target;

			const ids = target._objects ? target._objects.map((obj: any) => obj.id) : [ target.id ];

			this.remove(ids);
		});

		// object:modified

		// object:moving

		// object:scaling

		// object:rotating

		// object:skewing

		// object:moved

		// object:scaled

		// object:rotated

		// object:skewed
	}

	private transformObj(obj: fabric.Object): fabric.Object {
		const temp = _.cloneDeep(obj);

		const matrix = temp.calcTransformMatrix();
		const options = fabric.util.qrDecompose(matrix);
		const center = new fabric.Point(options.translateX, options.translateY);

		temp.flipX = false;
		temp.flipY = false;
		temp.set('scaleX', options.scaleX);
		temp.set('scaleY', options.scaleY);
		temp.skewX = options.skewX;
		temp.skewY = options.skewY;
		temp.angle = options.angle;
		temp.setPositionByOrigin(center, 'center', 'center');

		return temp;
	}

	private refresh(): any {
		this._fabric.renderAll();
		this._fabric.calcOffset();
	}

	private remove(ids: Array<number>) {
		const data: Array<number> = [];
		ids.forEach((id: number) => {
			const index = this.idsToSupress.indexOf(id);
			if (index !== -1) {
				this.idsToSupress.splice(index, 1);
				return;
			}
			data.push(id);
		});
		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: 'remove' } });
	}

	private serialize(): string {
		const obj = this._fabric.toObject();
		for (const [ key, value ] of Object.entries(this._fabric._objects)) {
			const curr = obj.objects[key];
			//@ts-ignore
			curr.id = value.id;
			//@ts-ignore
			curr.extra = value.extra;
		}

		return JSON.stringify(obj);
	}

	private getObjectById(id: number): any {
		return this._fabric.getObjects().map((obj: any) => obj.id === id)[0];
	}

	private getData(obj: any): any {
		const index = this.idsToSupress.indexOf(obj.id);
		if (index !== -1) {
			this.idsToSupress.splice(index, 1);
			return null;
		}
		const data = Object.assign(obj.toObject(), { id: obj.id, extra: obj.extra });
		// const data = obj.toObject(['id', 'extra']);

		return data;
	}

	private syncObjs(objs: any): any {
		const data = [];
		for (const obj of objs) {
			const temp = this.getData(obj);
			if (temp !== null) data.push(temp);
		}

		if (data === []) return false;

		this.sendFabricData({ obj: data });
	}
	private deleteObjs(objs: any): any {
		objs.forEach((obj: any) => {
			this._fabric.remove(obj);
		});
	}
}

// function deleteSelectedObjs() {
// 	const activeObjs = canvas.getActiveObjects();
// 	deleteObjs(activeObjs);

// 	canvas.discardActiveObject().renderAll();
// }
