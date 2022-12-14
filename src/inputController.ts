import {
    Scene,
    ActionManager,
    ExecuteCodeAction,
    Scalar,
    PointerInfo, Vector3,
} from '@babylonjs/core';
import {Hud} from "./hud";
import {PointerEventTypes} from "@babylonjs/core/Events/pointerEvents";
import {Engine} from "@babylonjs/core/Engines/engine";

export class PlayerInput {

    public inputMap: any;
    private _scene: Scene;
    private _engine: Engine;

    //simple movement
    public horizontal: number = 0;
    public vertical: number = 0;
    //tracks whether or not there is movement in that axis
    public horizontalAxis: number = 0;
    public verticalAxis: number = 0;

    //jumping and dashing
    public jumpKeyDown: boolean = false;
    public dashDxn: number = 0;
    public dashing: boolean = false;

    //Mobile Input trackers
    public mobileLeft: boolean;
    public mobileRight: boolean;
    public mobileUp: boolean;
    public mobileDown: boolean;
    private _mobileJump: boolean;
    private _mobileDash: boolean;
    private _ui: Hud;
    private _isMouseMoving: boolean;
    private _isMousePosition: any;
    private _isMouseReference: any;
    private mouseSensitivity: number;
    private _allowCameraRotation: any;
    private _rotationTarget: any;
    public _isMouseApply: boolean;

    constructor(scene: Scene) {

        this._scene = scene;

        //scene action manager to detect inputs
        this._scene.actionManager = new ActionManager(this._scene);

        this.inputMap = {};
        this._scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            //only detect inputs if game isn't paused
            if (!this._ui.gamePaused) {
                this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
            } else {
                this.inputMap[evt.sourceEvent.key] = false;
            }
        }));
        this._scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            //only detect inputs if game isn't paused
            console.log(evt.sourceEvent.key);
            if (!this._ui.gamePaused) {
                this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
            } else {
                this.inputMap[evt.sourceEvent.key] = false;
            }
        }));

        //add to the scene an observable that calls updateFromKeyboard before rendering
        this._scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });

        this.mouseSensitivity = 800.0;

        this._scene.onPointerObservable.add((evt, state) =>{

            switch (evt.type) {
                case 4:
                    // Right Click move
                    this._mouseMove(evt, state);
                    break;
                case 1:
                    // Right Click down
                    this._mouseDown(evt, state);

                    break;
                case 2:
                    // Right Click up
                    this._mouseUp(evt, state);
                    break;
            }

        });

        this._ui = new Hud(scene);
        // Set up Mobile Controls if on mobile device
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this._setUpMobile();
        }
        this._engine = this._scene.getEngine();
        this._isMouseMoving = false;
        this._isMouseApply = false;

    }

    /**
     *
     * @param {PointerInfo} evt
     * @param {Event} state
     */
    _mouseUp(evt, state) {
        this._isMouseMoving = false;
        this._isMouseApply = false;
        this._isMouseReference = null;
        if(this._engine.isPointerLock) {
            this._engine.exitPointerlock();
        }
    }

    /**
     *
     * @param {PointerInfo} evt
     * @param {Event} state
     */
    _mouseDown(evt, state) {
        if(!this._engine.isPointerLock) {
            this._engine.enterPointerlock();
        }
        if(evt.event.button === 2) {
            this._isMouseApply = true;
        }
        this._isMouseMoving = true;
        this._isMouseReference = {
            x: evt.event.clientX,
            y: evt.event.clientY,
        };
    }

    /**
     *
     * @param {PointerInfo} evt
     * @param {Event} state
     */
    _mouseMove(evt, state) {

        if(this._isMouseMoving) {
            this._isMousePosition = evt.event;
            if (this._isMouseReference) {
                let offsetX;
                let offsetY;
                if(this._engine.isPointerLock) {
                    offsetX = evt.event.movementX;
                    offsetY = evt.event.movementY;
                } else {
                    offsetX = evt.event.clientX - this._isMouseReference.x;
                    offsetY = evt.event.clientY - this._isMouseReference.y;

                    this._isMouseReference = {
                        x: evt.event.clientX,
                        y: evt.event.clientY,
                    };
                }

                if (this._allowCameraRotation) {
                    this._rotationTarget.rotation.y += offsetX / this.mouseSensitivity;
                    this._rotationTarget.rotation.x += offsetY / this.mouseSensitivity;
                }
            }
        }
    }

    attachControl(camRoot) {
        this._allowCameraRotation = true;
        this._rotationTarget = camRoot;
    }

    // Keyboard controls & Mobile controls
    //handles what is done when keys are pressed or if on mobile, when buttons are pressed
    private _updateFromKeyboard(): void {

        //forward - backwards movement
        if ((this.inputMap["ArrowUp"] || this.mobileUp || this.inputMap["w"])) {
            this.verticalAxis = 1;
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);

        } else if ((this.inputMap["ArrowDown"] || this.mobileDown)) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this.verticalAxis = -1;
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        //left - right movement
        if ((this.inputMap["ArrowLeft"] || this.mobileLeft)) {
            //lerp will create a scalar linearly interpolated amt between start and end scalar
            //taking current horizontal and how long you hold, will go up to -1(all the way left)
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this.horizontalAxis = -1;

        } else if ((this.inputMap["ArrowRight"] || this.mobileRight)) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this.horizontalAxis = 1;
        }
        else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }

        //dash
        if ((this.inputMap["Shift"] || this._mobileDash)) {
            this.dashing = true;
        } else {
            this.dashing = false;
        }

        //Jump Checks (SPACE)
        if ((this.inputMap[" "] || this._mobileJump)) {
            this.jumpKeyDown = true;
        } else {
            this.jumpKeyDown = false;
        }
    }

    // Mobile controls
    private _setUpMobile(): void {
        //Jump Button
        this._ui.jumpBtn.onPointerDownObservable.add(() => {
            this._mobileJump = true;
        });
        this._ui.jumpBtn.onPointerUpObservable.add(() => {
            this._mobileJump = false;
        });

        //Dash Button
        this._ui.dashBtn.onPointerDownObservable.add(() => {
            this._mobileDash = true;
        });
        this._ui.dashBtn.onPointerUpObservable.add(() => {
            this._mobileDash = false;
        });

        //Arrow Keys
        this._ui.leftBtn.onPointerDownObservable.add(() => {
            this.mobileLeft = true;
        });
        this._ui.leftBtn.onPointerUpObservable.add(() => {
            this.mobileLeft = false;
        });

        this._ui.rightBtn.onPointerDownObservable.add(() => {
            this.mobileRight = true;
        });
        this._ui.rightBtn.onPointerUpObservable.add(() => {
            this.mobileRight = false;
        });

        this._ui.upBtn.onPointerDownObservable.add(() => {
            this.mobileUp = true;
        });
        this._ui.upBtn.onPointerUpObservable.add(() => {
            this.mobileUp = false;
        });

        this._ui.downBtn.onPointerDownObservable.add(() => {
            this.mobileDown = true;
        });
        this._ui.downBtn.onPointerUpObservable.add(() => {
            this.mobileDown = false;
        });
    }
}
