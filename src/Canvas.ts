import { fabric } from 'fabric';
import _ from 'lodash';

import { Connection } from './Connection';

import { DataChannel } from './interfaces';
import { generateId } from './helpers';

import { onmessage, CanvasObject, CanvasEvent } from './types';
import { UndoRedo } from './UndoRedo';

export class Canvas extends fabric.Canvas {
	private _connection: Connection;
	private _undoRedo: UndoRedo;

	constructor(
		id: string | HTMLCanvasElement,
		channel: DataChannel,
		master: boolean = false,
		onmessage: onmessage = (data: any): void => {}
	) {
		super(id);

		this._connection = new Connection(this, channel, master, onmessage);

		this._undoRedo = new UndoRedo(this, this._connection);

		this.addListeners();
	}

	/**
	 * Public methods
	 */

	public transformObj(obj: fabric.Object): fabric.Object {
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

	public refresh(): void {
		this.renderAll();
		this.calcOffset();
	}

	public removeSelected(): void {
		const activeObjs = this.getActiveObjects();
		this.remove(...activeObjs);

		this.discardActiveObject();

		this.refresh();
	}

	public getObjectById(id: number): CanvasObject {
		return this.getObjects().filter((obj: any) => obj.id === id)[0];
	}

	/**
	 * Private methods
	 */

	// object:moved

	// object:scaled

	// object:rotated

	// object:skewed
	private addListeners(): void {
		this.on({
			'object:added': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const targets = target._objects ? target._objects : [ target ];

				targets.forEach((obj: any) => {
					if (obj.id === undefined) obj.set('id', generateId());
				});

				this.connection.create(targets);
			},
			'object:removed': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const ids: number[] =
					target._objects !== undefined
						? <number[]>target._objects.map((obj: CanvasObject) => obj.id)
						: [ <number>target.id ];

				this.connection.remove(ids);
			},
			'object:moving': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const targets = target._objects ? target._objects.map(this.transformObj) : [ target ];

				this._connection.update(
					targets.map((obj: any) => {
						return {
							id: obj.id,
							top: obj.top,
							left: obj.left
						};
					})
				);
			},
			'object:scaling': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const targets = target._objects ? target._objects.map(this.transformObj) : [ target ];

				this._connection.update(
					targets.map((obj: any) => {
						return {
							id: obj.id,
							top: obj.top,
							left: obj.left,
							// translateX: obj.translateX,
							// translateY: obj.translateY,
							// zoomX: obj.zoomX,
							// zoomY: obj.zoomY,
							scaleX: obj.scaleX,
							scaleY: obj.scaleY
						};
					})
				);
			},
			'object:skewing': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const targets = target._objects ? target._objects : [ target ];

				this._connection.update(
					targets.map((obj: any) => {
						return {
							id: obj.id,
							top: obj.top,
							left: obj.left,
							// translateX: obj.translateX,
							// translateY: obj.translateY,
							// zoomX: obj.zoomX,
							// zoomY: obj.zoomY,
							scaleX: obj.scaleX,
							scaleY: obj.scaleY
						};
					})
				);
			},
			'object:rotating': (e: CanvasEvent): void => {
				if (e.target === undefined) return;

				const target = e.target;

				const targets = target._objects ? target._objects.map(this.transformObj) : [ target ];

				this._connection.update(
					targets.map((obj: any) => {
						return {
							id: obj.id,
							angle: obj.angle,
							translateX: obj.translateX,
							translateY: obj.translateY,
							top: obj.top,
							left: obj.left
						};
					})
				);
			}
		});
	}

	/**
 	 * Getters
	 */

	get connection(): Connection {
		return this._connection;
	}
	get undoRedo(): UndoRedo {
		return this._undoRedo;
	}

	/**
 	 * Setters
	 */
}
